# Implementación de Herramientas de Gestión: MantisBT y Nextcloud

Documento técnico del módulo de soporte, gestión de incidencias y repositorio documental del proyecto **ExpoJuy 2026** (Capítulos/Puntos 11 y 12 del Trabajo Práctico Integrador).

Describe la arquitectura, configuración, variables de entorno, mecanismos de inicialización segura, contingencias resueltas y pautas operativas para el equipo de desarrollo.

---

## 1. Alcance y Objetivos del Módulo

| Herramienta | Versión de Imagen | Puerto Host Local | Base de Datos | Rol en el Proyecto |
|---|---|---|---|---|
| **MariaDB (`tools-db`)** | `mariadb:11.8.9` | Interno (3306) | — | Motor relacional aislado exclusivo para las herramientas de gestión. |
| **MantisBT (`mantis`)** | `xlrl/mantisbt:2.28.4` | `127.0.0.1:8082` | `bugtracker` | Bug Tracker oficial: gestión y seguimiento de incidencias, errores y tareas vinculadas a commits (Punto 11). |
| **Nextcloud (`nextcloud`)** | `nextcloud:35.0.2-apache` | `127.0.0.1:8083` | `nextcloud_db` | Repositorio documental centralizado: actas de reuniones, diagramas de arquitectura y evidencias de pruebas (Punto 12). |

---

## 2. Arquitectura de Infraestructura (`infra/compose.tools.yaml`)

El stack se diseñó siguiendo los principios de **modularidad**, **segregación de datos** y **seguridad en capas**:

```
+--------------------------------------------------------------------------+
| RED DOCKER: expojuy_tools                                                |
|                                                                          |
|   +-----------------------+                                              |
|   | expojuy-tools-db      | <--- (MariaDB 11.8 - Puerto 3306 interno)    |
|   | Vol: tools_db_data    |      - Base: bugtracker   (mantis_user)      |
|   +-----------+-----------+      - Base: nextcloud_db (nc_user)          |
|               ^                                                          |
|       +-------+-------+                                                  |
|       |               |                                                  |
|   +---+-----------+   +---+-------------+                                |
|   | expojuy-mantis|   | expojuy-nextcloud|                               |
|   | Port: 8082    |   | Port: 8083      |                                |
|   +---------------+   +-----------------+                                |
+--------------------------------------------------------------------------+
        |                       |
        v                       v
Acceso: 127.0.0.1:8082   Acceso: 127.0.0.1:8083 (Host localhost únicamente)
```

### Principios clave implementados:
1. **Aislamiento de Bases de Datos:** MariaDB corre en su propio contenedor y volumen (`tools_db_data`), completamente separado del clúster PostgreSQL de la aplicación web. Esto evita contención de I/O, bloqueos o riesgos de corrupción cruzada con los datos del negocio (stands, telemetría y usuarios de la expo).
2. **Exposición Restringida a Localhost:** Los puertos publicados (`8082` para Mantis y `8083` para Nextcloud) hacen bind explícito a `127.0.0.1`, impidiendo que las interfaces administrativas queden expuestas hacia redes locales o públicas sin túnel seguro.
3. **Persistencia Garantizada:** Todos los archivos de configuración, tickets, anexos y documentos se almacenan en volúmenes Docker con nombre (`tools_db_data`, `mantis_data`, `nextcloud_data`), manteniéndose intactos ante detenciones o reinicios.

---

## 3. Inicialización Automatizada y Segura (`infra/scripts/sql/init-tools-db.sh`)

Para cumplir con la política de **cero secretos versionados en el repositorio**, se implementó un script de aprovisionamiento en bash que sustituye a los scripts SQL estáticos con contraseñas en texto plano:

- **Ruta del script:** `infra/scripts/sql/init-tools-db.sh`
- **Punto de montaje:** `/docker-entrypoint-initdb.d/init-tools-db.sh:ro` en el contenedor `tools-db`.
- **Mecanismo:** MariaDB ejecuta automáticamente los scripts de esta carpeta la primera vez que se inicia con un volumen de datos vacío.

### Tareas que ejecuta el script:
1. Valida que las variables obligatorias existan en el entorno (`MYSQL_ROOT_PASSWORD`, `MANTIS_DB_PASSWORD`, `NEXTCLOUD_DB_PASSWORD`).
2. Escapa caracteres especiales en las contraseñas para prevenir inyecciones SQL.
3. Crea la base `bugtracker` y el usuario `mantis_user` con permisos limitados a dicha base.
4. Crea la base `nextcloud_db` y el usuario `nc_user` con permisos exclusivos sobre ella.
5. Aplica `FLUSH PRIVILEGES;`.

