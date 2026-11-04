const { Op } = require('sequelize');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sequelize = require('../../config/database');
const Expositor = require('../models/expositor.model');
const Stand = require('../models/stand.model');
const UbicacionStand = require('../models/ubicacionStand.model');

const expositorCtrl = {};


const UPLOADS_DIR = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(__dirname, '../../uploads');

function serializarExpositor(expositor) {
    if (!expositor) return null;

    const dto = expositor.toJSON ? expositor.toJSON() : expositor;

    return {
        id: dto.id,
        name: dto.name,
        stand: dto.stand ?? null,
        category: dto.category,
        subtitle: dto.subtitle ?? null,
        description: dto.description ?? null,
        origin: dto.origin ?? null,
        email: dto.email ?? null,
        logo: dto.logo ?? null,
        stands: dto.stands ?? null,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt
    };
}

function normalizarLogo(logo) {
    if (logo === null || logo === undefined) return null;

    if (typeof logo !== 'string') return undefined;

    const limpio = logo.trim();
    if (!limpio) return null;
    if (!/^\/uploads\/[A-Za-z0-9._-]+$/.test(limpio)) return undefined;

    return limpio;
}


function eliminarArchivoLogo(urlLogo) {
    if (typeof urlLogo !== 'string') return;

    const match = urlLogo.match(/^\/uploads\/(logo-[A-Za-z0-9-]+\.webp)$/);
    if (!match) return;

    const filePath = path.join(UPLOADS_DIR, match[1]);

    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (unlinkErr) {
            console.warn('Aviso: no se pudo borrar el logo físico anterior:', unlinkErr.message);
        }
    }
}


expositorCtrl.obtenerExpositores = async (req, res) => {
    try {
        const pagina = parseInt(req.query.page, 10) || 1;
        const tamanoPagina = parseInt(req.query.pageSize, 10) || 6;
        const { category, search } = req.query;

        const where = {};
        if (category && category !== 'all') where.category = category;
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { stand: { [Op.iLike]: `%${search}%` } },
                { subtitle: { [Op.iLike]: `%${search}%` } },
            ];
        }

        const { count, rows } = await Expositor.findAndCountAll({
            where,
            include: [
                {
                    model: Stand,
                    as: 'stands',
                    attributes: ['id', 'sector', 'superficie', 'estado']
                }
            ],
            limit: tamanoPagina,
            offset: (pagina - 1) * tamanoPagina,
            order: [['name', 'ASC']],
            distinct: true
        });

        const total = count;
        const hasMore = pagina * tamanoPagina < total;

        res.status(200).json({
            success: true,
            data: {
                items: rows.map(serializarExpositor),
                total,
                hasMore,
                page: pagina
            },
            message: 'Expositores obtenidos con éxito'
        });
    } catch (error) {
        console.error('Error al obtener expositores:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al obtener los expositores.' });
    }
};


expositorCtrl.obtenerExpositorPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const expositor = await Expositor.findByPk(id, {
            include: [
                {
                    model: Stand,
                    as: 'stands',
                    include: [{ model: UbicacionStand, as: 'ubicacion' }]
                }
            ]
        });

        if (!expositor) {
            return res.status(404).json({ success: false, data: null, message: 'Expositor no encontrado.' });
        }

        res.status(200).json({ success: true, data: serializarExpositor(expositor), message: 'Expositor obtenido con éxito' });
    } catch (error) {
        console.error('Error al obtener expositor:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al obtener el expositor.' });
    }
};


