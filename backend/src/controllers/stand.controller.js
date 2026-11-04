const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const { Stand, Expositor, UbicacionStand } = require('../models');

const standCtrl = {};

const expositorAttributes = ['id', 'name', 'category', 'subtitle', 'description'];

standCtrl.obtenerStands = async (req, res) => {
    try {
        const { sector, estado, search } = req.query;
        const where = {};

        if (sector && sector !== 'all') {
            where.sector = sector;
        }
        if (estado && estado !== 'all') {
            where.estado = estado;
        }
        if (search) {
            where[Op.or] = [
                { id: { [Op.iLike]: `%${search}%` } },
                { sector: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const stands = await Stand.findAll({
            where,
            include: [
                {
                    model: UbicacionStand,
                    as: 'ubicacion'
                },
                {
                    model: Expositor,
                    as: 'expositor',
                    attributes: expositorAttributes
                }
            ],
            order: [['id', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: stands,
            message: 'Stands obtenidos con éxito'
        });
    } catch (error) {
        console.error('Error al obtener stands:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al obtener los stands.'
        });
    }
};


standCtrl.obtenerStandsDisponibles = async (req, res) => {
    try {
        const { expositorId } = req.query;

        const where = {
            estado: { [Op.ne]: 'cedido' }
        };

        if (expositorId) {
            where[Op.or] = [
                { estado: 'disponible' },
                { expositorId: String(expositorId) }
            ];
        } else {
            where.estado = 'disponible';
        }

        const stands = await Stand.findAll({
            where,
            include: [
                {
                    model: UbicacionStand,
                    as: 'ubicacion'
                },
                {
                    model: Expositor,
                    as: 'expositor',
                    attributes: expositorAttributes
                }
            ],
            order: [['id', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: stands,
            message: 'Stands disponibles obtenidos con éxito'
        });
    } catch (error) {
        console.error('Error al obtener stands disponibles:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al obtener los stands disponibles.'
        });
    }
};


standCtrl.obtenerStandPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const stand = await Stand.findByPk(id, {
            include: [
                {
                    model: UbicacionStand,
                    as: 'ubicacion'
                },
                {
                    model: Expositor,
                    as: 'expositor',
                    attributes: expositorAttributes
                }
            ]
        });

        if (!stand) {
            return res.status(404).json({
                success: false,
                data: null,
                message: `Stand '${id}' no encontrado.`
            });
        }

        res.status(200).json({
            success: true,
            data: stand,
            message: 'Stand obtenido con éxito'
        });
    } catch (error) {
        console.error('Error al obtener stand por ID:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al obtener el stand.'
        });
    }
};

standCtrl.crearStand = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            id,
            sector,
            superficie,
            estado,
            notas,
            expositorId,
            ubicacion,
            x, y, z, rotY, w, l, h, carpetColor, type
        } = req.body;

        if (!id || !sector) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                data: null,
                message: 'Faltan campos obligatorios (id, sector).'
            });
        }

        const existe = await Stand.findByPk(id, { transaction: t });
        if (existe) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                data: null,
                message: `El stand con identificador '${id}' ya existe.`
            });
        }

        if (expositorId) {
            const expositor = await Expositor.findByPk(expositorId, { transaction: t });
            if (!expositor) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    data: null,
                    message: `El expositor asociado con ID '${expositorId}' no existe.`
                });
            }
        }

        const nuevoStand = await Stand.create({
            id,
            sector,
            superficie: superficie ?? null,
            estado: estado ?? 'disponible',
            notas: notas ?? null,
            expositorId: expositorId || null
        }, { transaction: t });

        // Coordenadas 3D (desde objeto ubicacion o campos sueltos)
        const u = ubicacion || {};
        await UbicacionStand.create({
            standId: nuevoStand.id,
            x: u.x !== undefined ? parseFloat(u.x) : (x !== undefined ? parseFloat(x) : 0),
            y: u.y !== undefined ? parseFloat(u.y) : (y !== undefined ? parseFloat(y) : 0),
            z: u.z !== undefined ? parseFloat(u.z) : (z !== undefined ? parseFloat(z) : 0),
            rotY: u.rotY !== undefined ? parseFloat(u.rotY) : (rotY !== undefined ? parseFloat(rotY) : 0),
            w: u.w !== undefined ? parseFloat(u.w) : (w !== undefined ? parseFloat(w) : 3),
            l: u.l !== undefined ? parseFloat(u.l) : (l !== undefined ? parseFloat(l) : 3),
            h: u.h !== undefined ? parseFloat(u.h) : (h !== undefined ? parseFloat(h) : 2.5),
            carpetColor: u.carpetColor !== undefined ? parseInt(u.carpetColor, 10) : (carpetColor !== undefined ? parseInt(carpetColor, 10) : 0x334155),
            type: u.type || type || 'cubierto'
        }, { transaction: t });

        await t.commit();

        const standCreado = await Stand.findByPk(nuevoStand.id, {
            include: [
                { model: UbicacionStand, as: 'ubicacion' },
                { model: Expositor, as: 'expositor', attributes: expositorAttributes }
            ]
        });

        res.status(201).json({
            success: true,
            data: standCreado,
            message: 'Stand creado con éxito'
        });
    } catch (error) {
        await t.rollback();
        console.error('Error al crear stand:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al crear el stand.'
        });
    }
};

