const http = require('http');
const net = require('net');
const { Client } = require('pg');

// Las credenciales nunca se embeben en el código: se exigen como variables
// de entorno (definidas en infra/.env e inyectadas por Compose).
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[HA-SENTINEL] FATAL: la variable de entorno ${name} es obligatoria y no está definida (completarla en infra/.env).`);
    process.exit(1);
  }
  return value;
}

const CONFIG = {
  db: process.env.POSTGRES_DB || 'expojuy',
  user: process.env.POSTGRES_USER || 'expojuy_app',
  password: requireEnv('POSTGRES_PASSWORD'),
  replUser: process.env.POSTGRES_REPLICATION_USER || 'replicator',
  replPassword: requireEnv('POSTGRES_REPLICATION_PASSWORD'),
  checkIntervalMs: parseInt(process.env.CHECK_INTERVAL_MS || '2000', 10),
  failoverThreshold: parseInt(process.env.FAILOVER_THRESHOLD || '3', 10)
};

const clusterState = {
  primaryNode: 'node1',
  failoverCount: 0,
  isFailingOver: false,
  history: [],
  nodes: {
    node1: { id: 'node1', host: process.env.PRIMARY_HOST || 'postgres', port: 5432, role: 'primary', isAlive: false, isRecovery: false, timelineId: 1, failures: 0, lastSeen: null, lsn: null },
    node2: { id: 'node2', host: process.env.REPLICA_1_HOST || 'postgres-replica-1', port: 5432, role: 'replica', isAlive: false, isRecovery: true, timelineId: 1, failures: 0, lastSeen: null, lsn: null },
    node3: { id: 'node3', host: process.env.REPLICA_2_HOST || 'postgres-replica-2', port: 5432, role: 'replica', isAlive: false, isRecovery: true, timelineId: 1, failures: 0, lastSeen: null, lsn: null }
  }
};

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [HA-SENTINEL] ${msg}`);
}

async function checkSingleNode(nodeKey) {
  const node = clusterState.nodes[nodeKey];
  const client = new Client({
    host: node.host,
    port: node.port,
    user: CONFIG.user,
    password: CONFIG.password,
    database: CONFIG.db,
    connectionTimeoutMillis: 3000
  });

  try {
    await client.connect();
    const res = await client.query('SELECT pg_is_in_recovery() AS in_recovery;');
    let lsn = null;
    let timelineId = 1;

    try {
      const tlRes = await client.query('SELECT timeline_id FROM pg_control_checkpoint();');
      timelineId = parseInt(tlRes.rows[0]?.timeline_id || '1', 10);
    } catch (e) {}

    try {
      const lsnRes = await client.query('SELECT pg_last_wal_replay_lsn() AS lsn;');
      lsn = lsnRes.rows[0]?.lsn || null;
    } catch (e) {}

    await client.end();

    const inRecovery = res.rows[0].in_recovery;
    node.isAlive = true;
    node.failures = 0;
    node.isRecovery = inRecovery;
    node.timelineId = timelineId;
    node.role = inRecovery ? 'replica' : 'primary';
    node.lsn = lsn;
    node.lastSeen = new Date().toISOString();
  } catch (err) {
    try { await client.end(); } catch (e) {}
    node.isAlive = false;
    node.failures++;
  }
}