---

## 4. Parámetros y Variables de Entorno (`infra/.env.example`)

Las credenciales reales residen en `infra/.env` (ignorado por Git). Se añadieron y documentaron en `infra/.env.example` las siguientes variables:

| Variable | Descripción / Rol | Valor de Ejemplo |
|---|---|---|
| `TOOLS_DB_ROOT_PASSWORD` | Contraseña del superusuario `root` de MariaDB | `cambiar_root_tools_password` |
| `MANTIS_PORT` | Puerto de escucha HTTP de MantisBT en el host | `8082` |
| `MANTIS_DB_PASSWORD` | Contraseña asignada a `mantis_user` en MariaDB | `cambiar_mantis_password` |
| `MANTIS_ADMIN_PASSWORD` | Contraseña administrativa post-instalador de Mantis | `cambiar_mantis_admin_password` |
| `NEXTCLOUD_PORT` | Puerto de escucha HTTP de Nextcloud en el host | `8083` |
| `NEXTCLOUD_DB_PASSWORD` | Contraseña asignada a `nc_user` en MariaDB | `cambiar_nextcloud_db_password` |
| `NEXTCLOUD_ADMIN_USER` | Usuario administrador inicial de Nextcloud | `admin_expojuy` |
| `NEXTCLOUD_ADMIN_PASSWORD`| Contraseña del administrador de Nextcloud | `cambiar_admin_nextcloud_password` |

---

## 5. Modos de Ejecución

Todos los comandos se ejecutan desde la carpeta `infra/`.

### 5.1 Levantar exclusivamente las herramientas (Ahorro de recursos)
Si solo se requiere trabajar en gestión de incidencias o subir documentación sin levantar la aplicación web:
```powershell
docker compose -f compose.tools.yaml up -d
```

### 5.2 Acoplar las herramientas al entorno principal ya levantado
Si la aplicación web (`postgres`, `backend`, `frontend`) ya está corriendo y se desea sumar Mantis y Nextcloud sin interrumpir el servicio:
```powershell
docker compose -f compose.yaml -f compose.tools.yaml up -d
```
> **Nota de idempotencia:** Docker Compose detectará los contenedores del núcleo web ya activos y solo creará e iniciará `expojuy-tools-db`, `expojuy-mantis` y `expojuy-nextcloud`.

---

## 6. Procedimiento de Configuración Inicial (Primer Arranque)

