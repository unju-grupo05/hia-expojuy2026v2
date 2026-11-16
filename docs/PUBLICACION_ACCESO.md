# Publicación y acceso desde Internet (punto 9)

Cómo se publica ExpoJuy 2026 desde una notebook local, quién puede acceder a cada servicio y
con qué controles. Responsable: Integrante 1.

## 1. Resumen

| Nivel | Mecanismo | Quién accede | Servicios |
|---|---|---|---|
| **Público** | Tailscale **Funnel** | Cualquiera en Internet | La aplicación web (frontend + API en `/api`) y los webhooks de n8n (`/webhook`, para Telegram) |
| **Restringido** | Tailscale **Serve** | Solo los miembros de la tailnet (equipo y cátedra invitados) | Interfaces administrativas |
| **Local** | Ninguno | Solo la notebook | Base de datos y servicios internos del clúster |

Regla: la aplicación es pública, lo administrativo es privado y la base de datos no se publica.

## 2. Conceptos

| Término | Qué es |
|---|---|
| **Tailscale** | VPN que une dispositivos en una red privada cifrada (WireGuard), estén donde estén |
| **Tailnet** | La red privada de Tailscale: los dispositivos y las personas invitadas |
| **Funnel** | Publica un servicio local en Internet con HTTPS, a través de los servidores de Tailscale |
| **Serve** | Publica un servicio local con HTTPS solo dentro de la tailnet |
| **Túnel** | Conexión que **sale** de la notebook hacia Tailscale. Por eso no hace falta abrir puertos de entrada en el router ni en el firewall |

## 3. Diagrama de red

```mermaid
flowchart LR
    U[Usuario en Internet] -->|HTTPS| F[Tailscale Funnel<br/>https://maquina.tailnet.ts.net]
    TG[Telegram] -->|HTTPS :8443/webhook| F2[Tailscale Funnel :8443]
    T[Integrante o cátedra<br/>en la tailnet] -->|HTTPS| S[Tailscale Serve]

    subgraph NB[Notebook: Docker, puertos solo en 127.0.0.1]
        FE[frontend nginx :8080]
        BE[backend :3000]
        HA[HAProxy]
        PG[(Postgres primario<br/>+ 2 réplicas)]
        ADM[Herramientas:<br/>Grafana, Prometheus, pgAdmin,<br/>Mantis, Nextcloud, HAProxy stats,<br/>editor de n8n]
        N8N[n8n :5679]
    end

    F -->|127.0.0.1:8080| FE
    F2 -->|solo /webhook| N8N
    FE -->|/api| BE
    BE --> HA --> PG
    S --> ADM
```

## 4. Servicio por servicio

| Servicio | Puerto local | Nivel | Autenticación |
|---|---|---|---|
| Web (frontend + `/api`) | 8080 | **Funnel** | Pública; el panel `/admin` pide login |
| Mantis | 8082 | **Serve** | Usuario de Mantis |
| Nextcloud | 8083 | **Serve** | Usuario de Nextcloud |
| Grafana | 3001 | **Serve** | `GF_SECURITY_ADMIN_*` |
| Prometheus | 9090 | **Serve** | Sin login propio: lo protege la tailnet |
| pgAdmin | 5050 | **Serve** | `PGADMIN_*` |
| HAProxy stats | 8404 | **Serve** | `HA_PROXY_STATS_*` |
| n8n (editor) | 5679 | **Serve** | Cuenta Owner de n8n |
| n8n (webhooks `/webhook`) | 5679 → Funnel 8443 | **Funnel** (solo esa ruta) | Sin login: cada flujo valida lo que recibe |
| Sentinel (API de estado) | 8008 | Local | — |
| Postgres primario / réplicas | 5433 / 5434, 5435 | Local | — |
| HAProxy escritura / lectura | 5437 / 5438 | Local | — |

Credenciales: ver `infra/.env`.

## 5. Configuración