async function checkAllNodes() {
  if (clusterState.isFailingOver) return;

  // 1. Comprobar salud de los 3 nodos en paralelo
  await Promise.all([
    checkSingleNode('node1'),
    checkSingleNode('node2'),
    checkSingleNode('node3')
  ]);

  // 2. Determinar el líder legítimo basado en Timeline ID
  const aliveNodes = Object.values(clusterState.nodes).filter(n => n.isAlive);
  const writeCapableNodes = aliveNodes.filter(n => !n.isRecovery);

  if (writeCapableNodes.length > 0) {
    // Si hay más de un nodo no en recuperación (ej. antiguo primario revivido),
    // el líder legítimo es aquel con el mayor timeline_id
    writeCapableNodes.sort((a, b) => b.timelineId - a.timelineId);
    const legitimateLeader = writeCapableNodes[0];

    if (clusterState.primaryNode !== legitimateLeader.id && !clusterState.isFailingOver) {
      log(`Líder activo determinado por Timeline ID (${legitimateLeader.timelineId}): ${legitimateLeader.id} (${legitimateLeader.host})`);
      clusterState.primaryNode = legitimateLeader.id;
    }
  }

  // 3. Evaluar estado del nodo primario actual
  const currentPrimary = clusterState.nodes[clusterState.primaryNode];
  if (!currentPrimary.isAlive) {
    log(`Nodo primario actual (${clusterState.primaryNode} - ${currentPrimary.host}) NO responde. Fallas consecutivas: ${currentPrimary.failures}/${CONFIG.failoverThreshold}`);

    if (currentPrimary.failures >= CONFIG.failoverThreshold && !clusterState.isFailingOver) {
      log(`¡UMBRAL DE FALLA ALCANZADO! Iniciando failover automático para reemplazar a ${clusterState.primaryNode}...`);
      await triggerFailover(clusterState.primaryNode);
    }
  }
}

async function triggerFailover(failedNodeKey) {
  if (clusterState.isFailingOver) return;
  clusterState.isFailingOver = true;
  clusterState.failoverCount++;

  log(`========================================================================`);
  log(`=== PROTOCOLO DE FAILOVER AUTOMÁTICO INICIADO (Incidente #${clusterState.failoverCount}) ===`);
  log(`========================================================================`);

  // Identificar réplicas saludables candidatas a promoción
  const availableCandidates = Object.keys(clusterState.nodes).filter(key => {
    const n = clusterState.nodes[key];
    return key !== failedNodeKey && n.isAlive && n.isRecovery;
  });

  if (availableCandidates.length === 0) {
    log('ERROR CRÍTICO: No existen réplicas saludables en línea para realizar la promoción.');
    clusterState.isFailingOver = false;
    return;
  }

  // Seleccionar la mejor réplica candidata
  const candidateKey = availableCandidates[0];
  const candidate = clusterState.nodes[candidateKey];
  log(`Réplica seleccionada para promoción: ${candidateKey} (${candidate.host})`);

  try {
    // 1. Promover la réplica seleccionada a Primario
    const promoteClient = new Client({
      host: candidate.host,
      port: candidate.port,
      user: CONFIG.user,
      password: CONFIG.password,
      database: CONFIG.db,
      connectionTimeoutMillis: 5000
    });

    await promoteClient.connect();
    log(`Ejecutando SELECT pg_promote() en ${candidate.host}...`);
    await promoteClient.query('SELECT pg_promote();');

    // Obtener nuevo Timeline ID
    try {
      const tlRes = await promoteClient.query('SELECT timeline_id FROM pg_control_checkpoint();');
      candidate.timelineId = parseInt(tlRes.rows[0]?.timeline_id || '2', 10);
    } catch (e) {
      candidate.timelineId++;
    }

    await promoteClient.end();

    candidate.role = 'primary';
    candidate.isRecovery = false;
    candidate.failures = 0;
    clusterState.primaryNode = candidateKey;

    log(`>>> ¡PROMOCIÓN EXITOSA! Nodo ${candidateKey} (${candidate.host}) ES AHORA EL NUEVO PRIMARIO (Timeline ${candidate.timelineId}).`);

    // 2. Reconfigurar las réplicas restantes para que sigan al nuevo primario
    const remainingKeys = availableCandidates.filter(k => k !== candidateKey);
    for (const remKey of remainingKeys) {
      const remNode = clusterState.nodes[remKey];
      log(`Reconfigurando replicación de ${remKey} (${remNode.host}) hacia el nuevo primario ${candidate.host}...`);
      const reconfigClient = new Client({
        host: remNode.host,
        port: remNode.port,
        user: CONFIG.user,
        password: CONFIG.password,
        database: CONFIG.db,
        connectionTimeoutMillis: 5000
      });

      try {
        await reconfigClient.connect();
        const newConnInfo = `user=${CONFIG.replUser} password=${CONFIG.replPassword} host=${candidate.host} port=5432`;
        await reconfigClient.query(`ALTER SYSTEM SET primary_conninfo = '${newConnInfo}';`);
        try {
          await reconfigClient.query('ALTER SYSTEM RESET primary_slot_name;');
        } catch (e) {}
        await reconfigClient.query('SELECT pg_reload_conf();');
        await reconfigClient.end();
        log(`Replicación en ${remNode.host} actualizada exitosamente hacia ${candidate.host}.`);
      } catch (errOther) {
        try { await reconfigClient.end(); } catch (e) {}
        log(`Error al reconfigurar nodo réplica ${remKey}: ${errOther.message}`);
      }
    }

    clusterState.history.push({
      timestamp: new Date().toISOString(),
      event: 'AUTOMATIC_FAILOVER',
      previousPrimary: failedNodeKey,
      newPrimary: candidateKey,
      promotedHost: candidate.host,
      timelineId: candidate.timelineId
    });

    log(`========================================================================`);
    log(`=== FAILOVER COMPLETADO. HAProxy enrutará las escrituras a ${candidate.host} ===`);
    log(`========================================================================`);
  } catch (err) {
    log(`Error fatal durante la ejecución del failover: ${err.message}`);
  } finally {
    clusterState.isFailingOver = false;
  }
}