### 6.1 Configuración de MantisBT (Asistente Web)
1. Navegar a: [http://127.0.0.1:8082/admin/install.php](http://127.0.0.1:8082/admin/install.php).
2. Completar los campos con los valores parametrizados:
   - **Type of Database:** `MySQL Improved`
   - **Hostname (for Database Server):** `tools-db` *(nombre del contenedor dentro de la red)*
   - **Username (for Database):** `mantis_user`
   - **Password (for Database):** La definida en `MANTIS_DB_PASSWORD` dentro de `.env`.
   - **Database name:** `bugtracker`
   - **Admin Username / Password:** Dejar en blanco (las bases ya fueron creadas por el script).
3. Presionar **Install/Upgrade Database**.
4. **Acceso inicial:**
   - **Usuario:** `administrator`
   - **Contraseña:** `root` *(el sistema solicitará el cambio inmediato tras el primer login)*.

### 6.2 Configuración de Nextcloud
1. Navegar a: [http://127.0.0.1:8083](http://127.0.0.1:8083).
2. Gracias a las variables `NEXTCLOUD_ADMIN_*` y `MYSQL_*` definidas en `compose.tools.yaml`, el asistente toma los datos de forma desatendida.
3. Si el asistente solicita confirmación:
   - **Cuenta admin:** Usuario y contraseña configurados en `NEXTCLOUD_ADMIN_*`.
   - **Base de datos:** `MySQL / MariaDB`.
   - **Usuario BD:** `nc_user` / Contraseña `NEXTCLOUD_DB_PASSWORD`.
   - **Nombre BD:** `nextcloud_db` / Servidor: `tools-db`.
4. Finalizar la instalación e ingresar al panel de archivos.

---

## 7. Estrategia de Colaboración y Replicabilidad en el Equipo

Para que los demás integrantes del equipo dispongan de las mismas incidencias y estructuras de carpetas en sus entornos locales sin compartir volúmenes físicos:

### 7.1 Replicar Incidencias de MantisBT (`seed-mantis.sql`)
1. Tras registrar las incidencias del sprint en el Mantis local, generar un volcado SQL de la base `bugtracker`:
   ```powershell
   docker exec -i expojuy-tools-db mysqldump -u root -p"$TOOLS_DB_ROOT_PASSWORD" bugtracker > scripts/sql/seed-mantis.sql
   ```
2. Versionar el archivo en el repositorio.
3. Al clonar el repositorio, MariaDB podrá importar el volcado automáticamente montándolo en `/docker-entrypoint-initdb.d/`.

### 7.2 Aprovisionamiento Automatizado de Nextcloud (`setup-nextcloud.ps1` / `.sh`)

Para estandarizar instantáneamente las carpetas, cuentas y permisos en la PC de cualquier compañero sin configurar nada a mano, se implementaron los scripts [`infra/scripts/setup-nextcloud.ps1`](../infra/scripts/setup-nextcloud.ps1) y [`infra/scripts/setup-nextcloud.sh`](../infra/scripts/setup-nextcloud.sh).

**Ejecución (un solo comando):**
```powershell
# En PowerShell (Windows):
powershell -ExecutionPolicy Bypass -File infra/scripts/setup-nextcloud.ps1

# En Linux / Git Bash:
bash infra/scripts/setup-nextcloud.sh
```

**Matriz de Roles y Permisos Configurada:**
- **Clave inicial común:** `Expojuy2026!` (se autogeneran las 5 cuentas: `ignacio`, `antocruz06`, `integrante3`, `integrante4`, `maxi`).
- **Política de acceso:**
  - `01-Gestion-y-Actas` y `06-Entregables-Finales-y-Defensa`: **Escritura y lectura para todos** (`equipo-expojuy`).
  - `02-Infraestructura-y-DevOps`: Escritura solo para `devops` (`ignacio`); **solo lectura** para el resto.
  - `03-Base-de-Datos-y-Telemetria`: Escritura solo para `dba` (`antocruz06`); **solo lectura** para el resto.
  - `04-Monitoreo-CI-CD-y-Automatizacion`: Escritura para `monitoreo-cicd` e `integrante4`; **solo lectura** para el resto.
  - `05-Seguridad-Auditorias-e-Incidencias`: Escritura solo para `qa-seguridad` (`maxi`); **solo lectura** para el resto.

**Verificación de Acceso Automatizada:**
El script concluye ejecutando internamente `php occ groupfolders:list` y `php occ user:list`, auditando en pantalla la tabla de carpetas activas, los permisos asignados (máscara `31` para lectura/escritura y `1` para solo lectura) y la pertenencia de cada usuario a su grupo, garantizando el aislamiento de privilegios.

---

## 8. Incidentes Técnicos Resueltos durante la Implementación (Troubleshooting)

### Incidencia 1: Error 404 en `/admin/install.php` de MantisBT
- **Causa:** La imagen `xlrl/mantisbt` renombra por seguridad el directorio `admin` a `.admin` en su punto de entrada, haciéndolo inaccesible vía HTTP.
- **Solución:** Se agregó la variable de entorno `MANTIS_ENABLE_ADMIN: 1` en `compose.tools.yaml`, lo cual restaura los permisos del directorio para completar la instalación inicial.

### Incidencia 2: Fallo de imagen con tag inexistente (`xlrl/mantisbt:2.28.4-2`)
- **Causa:** Se especificó un tag con sufijo de paquete de Debian que no existía en Docker Hub, provocando error de pull.
- **Solución:** Se corrigió la imagen al tag oficial estable `xlrl/mantisbt:2.28.4`.

### Incidencia 3: Error de autenticación `Access denied` en MariaDB (CRLF vs LF)
- **Causa:** El script `init-tools-db.sh` se guardó con saltos de línea Windows (`\r\n`). Al ejecutarse en el contenedor Linux arrojó:
  `/usr/local/bin/docker-entrypoint.sh: line 80: /docker-entrypoint-initdb.d/init-tools-db.sh: cannot execute: required file not found`.
  Como consecuencia, el script no se ejecutó y los usuarios `mantis_user` y `nc_user` nunca se crearon.
- **Solución:** Se normalizó el archivo con saltos de línea Unix (`LF`) y se ejecutó la creación de usuarios y bases de datos con éxito.

### Incidencia 4: Contenedor huérfano fuera de Compose (`friendly_wilbur`)
- **Causa:** Un contenedor de prueba ejecutado manualmente con `docker run` quedó activo en segundo plano con nombre aleatorio y sin pertenecer al proyecto `expojuy`.
- **Solución:** Se purgó el contenedor mediante `docker rm -f friendly_wilbur`, manteniendo la lista de contenedores limpia y gestionada exclusivamente por Docker Compose.