### 5.1 Docker: todo en `127.0.0.1`
Los compose publican los puertos como `"127.0.0.1:PUERTO:PUERTO"`: solo responden en la propia
notebook, no en la red local. Tailscale los toma desde ahí. Comprobación:

```powershell
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Excepción pendiente: el frontend está en `0.0.0.0:8080` (accesible desde la red local).

### 5.2 Funnel (aplicación pública)

```powershell
tailscale funnel status
```

Resultado esperado: `https://<maquina>.<tailnet>.ts.net (Funnel on)` con `/ proxy http://127.0.0.1:8080`.

El backend tiene que conocer su URL pública (CORS y enlaces de los correos). En `infra/.env`:

```
PUBLIC_URL=https://<maquina>.<tailnet>.ts.net
```

Después se recrea el backend (`up -d` con todos los `-f`, ver `OPERACION_CAMBIOS.md`).

### 5.3 Serve (herramientas restringidas)
Paso a paso, en forma manual o con el script `infra/scripts/tailscale-publicar.ps1`:
[`PUBLICAR_HERRAMIENTAS.md`](PUBLICAR_HERRAMIENTAS.md).

Cada herramienta usa **su propio puerto**, nunca el 443. Funnel se habilita por puerto: una ruta
agregada al 443 quedaría pública junto con la aplicación.

```powershell
tailscale serve --bg --https=8082 http://127.0.0.1:8082   # Mantis
tailscale serve --bg --https=8083 http://127.0.0.1:8083   # Nextcloud
tailscale serve --bg --https=3001 http://127.0.0.1:3001   # Grafana
tailscale serve --bg --https=9090 http://127.0.0.1:9090   # Prometheus
tailscale serve --bg --https=5050 http://127.0.0.1:5050   # pgAdmin
tailscale serve --bg --https=8404 http://127.0.0.1:8404   # HAProxy stats
tailscale serve status
```

Ajustes que necesitan las aplicaciones para responder con la nueva dirección:

| Aplicación | Ajuste |
|---|---|
| Nextcloud | Agregar el dominio `.ts.net` a `trusted_domains` y el gateway de Docker a `trusted_proxies` |
| Mantis | `$g_path` en `config/config_inc.php` fijo en `http://127.0.0.1:8082/`: cambiarlo a la URL de Serve |

Comandos en [`PUBLICAR_HERRAMIENTAS.md`](PUBLICAR_HERRAMIENTAS.md).

### 5.4 Quién puede acceder
Links y pasos para el equipo: [`ACCESOS.md`](ACCESOS.md).

- **Equipo y cátedra:** se comparte la notebook (consola → *Machines* → la máquina → *Share*).
  Cada persona usa su propia cuenta de Tailscale y ve solo esta máquina, no el resto de la tailnet.
- No se usa *Invite* (sumar miembros a la tailnet): daría acceso a todos los dispositivos.

## 6. Firewall, ACL y HTTPS

| Control | Cómo se cumple |
|---|---|
| Puertos de entrada | **Ninguno abierto** en el router ni en el firewall de Windows: el túnel es saliente |
| HTTPS | Tailscale emite y renueva el certificado de `*.ts.net` (Funnel y Serve) |
| Base de datos | No se publica: puertos solo en `127.0.0.1` y fuera de Funnel/Serve |
| Administración | Solo por Serve (tailnet) y con login propio de cada herramienta |
| Quién llega a qué puerto | ACL de la tailnet (mínimo privilegio, ver 6.1) |

### 6.1 ACL de la tailnet
Serve decide **qué** se publica; la ACL decide **quién** llega a cada puerto. Sin ACL, la regla por
defecto de Tailscale (`src: *, dst: *`) deja que un usuario compartido llegue a **cualquier** puerto
de la notebook, incluidos programas de Windows que escuchan en todas las interfaces (por ejemplo
SMB en el 445 o un PostgreSQL instalado en Windows en el 5432).

Política aplicada en la consola (*Access controls* → *JSON editor*), en lugar del "allow all":