standCtrl.actualizarStand = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const stand = await Stand.findByPk(id, { transaction: t });

        if (!stand) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                data: null,
                message: `Stand '${id}' no encontrado.`
            });
        }

        if (req.body.expositorId) {
            const expositor = await Expositor.findByPk(req.body.expositorId, { transaction: t });
            if (!expositor) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    data: null,
                    message: `El expositor con ID '${req.body.expositorId}' no existe.`
                });
            }
        }

        const { sector, superficie, estado, notas, expositorId, ubicacion, x, y, z, rotY, w, l, h, carpetColor, type } = req.body;
        const standUpdateData = {};
        if (sector !== undefined) standUpdateData.sector = sector;
        if (superficie !== undefined) standUpdateData.superficie = superficie;
        if (estado !== undefined) standUpdateData.estado = estado;
        if (notas !== undefined) standUpdateData.notas = notas;
        if (expositorId !== undefined) standUpdateData.expositorId = expositorId || null;

        await stand.update(standUpdateData, { transaction: t });

        // Actualizar geometría si se proveyó
        const u = ubicacion || {};
        const geoUpdateData = {};
        if (u.x !== undefined) geoUpdateData.x = parseFloat(u.x);
        else if (x !== undefined) geoUpdateData.x = parseFloat(x);

        if (u.y !== undefined) geoUpdateData.y = parseFloat(u.y);
        else if (y !== undefined) geoUpdateData.y = parseFloat(y);

        if (u.z !== undefined) geoUpdateData.z = parseFloat(u.z);
        else if (z !== undefined) geoUpdateData.z = parseFloat(z);

        if (u.rotY !== undefined) geoUpdateData.rotY = parseFloat(u.rotY);
        else if (rotY !== undefined) geoUpdateData.rotY = parseFloat(rotY);

        if (u.w !== undefined) geoUpdateData.w = parseFloat(u.w);
        else if (w !== undefined) geoUpdateData.w = parseFloat(w);

        if (u.l !== undefined) geoUpdateData.l = parseFloat(u.l);
        else if (l !== undefined) geoUpdateData.l = parseFloat(l);

        if (u.h !== undefined) geoUpdateData.h = parseFloat(u.h);
        else if (h !== undefined) geoUpdateData.h = parseFloat(h);

        if (u.carpetColor !== undefined) geoUpdateData.carpetColor = parseInt(u.carpetColor, 10);
        else if (carpetColor !== undefined) geoUpdateData.carpetColor = parseInt(carpetColor, 10);

        if (u.type !== undefined) geoUpdateData.type = u.type;
        else if (type !== undefined) geoUpdateData.type = type;

        if (Object.keys(geoUpdateData).length > 0) {
            const [ubicacionRecord] = await UbicacionStand.findOrCreate({
                where: { standId: id },
                defaults: { standId: id, ...geoUpdateData },
                transaction: t
            });
            await ubicacionRecord.update(geoUpdateData, { transaction: t });
        }

        await t.commit();

        const standActualizado = await Stand.findByPk(id, {
            include: [
                { model: UbicacionStand, as: 'ubicacion' },
                { model: Expositor, as: 'expositor', attributes: expositorAttributes }
            ]
        });

        res.status(200).json({
            success: true,
            data: standActualizado,
            message: 'Stand actualizado con éxito'
        });
    } catch (error) {
        await t.rollback();
        console.error('Error al actualizar stand:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al actualizar el stand.'
        });
    }
};

standCtrl.asignarExpositor = async (req, res) => {
    try {
        const { id } = req.params;
        const { expositorId, estado } = req.body;

        const stand = await Stand.findByPk(id);
        if (!stand) {
            return res.status(404).json({
                success: false,
                data: null,
                message: `Stand '${id}' no encontrado.`
            });
        }

        if (expositorId) {
            const expositor = await Expositor.findByPk(expositorId);
            if (!expositor) {
                return res.status(400).json({
                    success: false,
                    data: null,
                    message: `El expositor con ID '${expositorId}' no existe.`
                });
            }
        }

        const updateData = {};
        if (expositorId !== undefined) updateData.expositorId = expositorId || null;
        if (estado !== undefined) updateData.estado = estado;

        await stand.update(updateData);

        const standActualizado = await Stand.findByPk(id, {
            include: [
                { model: UbicacionStand, as: 'ubicacion' },
                { model: Expositor, as: 'expositor', attributes: expositorAttributes }
            ]
        });

        res.status(200).json({
            success: true,
            data: standActualizado,
            message: 'Asignación de stand actualizada con éxito'
        });
    } catch (error) {
        console.error('Error al asignar expositor al stand:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al modificar la asignación del stand.'
        });
    }
};

standCtrl.eliminarStand = async (req, res) => {
    try {
        const { id } = req.params;
        const stand = await Stand.findByPk(id);

        if (!stand) {
            return res.status(404).json({
                success: false,
                data: null,
                message: `Stand '${id}' no encontrado.`
            });
        }

        await stand.destroy();

        res.status(200).json({
            success: true,
            data: null,
            message: 'Stand eliminado con éxito'
        });
    } catch (error) {
        console.error('Error al eliminar stand:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al eliminar el stand.'
        });
    }
};

module.exports = standCtrl;
