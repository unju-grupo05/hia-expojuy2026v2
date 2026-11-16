# Guía de cambios en la infraestructura

Qué hacer después de modificar algo en `infra/` (una alerta, un target, una variable, un
servicio) o después de un `git pull`/merge que trae cambios de infraestructura. Todos los
comandos son para PowerShell y se ejecutan desde `infra/`.

## 0. Reglas que siempre aplican

1. **Repetir todos los `-f` de los modos levantados.** Compose no recuerda qué archivos se
   usaron. Si falta uno, puede recrear el backend sin el clúster HA o dejar contenedores
   huérfanos.

   | Modo | Archivos |
   |---|---|
   | A - Base | `-f compose.yaml` |
   | B - Clúster HA | `+ -f compose.cluster-ha.yaml` |
   | C - Herramientas | `+ -f compose.tools.yaml` |
   | D - Monitoreo | `+ -f compose.monitoring.yaml` |

   Los ejemplos usan los cuatro modos; quitar los `-f` de los modos que no estén levantados.
2. **Nunca `down -v`** para aplicar un cambio: borra los volúmenes (base, dashboards, Mantis,
   Nextcloud).
3. **Antes de aplicar, simular** con `--dry-run`: muestra qué contenedores crearía, recrearía
   o borraría, sin hacerlo. Si cambió una imagen, correr antes `pull`: sin la imagen descargada,
   el `--dry-run` falla con *"No such image"*.
4. **Después de aplicar, chequear:** `powershell -ExecutionPolicy Bypass -File scripts/check-servicios.ps1`.
5. **Secretos solo en `infra/.env`.** Toda variable nueva va también a `infra/.env.example`
   con un valor de ejemplo.

## 1. Tabla rápida: qué cambió y qué correr

| Qué cambió | Qué correr | Por qué |
|---|---|---|
| Un `compose.*.yaml` (imagen, variables, puertos, redes) | `up -d` | Compose compara la configuración y recrea solo los servicios que cambiaron |
| La versión de una imagen con datos (Nextcloud, MariaDB, Postgres) | `pull`, `--dry-run` y `up -d`, después de leer las notas de actualización | Algunas no aceptan saltos grandes: Nextcloud sube de a una versión mayor por vez (ver `HERRAMIENTAS_GESTION_TOOLS.md`, incidencia 5) |
| Código que se construye (backend, frontend, Sentinel) | `up -d --build <servicio>` | Sin `--build` sigue usando la imagen anterior |
| Un archivo montado (`prometheus.yml`, `alerts.yml`, `haproxy.cfg`) | `restart <servicio>` | Compose no mira el contenido de los archivos montados |
| Se borró o renombró un servicio | `up -d --remove-orphans` | Si no, el contenedor viejo queda corriendo huérfano |
| Un valor de `infra/.env` | `up -d` | Recrea los servicios que usan esa variable (ver excepción en 3.4) |
| Un script de `docker-entrypoint-initdb.d` | Ver 3.8 | Solo se ejecuta con el volumen vacío |

## 2. Después de un `git pull` o un merge

```powershell
git diff --stat ORIG_HEAD HEAD -- infra/
```

Lista los archivos de `infra/` que cambiaron con el último pull/merge (`ORIG_HEAD` es dónde
estaba la rama antes). Con esa lista, aplicar la tabla de la sección 1:

```powershell
docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml -f compose.monitoring.yaml --dry-run up -d --remove-orphans
docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml -f compose.monitoring.yaml up -d --remove-orphans
```

Si cambió algún archivo montado, agregar el `restart` del servicio correspondiente. Si cambió
código, agregar `--build`. Cerrar con `check-servicios.ps1`.

## 3. Recetas

### 3.1 Agregar o modificar una alerta

Las reglas están en `infra/prometheus/alerts.yml`. Una regla nueva va dentro de `rules:`, con
la misma sangría que las existentes. Ejemplo, alerta cuando Prometheus no puede leer un target:

```yaml
      - alert: TargetCaido
        expr: up == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Target {{ $labels.job }} caído"
          description: "Prometheus no puede leer las métricas de {{ $labels.instance }} hace más de 30 segundos."
```

| Campo | Qué es |
|---|---|
| `expr` | Consulta PromQL; la alerta se activa mientras devuelve resultados |
| `for` | Cuánto tiempo tiene que cumplirse antes de dispararse (evita falsas alarmas) |
| `labels.severity` | Gravedad (`warning`, `critical`) |
| `annotations` | Texto que se muestra en la alerta; `{{ $labels.x }}` inserta etiquetas |

Pasos:

1. Probar la consulta antes en http://127.0.0.1:9090/graph.
2. Validar la sintaxis. El archivo está montado, así que el contenedor ya ve la versión
   editada:
   ```powershell
   docker exec expojuy-prometheus promtool check rules /etc/prometheus/alerts.yml
   ```
3. Aplicar:
   ```powershell
   docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml -f compose.monitoring.yaml restart prometheus
   ```
4. Verificar en http://127.0.0.1:9090/alerts que la regla aparece en **Inactive**.
5. Probarla provocando la condición (para el ejemplo: `docker stop expojuy-node-exporter`).
   La alerta pasa a **Pending** (condición cumplida, esperando `for`) y luego a **Firing**.
   Volver con `docker start expojuy-node-exporter`.

