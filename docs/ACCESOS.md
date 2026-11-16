# Accesos ExpoJuy 2026

Cómo entrar a la aplicación y a las herramientas del proyecto. Detalle técnico (Funnel, Serve,
ACL, riesgos): [`PUBLICACION_ACCESO.md`](PUBLICACION_ACCESO.md).

## 1. Aplicación (pública)

Abre desde cualquier navegador, sin instalar nada:

- **Web:** https://ignacio-lenovo.taildd07d8.ts.net
- **Estado de la API:** https://ignacio-lenovo.taildd07d8.ts.net/api/health

## 2. Herramientas (solo con Tailscale)

Las herramientas administrativas no son públicas: solo abren desde dispositivos con Tailscale
y con acceso compartido a la notebook del proyecto.

### Preparación (una sola vez por dispositivo)

1. Instalar Tailscale en el dispositivo desde el que se va a entrar:
   - PC: https://tailscale.com/download
   - Android: Play Store → "Tailscale"
   - iPhone: App Store → "Tailscale"
2. Iniciar sesión con una cuenta propia (Google, GitHub o Microsoft).
3. Abrir el enlace de invitación (*Share*) que envía el Integrante 1 por privado y tocar **Accept**.
4. Dejar Tailscale **conectado** mientras se usan las herramientas.

### Links

| Herramienta | Link | Para qué |
|---|---|---|
| Mantis | https://ignacio-lenovo.taildd07d8.ts.net:8082 | Incidencias |
| Nextcloud | https://ignacio-lenovo.taildd07d8.ts.net:8083 | Documentación y evidencias |
| Grafana | https://ignacio-lenovo.taildd07d8.ts.net:3001 | Dashboard de monitoreo |
| Prometheus | https://ignacio-lenovo.taildd07d8.ts.net:9090 | Métricas y alertas |
| pgAdmin | https://ignacio-lenovo.taildd07d8.ts.net:5050 | Administración de la base |
| HAProxy | https://ignacio-lenovo.taildd07d8.ts.net:8404/stats | Estado del clúster de base de datos |

Usuarios y claves: se piden por privado al Integrante 1. No se publican en el repositorio.

## 3. Si no abre

| Síntoma | Causa probable |
|---|---|
| La web no abre | La notebook del proyecto está apagada o sin Internet |
| Las herramientas no abren | Tailscale desconectado, o la invitación sin aceptar (la notebook tiene que aparecer en la lista de dispositivos de Tailscale) |
| Nextcloud: "dominio no confiable" | Se entró con otra dirección: usar exactamente el link de la tabla |
