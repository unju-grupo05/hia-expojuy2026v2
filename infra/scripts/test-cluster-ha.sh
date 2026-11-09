#!/usr/bin/env bash
# =============================================================================
# ExpoJuy 2026 - Verificación Integral del Clúster HA de 3 Nodos
# Integrante 2 (DBA)
# =============================================================================

set -e

echo "========================================================================"
echo ">>> [1/4] Consultando Estado del Clúster en Sentinel API (Puerto 8008)..."
echo "========================================================================"
curl -s http://127.0.0.1:8008/cluster/status | grep -E '"primary"|"isAlive"|"role"|"timelineId"|"failoverCount"' || true
echo ""

echo "========================================================================"
echo ">>> [2/4] Probando Enrutamiento de Escritura en HAProxy (Puerto 5437)..."
echo "========================================================================"
docker run --rm --network expojuy_data -e PGPASSWORD=G7Fw6Q2JDATv9N8sk0fmMxgia4XjRBIE pgvector/pgvector:pg17 \
  psql -h db-loadbalancer -p 5432 -U expojuy_app -d expojuy -c \
  "SELECT inet_server_addr() AS ip_nodo_escritura, pg_is_in_recovery() AS es_standby, current_timestamp AS timestamp_escritura;"

echo ""
echo "========================================================================"
echo ">>> [3/4] Probando Balanceo de Carga de Lectura en Round-Robin (6 queries)..."
echo "========================================================================"
for i in {1..6}; do
  docker run --rm --network expojuy_data -e PGPASSWORD=G7Fw6Q2JDATv9N8sk0fmMxgia4XjRBIE pgvector/pgvector:pg17 \
    psql -h db-loadbalancer -p 5436 -U expojuy_app -d expojuy -t -A -c \
    "SELECT 'Query ' || $i || ' -> Nodo IP: ' || inet_server_addr() || ' | Standby: ' || pg_is_in_recovery();"
done

echo ""
echo "========================================================================"
echo ">>> [4/4] Métricas y Dashboard HAProxy"
echo "========================================================================"
echo "Dashboard Web: http://127.0.0.1:8404/stats (admin / expojuy_ha_secret_2026)"
echo "Sentinel API:  http://127.0.0.1:8008/cluster/status"
echo ">>> Verificación completada con éxito."
