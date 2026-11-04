require('dotenv').config();
const sequelize = require('../config/database');
const Stand = require('../src/models/stand.model');
const Expositor = require('../src/models/expositor.model');
const UbicacionStand = require('../src/models/ubicacionStand.model');
const standCtrl = require('../src/controllers/stand.controller');
const expositorCtrl = require('../src/controllers/expositor.controller');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
}

async function runDoDVerification() {
  console.log('=============================================================================');
  console.log('INICIANDO PROTOCOLO DE VERIFICACIÓN DoD (Definition of Done)');
  console.log('=============================================================================\n');

  let passedAll = true;
  console.log('--- A. VERIFICACIÓN DE BASE DE DATOS POSTGRESQL ---');

  const [countUbicRes] = await sequelize.query('SELECT COUNT(*) FROM ubicaciones_stand;');
  const totalUbic = parseInt(countUbicRes[0].count, 10);
  console.log(`1. Total ubicaciones_stand: ${totalUbic} (Esperado: 160) -> ${totalUbic === 160 ? 'PASS' : 'FAIL'}`);
  if (totalUbic !== 160) passedAll = false;

  const [countStandsRes] = await sequelize.query('SELECT COUNT(*) FROM stands;');
  const totalStands = parseInt(countStandsRes[0].count, 10);
  console.log(`2. Total stands: ${totalStands} (Esperado: 160) -> ${totalStands === 160 ? 'PASS' : 'FAIL'}`);
  if (totalStands !== 160) passedAll = false;

  const [orphanRes] = await sequelize.query('SELECT COUNT(*) FROM stands WHERE id NOT IN (SELECT stand_id FROM ubicaciones_stand);');
  const orphanCount = parseInt(orphanRes[0].count, 10);
  console.log(`3. Stands huérfanos sin ubicación: ${orphanCount} (Esperado: 0) -> ${orphanCount === 0 ? 'PASS' : 'FAIL'}`);
  if (orphanCount !== 0) passedAll = false;

  const [expWithStandRes] = await sequelize.query('SELECT COUNT(*) FROM expositores WHERE stand IS NOT NULL;');
  const expWithStand = parseInt(expWithStandRes[0].count, 10);
  console.log(`4. Expositores con stands concatenados: ${expWithStand} (Esperado: > 0) -> ${expWithStand > 0 ? 'PASS' : 'FAIL'}`);
  if (expWithStand === 0) passedAll = false;

  // ---------------------------------------------------------------------------
  // B. Verificación de Endpoints (Stands & Ubicaciones)
  // ---------------------------------------------------------------------------
  console.log('\n--- B. VERIFICACIÓN DE ENDPOINTS DE STANDS ---');

  // Test B1: GET /api/stands (todos con ubicacion y expositor)
  const reqAll = { query: {} };
  const resAll = createMockRes();
  await standCtrl.obtenerStands(reqAll, resAll);
  const standsAll = resAll.body?.data || [];
  const hasUbicacion = standsAll.length > 0 && standsAll.every(s => s.ubicacion && typeof s.ubicacion.x === 'number');
  console.log(`1. GET /api/stands retorna ${standsAll.length} parcelas con objeto "ubicacion" 3D -> ${hasUbicacion ? 'PASS' : 'FAIL'}`);
  if (!hasUbicacion) passedAll = false;

  // Test B2: GET /api/stands/disponibles (modo alta)
  const reqDispAlta = { query: {} };
  const resDispAlta = createMockRes();
  await standCtrl.obtenerStandsDisponibles(reqDispAlta, resDispAlta);
  const standsDispAlta = resDispAlta.body?.data || [];
  const allDisponible = standsDispAlta.every(s => s.estado === 'disponible');
  const noCedidos = standsDispAlta.every(s => s.estado !== 'cedido');
  console.log(`2. GET /api/stands/disponibles (alta): ${standsDispAlta.length} stands disponibles (sin cedidos) -> ${allDisponible && noCedidos ? 'PASS' : 'FAIL'}`);
  if (!allDisponible || !noCedidos) passedAll = false;

  // Test B3: GET /api/stands/disponibles?expositorId=exp-alberdi (modo edición)
  const reqDispEdit = { query: { expositorId: 'exp-alberdi' } };
  const resDispEdit = createMockRes();
  await standCtrl.obtenerStandsDisponibles(reqDispEdit, resDispEdit);
  const standsDispEdit = resDispEdit.body?.data || [];
  const includesOwnStands = standsDispEdit.some(s => s.expositorId === 'exp-alberdi');
  console.log(`3. GET /api/stands/disponibles?expositorId=exp-alberdi incluye stands propios del expositor -> ${includesOwnStands ? 'PASS' : 'FAIL'}`);
  if (!includesOwnStands) passedAll = false;

  // ---------------------------------------------------------------------------
  // C. Verificación de Transaccionalidad en Expositores (Alta, Edición, Baja, Colisión)
  // ---------------------------------------------------------------------------
  console.log('\n--- C. VERIFICACIÓN TRANSACCIONAL DE EXPOSITORES ---');

  const stand1 = standsDispAlta[0].id;
  const stand2 = standsDispAlta[1].id;
  const stand3 = standsDispAlta[2].id;

  console.log(`Parcelas para test transaccional: ${stand1}, ${stand2}, ${stand3}`);

  // Test C1: Alta Transaccional (POST)
  const reqCrear = {
    body: {
      name: 'EMPRESA TEST AUTOMATIZADO DoD',
      category: 'tecnologia',
      subtitle: 'Pruebas de Integración y Normalización',
      description: 'Descripción válida de más de diez caracteres.',
      origin: 'Jujuy, Argentina',
      email: 'test@expojuy.com.ar',
      standIds: [stand1, stand2]
    }
  };
  const resCrear = createMockRes();
  await expositorCtrl.crearExpositor(reqCrear, resCrear);

  const expCreado = resCrear.body?.data;
  const creadoOk = resCrear.statusCode === 201 && expCreado && expCreado.stand.includes(stand1) && expCreado.stand.includes(stand2);

  const s1Check = await Stand.findByPk(stand1);
  const s2Check = await Stand.findByPk(stand2);
  const standsReservadosOk = s1Check.estado === 'reservado' && s1Check.expositorId === expCreado?.id &&
                            s2Check.estado === 'reservado' && s2Check.expositorId === expCreado?.id;

  console.log(`1. POST /api/expositores (Alta 2 stands): Creado con stand="${expCreado?.stand}", stands en 'reservado' -> ${creadoOk && standsReservadosOk ? 'PASS' : 'FAIL'}`);
  if (!creadoOk || !standsReservadosOk) passedAll = false;

  // Test C2: Colisión (Intentar asignar stand ya reservado)
  const reqColision = {
    body: {
      name: 'EMPRESA COLISION',
      category: 'mineria',
      description: 'Intento de reserva sobre stand ocupado.',
      standIds: [stand1]
    }
  };
  const resColision = createMockRes();
  await expositorCtrl.crearExpositor(reqColision, resColision);
  const colisionFalloOk = resColision.statusCode === 400 && resColision.body?.success === false;
  console.log(`2. POST /api/expositores (Colisión): Rechazado con HTTP 400 ("${resColision.body?.message}") -> ${colisionFalloOk ? 'PASS' : 'FAIL'}`);
  if (!colisionFalloOk) passedAll = false;

  // Test C3: Edición Diferencial (PUT)
  const reqEditar = {
    params: { id: expCreado.id },
    body: {
      name: 'EMPRESA TEST AUTOMATIZADO DoD (ACTUALIZADA)',
      standIds: [stand2, stand3]
    }
  };
  const resEditar = createMockRes();
  await expositorCtrl.actualizarExpositor(reqEditar, resEditar);

  const expEditado = resEditar.body?.data;
  const s1PostEdit = await Stand.findByPk(stand1);
  const s2PostEdit = await Stand.findByPk(stand2);
  const s3PostEdit = await Stand.findByPk(stand3);

  const liberacionOk = s1PostEdit.estado === 'disponible' && s1PostEdit.expositorId === null;
  const retencionOk = s2PostEdit.estado === 'reservado' && s2PostEdit.expositorId === expCreado.id;
  const nuevaAsignacionOk = s3PostEdit.estado === 'reservado' && s3PostEdit.expositorId === expCreado.id;
  const cadenaRecalculadaOk = expEditado?.stand.includes(stand2) && expEditado?.stand.includes(stand3) && !expEditado?.stand.includes(stand1);

  const editOk = resEditar.statusCode === 200 && liberacionOk && retencionOk && nuevaAsignacionOk && cadenaRecalculadaOk;
  console.log(`3. PUT /api/expositores/:id (Edición diferencial): stand1 liberado a 'disponible', stand3 reservado, cadena recalculada -> ${editOk ? 'PASS' : 'FAIL'}`);
  if (!editOk) passedAll = false;

  // Test C4: Baja Segura Transaccional (DELETE)
  const reqEliminar = { params: { id: expCreado.id } };
  const resEliminar = createMockRes();
  await expositorCtrl.eliminarExpositor(reqEliminar, resEliminar);

  const expBorrado = await Expositor.findByPk(expCreado.id);
  const s2PostDel = await Stand.findByPk(stand2);
  const s3PostDel = await Stand.findByPk(stand3);
  const ubicS2PostDel = await UbicacionStand.findOne({ where: { standId: stand2 } });
  const ubicS3PostDel = await UbicacionStand.findOne({ where: { standId: stand3 } });

  const desvinculacionOk = s2PostDel.estado === 'disponible' && s2PostDel.expositorId === null &&
                           s3PostDel.estado === 'disponible' && s3PostDel.expositorId === null;
  const noBorradosFisicos = s2PostDel !== null && s3PostDel !== null && ubicS2PostDel !== null && ubicS3PostDel !== null;
  const expEliminadoOk = expBorrado === null && resEliminar.statusCode === 200;

  const deleteOk = expEliminadoOk && desvinculacionOk && noBorradosFisicos;
  console.log(`4. DELETE /api/expositores/:id (Baja segura): Expositor eliminado, stands desvinculados a 'disponible' sin borrado físico de stands ni ubicaciones 3D -> ${deleteOk ? 'PASS' : 'FAIL'}`);
  if (!deleteOk) passedAll = false;

  // Verificación final de conteo post-pruebas
  const [finalStandsRes] = await sequelize.query('SELECT COUNT(*) FROM stands;');
  const [finalUbicRes] = await sequelize.query('SELECT COUNT(*) FROM ubicaciones_stand;');
  const finalStands = parseInt(finalStandsRes[0].count, 10);
  const finalUbic = parseInt(finalUbicRes[0].count, 10);
  console.log(`5. Conteo post-pruebas: Stands = ${finalStands} (160), Ubicaciones = ${finalUbic} (160) -> ${finalStands === 160 && finalUbic === 160 ? 'PASS' : 'FAIL'}`);
  if (finalStands !== 160 || finalUbic !== 160) passedAll = false;

  console.log('\n=============================================================================');
  if (passedAll) {
    console.log('>>> RESULTADO GLOBAL: TODOS LOS CRITERIOS DoD SUPERADOS AL 100% <<<');
  } else {
    console.log('>>> RESULTADO GLOBAL: EXISTEN FALLAS EN LOS CRITERIOS DoD <<<');
  }
  console.log('=============================================================================');

  process.exit(passedAll ? 0 : 1);
}

runDoDVerification().catch(err => {
  console.error('Error durante la verificación DoD:', err);
  process.exit(1);
});