function parseStandIds(standIds, standString) {
    if (Array.isArray(standIds)) {
        return standIds.map(s => String(s).trim()).filter(Boolean);
    }
    if (typeof standString === 'string' && standString.trim().length > 0) {
        return standString.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

expositorCtrl.crearExpositor = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, category, subtitle, description, origin, email, standIds, stand } = req.body;

        if (!name || !category) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                data: null,
                message: 'Faltan campos obligatorios (name, category).'
            });
        }

        const logo = normalizarLogo(req.body.logo);
        if (logo === undefined) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                data: null,
                message: 'El campo logo solo admite la ruta de una imagen subida (/uploads/...webp) o null.'
            });
        }

        const requestedStandIds = parseStandIds(standIds, stand);

        if (requestedStandIds.length > 0) {
            const standsEncontrados = await Stand.findAll({
                where: { id: requestedStandIds },
                transaction: t
            });

            if (standsEncontrados.length !== requestedStandIds.length) {
                const encontradosIds = standsEncontrados.map(s => s.id);
                const faltantes = requestedStandIds.filter(id => !encontradosIds.includes(id));
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    data: null,
                    message: `Los siguientes stands no existen en el sistema: ${faltantes.join(', ')}.`
                });
            }

            for (const std of standsEncontrados) {
                if (std.estado === 'cedido') {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        data: null,
                        message: `El stand '${std.id}' se encuentra cedido institucionalmente y no puede reservarse.`
                    });
                }
                if (std.estado !== 'disponible' || std.expositorId) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        data: null,
                        message: `El stand '${std.id}' no está disponible (estado actual: ${std.estado}).`
                    });
                }
            }
        }

        const standCadena = requestedStandIds.length > 0
            ? requestedStandIds.slice().sort().join(', ')
            : (stand || null);

        const expositor = await Expositor.create({
            id: crypto.randomUUID(),
            name,
            stand: standCadena,
            category,
            subtitle: subtitle ?? null,
            description: description ?? null,
            origin: origin ?? null,
            email: email ?? null,
            logo
        }, { transaction: t });

        if (requestedStandIds.length > 0) {
            await Stand.update({
                estado: 'reservado',
                expositorId: expositor.id
            }, {
                where: { id: requestedStandIds },
                transaction: t
            });
        }

        await t.commit();

        const expositorCreado = await Expositor.findByPk(expositor.id, {
            include: [{ model: Stand, as: 'stands' }]
        });

        res.status(201).json({
            success: true,
            data: serializarExpositor(expositorCreado),
            message: 'Expositor creado con éxito'
        });
    } catch (error) {
        await t.rollback();
        console.error('Error al crear expositor:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al crear el expositor.'
        });
    }
};

expositorCtrl.actualizarExpositor = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const expositor = await Expositor.findByPk(id, { transaction: t });

        if (!expositor) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                data: null,
                message: 'Expositor no encontrado.'
            });
        }

        const standsActuales = await Stand.findAll({
            where: { expositorId: id },
            transaction: t
        });
        const currentStandIds = standsActuales.map(s => s.id);

        const hasStandIdsParam = req.body.standIds !== undefined || req.body.stand !== undefined;
        let finalStandIds = currentStandIds;

        if (hasStandIdsParam) {
            const requestedStandIds = parseStandIds(req.body.standIds, req.body.stand);

            const toRelease = currentStandIds.filter(sid => !requestedStandIds.includes(sid));
            const toAssign = requestedStandIds.filter(sid => !currentStandIds.includes(sid));

            if (toAssign.length > 0) {
                const standsNuevos = await Stand.findAll({
                    where: { id: toAssign },
                    transaction: t
                });

                if (standsNuevos.length !== toAssign.length) {
                    const encontrados = standsNuevos.map(s => s.id);
                    const faltantes = toAssign.filter(sid => !encontrados.includes(sid));
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        data: null,
                        message: `Los siguientes stands a asignar no existen: ${faltantes.join(', ')}.`
                    });
                }

                for (const std of standsNuevos) {
                    if (std.estado === 'cedido') {
                        await t.rollback();
                        return res.status(400).json({
                            success: false,
                            data: null,
                            message: `El stand '${std.id}' se encuentra cedido institucionalmente y no puede reservarse.`
                        });
                    }
                    if (std.estado !== 'disponible' || (std.expositorId && std.expositorId !== id)) {
                        await t.rollback();
                        return res.status(400).json({
                            success: false,
                            data: null,
                            message: `El stand '${std.id}' no está disponible para reserva (estado: ${std.estado}).`
                        });
                    }
                }

                await Stand.update({
                    estado: 'reservado',
                    expositorId: id
                }, {
                    where: { id: toAssign },
                    transaction: t
                });
            }

            if (toRelease.length > 0) {
                await Stand.update({
                    estado: 'disponible',
                    expositorId: null
                }, {
                    where: { id: toRelease },
                    transaction: t
                });
            }

            finalStandIds = requestedStandIds.slice().sort();
            req.body.stand = finalStandIds.length > 0 ? finalStandIds.join(', ') : null;
        }

        const updateData = { ...req.body };
        delete updateData.standIds;
        delete updateData.id;

        let logoAnterior = null;
        if (updateData.logo !== undefined) {
            const logo = normalizarLogo(updateData.logo);

            if (logo === undefined) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    data: null,
                    message: 'El campo logo solo admite la ruta de una imagen subida (/uploads/...webp) o null.'
                });
            }

            logoAnterior = expositor.logo;
            updateData.logo = logo;
        }

        await expositor.update(updateData, { transaction: t });

        await t.commit();

        if (logoAnterior && logoAnterior !== updateData.logo) {
            eliminarArchivoLogo(logoAnterior);
        }

        const expositorActualizado = await Expositor.findByPk(id, {
            include: [{ model: Stand, as: 'stands' }]
        });

        res.status(200).json({
            success: true,
            data: serializarExpositor(expositorActualizado),
            message: 'Expositor actualizado con éxito'
        });
    } catch (error) {
        await t.rollback();
        console.error('Error al actualizar expositor:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al actualizar el expositor.'
        });
    }
};