```jsonc
"hosts": { "notebook-expojuy": "<IP de Tailscale de la notebook>" },  // tailscale ip -4
"grants": [
    // Miembros de la tailnet (el responsable y sus dispositivos): acceso completo
    { "src": ["autogroup:member"], "dst": ["*"], "ip": ["*"] },
    // Usuarios con la máquina compartida (equipo y cátedra): solo la web y las herramientas
    { "src": ["autogroup:shared"], "dst": ["notebook-expojuy"],
      "ip": ["tcp:443", "tcp:3001", "tcp:5050", "tcp:5679", "tcp:8082", "tcp:8083", "tcp:8404", "tcp:9090"] },
],
```

Se mantienen sin cambios las secciones `ssh` y `nodeAttrs` (esta última habilita Funnel). Lo que
no está en `grants` queda bloqueado. Funnel no pasa por la ACL: la web sigue siendo pública.

## 7. Disponibilidad y errores

- La aplicación está disponible mientras la notebook esté encendida, con Docker y Tailscale activos.
- Medición: panel de disponibilidad en Grafana con `up` (cada servicio medido) y `pg_up` (cada nodo de Postgres). Pendiente de agregar al dashboard.
- Errores: `docker logs <contenedor>` y las alertas de Prometheus (`/alerts`).
- Chequeo rápido: `infra/scripts/check-servicios.ps1`.

## 8. Riesgos y limitaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Una sola máquina | Si se apaga o se cuelga, todo cae | Arranque automático (`restart: unless-stopped`) y backups diarios |
| Dependencia de Tailscale | Sin el servicio de Tailscale no hay acceso externo | Alternativa documentable: Cloudflare Tunnel |
| `/api-docs` (Swagger) público | Expone la descripción de la API | Restringirlo en producción (punto 14) |
| `/admin/login` público | Ataques de fuerza bruta | Claves fuertes; limitar intentos (punto 14) |
| Webhooks de n8n públicos (`/webhook`) | Cualquiera puede disparar un flujo | Solo esa ruta por Funnel (el editor queda en la tailnet); cada flujo valida lo que recibe |
| Frontend en `0.0.0.0` | Accesible desde la red local | Pasarlo a `127.0.0.1` |
| Programas de Windows escuchando en todas las interfaces (SMB 445, PostgreSQL local 5432) | Alcanzables desde la red local y, sin ACL, desde la tailnet | ACL de la tailnet (6.1); detener el PostgreSQL local si no se usa |
| Ancho de banda doméstico | Rendimiento limitado | Aceptado para la demostración |

## 9. Evidencias

- [ ] Captura de `tailscale funnel status`.
- [ ] Acceso desde un celular con datos móviles (fuera de la red local) a la web y a `/api/health`.
- [ ] Captura de `tailscale serve status`.
- [ ] Acceso a una herramienta desde otro dispositivo de la tailnet, y rechazo desde fuera.
- [ ] Usuario compartido: abre una herramienta y no llega a un puerto fuera de la ACL (por ejemplo 445).
- [ ] `docker ps` mostrando los puertos en `127.0.0.1`.

## 10. Estado

| Ítem | Estado |
|---|---|
| Funnel `/` → `127.0.0.1:8080` | Verificado (13 al 15/11/2026) |
| `PUBLIC_URL` con https | Pendiente |
| Serve para las 6 herramientas ("tailnet only") | Verificado 15/11/2026 desde la notebook |
| Ajustes de Nextcloud y Mantis | Verificado 15/11/2026 |
| Acceso desde otro dispositivo de la tailnet y rechazo desde fuera | Pendiente |
| ACL de mínimo privilegio | Pendiente de aplicar y verificar con un usuario compartido |
| Página de accesos para el equipo (`ACCESOS.md`) | Hecho |
| Frontend en `127.0.0.1` | Pendiente |
| Panel de disponibilidad | Pendiente |
| n8n: editor por Serve (5679) y webhooks por Funnel (8443) | Verificado 16/11/2026 desde la notebook; falta desde fuera de la tailnet |
| Evidencia de acceso externo | Pendiente |