// -----------------------------------------------------------------------------
// SERVIDORES AGENT-CHECK PARA HAPROXY (Puertos 8001, 8002, 8003)
// -----------------------------------------------------------------------------
function createAgentServer(nodeKey, port) {
  const server = net.createServer((socket) => {
    socket.on('error', () => {});

    const node = clusterState.nodes[nodeKey];
    const maxTimeline = Math.max(...Object.values(clusterState.nodes).map(n => n.timelineId || 1));
    const isLeader = clusterState.primaryNode === nodeKey && node.isAlive && !node.isRecovery && node.timelineId >= maxTimeline;

    let response = '';
    if (isLeader) {
      response = 'ready up 100%\n';
    } else if (node.isAlive && node.isRecovery) {
      response = 'maint\n';
    } else {
      response = 'down\n';
    }
    socket.write(response);
    socket.end();
  });

  server.on('error', (err) => {
    log(`Error en AgentServer ${nodeKey}: ${err.message}`);
  });

  server.listen(port, '0.0.0.0', () => {
    log(`Agent-check server para ${nodeKey} escuchando en puerto ${port}`);
  });
}

createAgentServer('node1', 8001);
createAgentServer('node2', 8002);
createAgentServer('node3', 8003);

// -----------------------------------------------------------------------------
// SERVIDOR HTTP DE ESTADO Y API DE MONITOREO (Puerto 8008)
// -----------------------------------------------------------------------------
const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', sentinel: 'active' }));
    return;
  }

  if (req.url === '/cluster/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      timestamp: new Date().toISOString(),
      primary: clusterState.primaryNode,
      primaryHost: clusterState.nodes[clusterState.primaryNode]?.host,
      primaryTimeline: clusterState.nodes[clusterState.primaryNode]?.timelineId,
      failoverCount: clusterState.failoverCount,
      isFailingOver: clusterState.isFailingOver,
      nodes: clusterState.nodes,
      history: clusterState.history
    }, null, 2));
    return;
  }

  if (req.url === '/cluster/failover/simulate' && req.method === 'POST') {
    log('Disparo de failover simulado solicitado vía API HTTP...');
    triggerFailover(clusterState.primaryNode);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Failover simulado iniciado' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

httpServer.listen(8008, '0.0.0.0', () => {
  log('HTTP Sentinel API escuchando en puerto 8008 (/health, /cluster/status)');
});

// -----------------------------------------------------------------------------
// CICLO PERIÓDICO DE MONITOREO SECUENCIAL SIN SOLAPAMIENTO
// -----------------------------------------------------------------------------
async function monitoringLoop() {
  try {
    await checkAllNodes();
  } catch (err) {
    log(`Error en ciclo de monitoreo: ${err.message}`);
  }
  setTimeout(monitoringLoop, CONFIG.checkIntervalMs);
}

monitoringLoop();
log('Sentinel y Monitor de Alta Disponibilidad iniciado exitosamente.');