expositorCtrl.subirLogo = async (req, res) => {
    if (!req.processedFile) {
        return res.status(400).json({
            success: false,
            data: null,
            message: 'No se encontraron datos de la imagen procesada.'
        });
    }

    const { id } = req.params;
    const { url, filename, sizeBytes, width, height } = req.processedFile;

    if (!id) {
        return res.status(201).json({
            success: true,
            data: { url, filename, size: sizeBytes, width, height, format: 'webp' },
            message: 'Logo convertido a WebP exitosamente'
        });
    }

    try {
        const expositor = await Expositor.findByPk(id);

        if (!expositor) {
            try {
                fs.unlinkSync(req.processedFile.path);
            } catch (unlinkErr) {
                console.warn('Aviso: no se pudo borrar el logo huérfano:', unlinkErr.message);
            }

            return res.status(404).json({ success: false, data: null, message: 'Expositor no encontrado.' });
        }

        const logoAnterior = expositor.logo;
        await expositor.update({ logo: url });

        if (logoAnterior && logoAnterior !== url) {
            eliminarArchivoLogo(logoAnterior);
        }

        const expositorActualizado = await Expositor.findByPk(id, {
            include: [{ model: Stand, as: 'stands' }]
        });

        return res.status(200).json({
            success: true,
            data: serializarExpositor(expositorActualizado),
            message: 'Logo del expositor actualizado con éxito'
        });
    } catch (error) {
        console.error('Error al guardar el logo del expositor:', error);

        try {
            fs.unlinkSync(req.processedFile.path);
        } catch (unlinkErr) {
            console.warn('Aviso: no se pudo borrar el logo huérfano:', unlinkErr.message);
        }

        return res.status(500).json({
            success: false,
            data: null,
            message: 'Error al registrar el logo del expositor.'
        });
    }
};

expositorCtrl.eliminarExpositor = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const expositor = await Expositor.findByPk(id, { transaction: t });

        if (!expositor) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                data: null,
                message: 'Expositor no encontrado.'
            });
        }

        // Desvincular stands antes de eliminar
        await Stand.update({
            estado: 'disponible',
            expositorId: null
        }, {
            where: { expositorId: id },
            transaction: t
        });

        // El logo deja de estar referenciado: se borra su archivo WebP
        const logoEliminado = expositor.logo;

        // Eliminar expositor
        await expositor.destroy({ transaction: t });

        await t.commit();

        eliminarArchivoLogo(logoEliminado);

        res.status(200).json({
            success: true,
            data: null,
            message: 'Expositor eliminado con éxito'
        });
    } catch (error) {
        await t.rollback();
        console.error('Error al eliminar expositor:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al eliminar el expositor.'
        });
    }
};

module.exports = expositorCtrl;

module.exports.serializarExpositor = serializarExpositor;
module.exports.normalizarLogo = normalizarLogo;
module.exports.eliminarArchivoLogo = eliminarArchivoLogo;