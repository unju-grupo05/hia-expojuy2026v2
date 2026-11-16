# Prueba de failover del clúster PostgreSQL

Cómo tumbar el primario, comprobar que el Sentinel promueve una réplica sin cortar la aplicación,
y volver al estado normal. Detalle del clúster: [`IMPLEMENTACION_ACTUAL.md`](IMPLEMENTACION_ACTUAL.md).

Todos los comandos se ejecutan en PowerShell desde `infra/`.

| Nodo del Sentinel | Servicio | Contenedor | Rol normal |
|---|---|---|---|
| node1 | `postgres` | `expojuy-postgres-1` | Primario |
| node2 | `postgres-replica-1` | `expojuy-postgres-replica-1` | Réplica |
| node3 | `postgres-replica-2` | `expojuy-postgres-replica-2` | Réplica |

El `-1` de `expojuy-postgres-1` lo agrega Compose (instancia 1 del servicio `postgres`): no es la réplica 1.

## 0. Antes: verificar que el clúster esté sano

```powershell
Invoke-RestMethod http://127.0.0.1:8008/cluster/status | ConvertTo-Json -Depth 4
curl.exe -s http://127.0.0.1:8080/api/health
```

Tiene que decir `primary: postgres`, `failoverCount: 0` y `{"status":"ok","db":"ok"}`.

Esperar al menos **5 minutos** desde la prueba anterior: Alertmanager agrupa los avisos de la
misma alerta cada 5 minutos (`group_interval`) y, si no, el aviso se demora.

## 1. Tumbar el primario

```powershell
Get-Date -Format "HH:mm:ss"
docker stop expojuy-postgres-1
```

## 2. Comprobar el failover (esperar 15 segundos)

```powershell
Invoke-RestMethod http://127.0.0.1:8008/cluster/status | ConvertTo-Json -Depth 4
docker logs expojuy-db-failover-manager --tail 10
curl.exe -s http://127.0.0.1:8080/api/health
```

| Resultado esperado | Significa |
|---|---|
| `primary: postgres-replica-1`, `failoverCount: 1` | El Sentinel promovió la réplica 1 |
| Log: "UMBRAL DE FALLA ALCANZADO" … "FAILOVER COMPLETADO" | Hora de detección y de promoción |
| `/api/health` ok | La aplicación sigue funcionando: HAProxy envía las escrituras al nuevo primario |
| A los ~35 s: alerta `PostgresPrimaryDown` | Llega a n8n (flujo 1): incidencia en Mantis y aviso por Telegram |

Evidencias: `cluster/status`, log del Sentinel, `http://127.0.0.1:9090/alerts`,
`http://127.0.0.1:8404/stats`, la incidencia en Mantis y el mensaje de Telegram.

## 3. Volver al estado normal

> **Nunca levantar solo el primario viejo** (`docker start expojuy-postgres-1`): el Sentinel no lo
> aísla, así que quedarían dos primarios aceptando escrituras (*split-brain*).

Se apaga el Sentinel, se vuelve a levantar `postgres` como único primario y se re-clonan las
réplicas desde él:

```powershell
docker compose -f compose.yaml -f compose.cluster-ha.yaml stop db-failover-manager postgres-replica-1 postgres-replica-2
docker start expojuy-postgres-1
docker compose -f compose.yaml -f compose.cluster-ha.yaml rm -f postgres-replica-1 postgres-replica-2
docker volume rm expojuy_pgdata-replica-1 expojuy_pgdata-replica-2
docker compose -f compose.yaml -f compose.cluster-ha.yaml up -d --no-deps postgres-replica-1 postgres-replica-2
```

Repetir hasta que las dos réplicas digan `(healthy)` (unos 2 minutos: copian la base completa;
mientras tanto pueden figurar *unhealthy*):

```powershell
docker ps --filter name=replica --format "{{.Names}} {{.Status}}"
```

Recién entonces, recrear el Sentinel y HAProxy para que tomen a `postgres` como líder:

```powershell
docker compose -f compose.yaml -f compose.cluster-ha.yaml up -d --no-deps --force-recreate db-failover-manager db-loadbalancer
```

## 4. Confirmar

```powershell
Invoke-RestMethod http://127.0.0.1:8008/cluster/status | ConvertTo-Json -Depth 4
curl.exe -s http://127.0.0.1:8080/api/health
```

Otra vez `primary: postgres`, `failoverCount: 0`, y la aplicación ok.

## Notas

- Durante la prueba no cargar datos en la aplicación: lo escrito en el nuevo primario (paso 2) se
  pierde al volver a `postgres` (paso 3).
- Tumbar **una réplica** es más simple: `docker stop expojuy-postgres-replica-2`; para volver,
  `docker start expojuy-postgres-replica-2` (se reengancha sola al primario).
- `--no-deps` evita que Compose toque otros servicios (backend, `postgres`).
- Limitaciones del Sentinel: no aísla al primario viejo (*fencing*) y, al levantar todo el stack,
  puede promover una réplica si el primario tarda en arrancar. Después de reiniciar el stack,
  revisar `/cluster/status`.

## Estado

| Prueba | Resultado |
|---|---|
| Failover del primario | Verificado 16/11/2026: detección y promoción de `postgres-replica-1` en 0,8 s; `postgres-replica-2` se reenganchó al nuevo primario; aplicación sin corte |
| Aviso por Alertmanager → n8n | Verificado 16/11/2026: incidencia `PostgresPrimaryDown` en Mantis unos 35 s después de la caída |
| Vuelta al estado normal (paso 3) | Verificado 16/11/2026: réplicas en *streaming* con lag 0 y `postgres` como líder |