No hay Alertmanager: las alertas se ven en la interfaz de Prometheus, pero no envían
notificaciones (correo, Slack). Para notificar hay que agregar Alertmanager como servicio.

### 3.2 Agregar un target (algo nuevo para medir)

1. Si hace falta un exporter, agregarlo como servicio en `compose.monitoring.yaml`: imagen con
   versión fija, en la red donde está lo que mide (`data` para bases, `app` para la web), sin
   publicar puertos.
2. Agregar el job en `infra/prometheus/prometheus.yml`, con el mismo formato de los existentes.
3. Validar:
   ```powershell
   docker exec expojuy-prometheus promtool check config /etc/prometheus/prometheus.yml
   ```
4. Aplicar: `up -d --remove-orphans` (crea el exporter) y `restart prometheus` (relee la
   configuración).
5. Verificar en http://127.0.0.1:9090/targets que el target nuevo está en **UP**.
6. Agregar el servicio a la lista del modo D en `scripts/check-servicios.ps1`.

### 3.3 Dashboards de Grafana

- **Importar por ID** (Dashboards → New → Import): queda guardado en el volumen
  `expojuy_grafana-data`. Sobrevive a reinicios y recreaciones, pero se pierde con `down -v`.
- **Versionarlo en el repo:** exportar el JSON (Share → Export → Save to file) y guardarlo en
  `infra/grafana/provisioning/dashboards/`. El proveedor definido en `dashboards.yml` carga
  los JSON de esa carpeta.
- El datasource Prometheus ya está provisionado en `provisioning/datasources/prometheus.yml`.

### 3.4 Cambiar o agregar una variable de `infra/.env`

1. Editar `infra/.env`. Si es nueva, agregarla también a `infra/.env.example` con un valor de
   ejemplo, y referenciarla en el compose como `${VARIABLE}`.
2. Aplicar con `up -d`.
3. Comprobar que llegó al contenedor sin mostrar el valor:
   ```powershell
   (docker exec <contenedor> printenv <VARIABLE>).Length
   ```

**Excepción:** las variables de inicialización (`POSTGRES_*`, `PGADMIN_*`,
`GF_SECURITY_ADMIN_*`, `NEXTCLOUD_ADMIN_*`, `TOOLS_DB_ROOT_PASSWORD` y las claves de Mantis y
Nextcloud en `tools-db`) solo se aplican cuando el volumen está vacío. Cambiarlas después no
tiene efecto: hay que cambiar el valor dentro del servicio (SQL, interfaz o CLI) o recrear su
volumen, lo que borra sus datos.

### 3.5 Cambiar código (backend, frontend, Sentinel)

```powershell
docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml -f compose.monitoring.yaml up -d --build backend
```

Reemplazar `backend` por `frontend` o `db-failover-manager` según corresponda. Si cambia el
comportamiento del Sentinel, subir la versión de su imagen en `compose.cluster-ha.yaml`
(por ejemplo `expojuy-failover-manager:1.0.1`), nunca `latest`.

### 3.6 Cambiar `haproxy.cfg`

```powershell
docker exec expojuy-db-loadbalancer haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg
docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml -f compose.monitoring.yaml restart db-loadbalancer
```

El primero valida la configuración (`-c` = check). El reinicio corta por unos segundos las
conexiones a la base que pasan por HAProxy; el backend se reconecta solo.

### 3.7 Agregar un servicio nuevo

Seguir las reglas de [`CONTEXTO_PROYECTO.md` §7](CONTEXTO_PROYECTO.md). Lista de control:

- [ ] Va en el `compose.*.yaml` de su área, con imagen de versión fija.
- [ ] Puertos publicados solo en `127.0.0.1`.
- [ ] Usa las redes existentes `app`/`data`, sin redefinirlas.
- [ ] Variables nuevas en `infra/.env.example`.
- [ ] Puerto agregado a la tabla de servicios del README.
- [ ] Servicio agregado a su modo en `scripts/check-servicios.ps1`.
- [ ] Aplicado con `--dry-run` y luego `up -d`; verificado con `check-servicios.ps1`.

### 3.8 Cambiar un script de inicialización de base

Los scripts montados en `docker-entrypoint-initdb.d` (por ejemplo
`scripts/sql/init-tools-db.sh`) solo se ejecutan la primera vez, con el volumen vacío. Para
aplicar el cambio en un entorno existente hay dos opciones:

- Ejecutar a mano la parte nueva (`docker exec <contenedor> ...`).
- Recrear el volumen de ese servicio. **Borra sus datos:** confirmar antes y tener respaldo.

## 4. Estado de verificación

Verificado en el entorno local entre el 13 y el 15/11/2026:

- `up -d` recrea solo los servicios cuya configuración cambió.
- `--build` del Sentinel con imagen versionada (`expojuy-failover-manager:1.0.0`).
- Variables de HAProxy (`HA_PROXY_STATS_*`) aplicadas con `up -d`.
- El script de `tools-db` se ejecuta solo con el volumen vacío.
- `restart prometheus` y `promtool check config` / `check rules` (`SUCCESS`, 7 reglas), al
  aplicar el merge del monitoreo por nodo.
- `up -d --remove-orphans`: creó los tres `postgres-exporter-*` y borró el `postgres-exporter`
  anterior.

Pendiente de verificar: `haproxy -c` y la carga de dashboards desde archivo.
