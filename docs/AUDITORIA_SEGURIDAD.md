# Auditoría de Seguridad Integral: ExpoJuy 2026

**Fecha de emisión:** 16 de Noviembre de 2026  
**Alcance:** Backend (Node.js/Express/Sequelize), Frontend (Angular 21/Nginx), Infraestructura Docker (`infra/`)  
**Metodología:** Framework `security-audit` (OWASP Top 10:2021, STRIDE Threat Modeling, CIS Docker Benchmarks)  
**Clasificación:** Confidencial / Auditoría Defensiva Técnica  

---

## 1. Resumen Ejecutivo

Durante la auditoría de seguridad del proyecto **ExpoJuy 2026**, se realizó una revisión de código estática y de arquitectura de configuración sobre los tres componentes del sistema: **Backend (API REST)**, **Frontend (SPA Angular)** e **Infraestructura (Docker Compose, HAProxy, Sentinel, DB Tools)**.

El sistema presenta una arquitectura sólida con buenas prácticas defensivas previas:
- Aislamiento de redes en Docker (`app`, `data`, `tools`).
- Exposición restringida de bases de datos e interfaces administrativas exclusivamente a la interfaz local de loopback (`127.0.0.1`).
- Pipeline de subida de imágenes seguro (`Sharp` + `Multer memoryStorage`), que descarta metadatos EXIF, fuerza conversión a formato `.webp` con UUID aleatorio y rechaza archivos SVG/HTML ejecutables.
- Consultas parametrizadas en Sequelize y escape estricto de HTML en plantillas de correo (`escapeHtml`).

Sin embargo, se identificaron **vulnerabilidades críticas y de severidad alta** que requieren atención inmediata antes del despliegue en entornos productivos o expuestos a Internet. La más destacada es un **Bypass de Autenticación Crítico (CVSS 9.8)** en un endpoint residual de verificación de usuario que permite obtener un token JWT con privilegios de administrador con solo enviar un correo electrónico en texto plano.

### Resumen de Hallazgos por Severidad

| Severidad | Cantidad | Descripción Principal |
| :--- | :---: | :--- |
| **CRÍTICA** | **1** | Bypass total de autenticación administrativa en `POST /api/usuarios/login-verificacion`. |
| **ALTA** | **3** | Política CORS permisiva con `credentials: true`; BOLA y endpoints de agenda sin autenticación; Desencadenador de failover de HA Sentinel sin control de acceso. |
| **MEDIA** | **4** | Exposición de contraseñas en logs de auditoría; almacenamiento de JWT en `localStorage`; ausencia de CSP en Nginx; endpoint de analítica del chatbot sin protección. |
| **BAJA / INFO** | **3** | Límite excesivo de body JSON (50 MB); secretos con entropía en `.env.example`; herencia de encabezados HTTP en Nginx `/uploads/`. |

---

## 2. Modelo de Amenazas (STRIDE)

| Amenaza (STRIDE) | Componente Afectado | Escenario Identificado |
| :--- | :--- | :--- |
| **Spoofing** (Suplantación) | `backend/src/controllers/usuario.controller.js` | Suplantación directa de la identidad de cualquier administrador mediante `loginVerificacion`. |
| **Tampering** (Alteración) | `backend/src/routes/asistenciaAgenda.route.js` | Modificación no autorizada del estado de asistencias de otros usuarios (`PATCH /:id/estado`). |
| **Repudiation** (Repudio) | `backend/src/middlewares/audit.middleware.js` | Inyección de cuerpos no sanitizados y registro de credenciales sensibles en tablas de auditoría. |
| **Information Disclosure** (Fuga de Información) | `frontend` & `backend` | Token JWT expuesto a XSS en `localStorage`; métricas internas expuestas en `/api/chatbot/analitica`. |
| **Denial of Service** (DoS) | `backend/index.js` & `infra/failover-manager` | Límite global de 50 MB en parser JSON; endpoint de simulación de failover accesible sin autenticación. |
| **Elevation of Privilege** (Escalamiento de Privilegios) | API Backend | Toma total de control de la aplicación y base de datos con rol `admin`. |

---

## 3. Hallazgos Detallados de Vulnerabilidad

```
[CRÍTICA] SEC-01: Bypass de Autenticación Administrativa en Endpoint Residual
```
- **Componente:** [usuario.controller.js](file:///backend/src/controllers/usuario.controller.js#L149-L191), [usuario.route.js](file:///backend/src/routes/usuario.route.js#L9)
- **Categoría OWASP:** A07:2021 – Identification and Authentication Failures / A01:2021 – Broken Access Control
- **Puntaje CVSS v3.1:** 9.8 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- **Descripción:**
  El endpoint `POST /api/usuarios/login-verificacion` recibe un payload `{ "correo": "..." }`. La función busca al usuario en la base de datos y, si existe, emite y retorna inmediatamente un token JWT válido por 6 horas con el rol correspondiente del usuario (incluyendo el rol `admin`), sin verificar contraseñas, claves OTP ni tokens temporales.
- **Evidencia en Código:**
  ```javascript
  // backend/src/controllers/usuario.controller.js:164-188
  const { correo } = req.body;
  const usuario = await Usuario.findOne({ where: { correo } });
  if (!usuario) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
  }
  const payload = {
      legajo: usuario.legajo,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol
  };
  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '6h' });
  res.json({ msg: 'Login exitoso', token, usuario: payload });
  ```
- **Impacto:**
  Un atacante externo puede enviar `{ "correo": "admin@expojuy.com" }` (correo conocido públicamente o documentado) y recibir instantáneamente un token de administrador con control absoluto sobre la creación, modificación y eliminación de stands, noticias, expositores y medios.
- **Remediación Inmediata:**
  Eliminar completamente la ruta `router.post('/login-verificacion', ...)` y su controlador si fue implementada para pruebas o depuración. Si se requiere inicio sin contraseña (magic link), debe generarse un token criptográfico de un solo uso con expiración corta (5-15 min) enviado exclusivamente por correo electrónico.

---

```
[ALTA] SEC-02: Configuración CORS Excesivamente Permisiva con `credentials: true`
```
- **Componente:** [index.js](file:///backend/index.js#L33-L44)
- **Categoría OWASP:** A05:2021 – Security Misconfiguration
- **Puntaje CVSS v3.1:** 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N)
- **Descripción:**
  La configuración de CORS en el backend tiene una rama condicional `else` que ejecuta `callback(null, true)`. Esto significa que cualquier origen HTTP/HTTPS es aceptado y reflejado en el encabezado `Access-Control-Allow-Origin`, al mismo tiempo que `credentials: true` está habilitado.
- **Evidencia en Código:**
  ```javascript
  // backend/index.js:33-40
  app.use(cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // <--- ERROR: Acepta cualquier origen externo
      }
    },
    credentials: true,
  ...
  ```
- **Impacto:**
  Cualquier sitio web malicioso en Internet puede efectuar peticiones asíncronas (`fetch` / `XMLHttpRequest`) hacia la API del usuario y leer las respuestas con credenciales contextuales.
- **Remediación:**
  Rechazar cualquier origen que no figure explícitamente en la lista blanca:
  ```javascript
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por directiva de CORS'), false);
    }
  }
  ```

---

```
[ALTA] SEC-03: Falla de Autorización a Nivel de Objeto (BOLA) en Módulo de Asistencia a Agenda
```
- **Componente:** [asistenciaAgenda.route.js](file:///backend/src/routes/asistenciaAgenda.route.js#L5-L8), [asistenciaAgenda.controller.js](file:///backend/src/controllers/asistenciaAgenda.controller.js#L74-L100)
- **Categoría OWASP:** A01:2021 – Broken Access Control
- **Puntaje CVSS v3.1:** 7.3 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:H/A:N)
- **Descripción:**
  Las operaciones del módulo de agenda carecen de middleware de autenticación (`verificarRole` o middleware de usuario autenticado):
  1. `PATCH /api/asistencias-agenda/:id/estado`: Un atacante puede alterar o cancelar el estado de inscripción de cualquier persona simplemente iterando el ID numérico.
  2. `POST /api/asistencias-agenda`: Se puede inscribir a cualquier usuario arbitrario (`usuario_id`) sin requerir consentimiento ni validación de identidad.
  3. `GET /api/asistencias-agenda/usuario/:usuarioId`: Permite listar de forma abierta el historial de asistencias de cualquier usuario o legajo.
- **Impacto:**
  Manipulación no autorizada de la asistencia del evento, cancelación maliciosa de inscripciones ajenas y enumeración de usuarios.
- **Remediación:**
  Exigir autenticación en todas las rutas mutativas y verificar que el `usuario_id` del token coincida con el registro solicitado o pertenezca a un administrador.

---

```
[ALTA] SEC-04: Endpoint de Disparo de Failover de Base de Datos sin Autenticación en Sentinel
```
- **Componente:** [failover-manager/index.js](file:///infra/failover-manager/index.js#L293-L299), [compose.cluster-ha.yaml](file:///infra/compose.cluster-ha.yaml#L140)
- **Categoría OWASP:** A01:2021 – Broken Access Control / Insecure Design
- **Puntaje CVSS v3.1:** 7.5 (CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:H)
- **Descripción:**
  El servidor HTTP del orquestador de alta disponibilidad (`Sentinel`, puerto 8008) expone el endpoint `POST /cluster/failover/simulate`. Dicho endpoint no requiere ningún token, clave API ni validación de cabecera.
- **Evidencia en Código:**
  ```javascript
  // infra/failover-manager/index.js:293-299
  if (req.url === '/cluster/failover/simulate' && req.method === 'POST') {
    log('Disparo de failover simulado solicitado vía API HTTP...');
    triggerFailover(clusterState.primaryNode);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Failover simulado iniciado' }));
    return;
  }
  ```
- **Impacto:**
  Cualquier proceso o atacante con acceso a la red local, al contenedor o mediante una vulnerabilidad SSRF puede inducir failovers repetitivos forzados, provocando inestabilidad en el clúster PostgreSQL y potenciales desincronizaciones de réplica (split-brain).
- **Remediación:**
  Proteger el endpoint mediante una clave secreta administrativa (ej. cabecera `X-HA-Sentinel-Key`), deshabilitar el endpoint de simulación en entornos de producción, o restringirlo a invocación manual por línea de comandos.

---

```
[MEDIA] SEC-05: Exposición de Contraseñas en Texto Plano en Logs de Auditoría
```
- **Componente:** [audit.middleware.js](file:///backend/src/middlewares/audit.middleware.js#L51-L68)
- **Categoría OWASP:** A09:2021 – Security Logging and Monitoring Failures
- **Puntaje CVSS v3.1:** 6.5 (CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:N/A:N)
- **Descripción:**
  El middleware de auditoría serializa la totalidad de `req.body` en la columna `detalles` de la tabla `auditoria_acciones`. Al registrar usuarios en `POST /api/usuarios/registro` (que utiliza `auditMiddleware('Usuarios')`), el payload JSON almacenado en la base de datos contiene la contraseña del usuario en texto plano antes de que se guarde con hash.
- **Evidencia en Código:**
  ```javascript
  // backend/src/middlewares/audit.middleware.js:52-56
  const detalles = JSON.stringify({
      url: req.originalUrl,
      body: req.body, // <--- Contiene body.password sin filtrar
      status: res.statusCode
  });
  ```
- **Impacto:**
  Cualquier administrador con lectura a la tabla de auditorías, o una fuga de respaldos de dicha tabla, expone las contraseñas originales de los usuarios y administradores creados.
- **Remediación:**
  Sanitizar `req.body` mediante una lista negra de campos sensibles (`password`, `contrasena`, `token`, `secret`) antes de serializarlo:
  ```javascript
  const sanitizedBody = { ...req.body };
  if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
  if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
  ```

---

```
[MEDIA] SEC-06: Persistencia de Token JWT en Almacenamiento Local (`localStorage`)
```
- **Componente:** [auth-storage.ts](file:///frontend/src/app/core/auth-storage.ts#L9-L13)
- **Categoría OWASP:** A07:2021 – Identification and Authentication Failures
- **Puntaje CVSS v3.1:** 5.4 (CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N)
- **Descripción:**
  El frontend Angular guarda el token JWT administrativo en `localStorage` bajo la clave `expojuy_admin_token`.
- **Impacto:**
  `localStorage` no cuenta con protección `HttpOnly`. Cualquier vulnerabilidad XSS en el frontend o librería de terceros comprometida puede exfiltrar el token de administración.
- **Remediación:**
  Implementar almacenamiento mediante Cookies `HttpOnly`, `Secure` y `SameSite=Strict/Lax`, o almacenar el token exclusivamente en memoria (Signals/State) si se cuenta con un mecanismo de refresco seguro.

---

```
[MEDIA] SEC-07: Ausencia de Cabecera Content-Security-Policy (CSP) en Nginx
```
- **Componente:** [default.conf.template](file:///frontend/docker/nginx/default.conf.template#L23-L27)
- **Categoría OWASP:** A05:2021 – Security Misconfiguration
- **Puntaje CVSS v3.1:** 5.3 (CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N)
- **Descripción:**
  El servidor Nginx implementa cabeceras `X-Content-Type-Options`, `X-Frame-Options` y `Permissions-Policy`, pero no define una política de seguridad de contenido (`Content-Security-Policy`).
- **Remediación:**
  Configurar una política CSP acorde a los recursos requeridos por Angular y Three.js:
  ```nginx
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' http://localhost:* https://*;" always;
  ```

---

```
[MEDIA] SEC-08: Exposición Pública de Métricas de Inteligencia de Negocio y Chatbot
```
- **Componente:** [chatbot.route.js](file:///backend/src/routes/chatbot.route.js#L11), [chatbot.controller.js](file:///backend/src/controllers/chatbot.controller.js#L303-L350)
- **Categoría OWASP:** A01:2021 – Broken Access Control
- **Puntaje CVSS v3.1:** 5.3 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)
- **Descripción:**
  `GET /api/chatbot/analitica` es completamente público y carece de autenticación y rate limiting. Devuelve el desglose completo de consultas de los usuarios, clasificaciones por intención y latencias.
- **Impacto:**
  Fuga de información analítica del evento y riesgo de denegación de servicio por consultas agregadas de base de datos (`COUNT`, `AVG`, `GROUP BY`) ejecutables sin límite.
- **Remediación:**
  Aplicar el middleware `verificarRole` a la ruta `GET /api/chatbot/analitica`.

---

```
[BAJA] SEC-09: Límite Global de Carga de Payload JSON Excesivo (50 MB)
```
- **Componente:** [index.js](file:///backend/index.js#L23-L24)
- **Categoría OWASP:** A05:2021 – Security Misconfiguration
- **Puntaje CVSS v3.1:** 4.3 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L)
- **Descripción:**
  `app.use(express.json({ limit: '50mb' }))` permite el envío de strings JSON gigantescos en rutas de autenticación y búsqueda. La carga de archivos multimedia ya está controlada de manera aislada por `Multer` con un límite seguro de 5 MB.
- **Remediación:**
  Reducir el límite global del parser JSON a `1mb` o `2mb`:
  ```javascript
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));
  ```

---

```
[BAJA] SEC-10: Secretos con Entropía en Plantilla `.env.example`
```
- **Componente:** [infra/.env.example](file:///infra/.env.example#L6-L43)
- **Categoría OWASP:** A07:2021 – Identification and Authentication Failures
- **Descripción:**
  Variables como `POSTGRES_PASSWORD`, `PGADMIN_PASSWORD` y `ADMIN_INITIAL_PASSWORD` contienen cadenas alfanuméricas con formato de contraseñas ya generadas (ej. `G7Fw6Q2JDATv9N8sk0fmMxgia4XjRBIE`).
- **Remediación:**
  Reemplazar estas claves por marcadores genéricos (ej. `cambiar_por_clave_segura`) para evitar que un despliegue inadvertido utilice contraseñas publicadas en el repositorio.

---

```
[INFO] SEC-11: Sobrescritura de Encabezados de Seguridad en Bloque Nginx `/uploads/`
```
- **Componente:** [default.conf.template](file:///frontend/docker/nginx/default.conf.template#L44-L49)
- **Descripción:**
  En Nginx, definir una directiva `add_header` en un bloque `location` hijo anula los `add_header` del nivel `server`. En `location /uploads/`, al declararse `add_header Cache-Control "public";`, se desactivan los encabezados `X-Content-Type-Options` y `X-Frame-Options` para esa ruta específica.
- **Remediación:**
  Reiterar las cabeceras de seguridad requeridas o agruparlas mediante un archivo `security-headers.conf` incluido con `include`.

---

## 4. Matriz de Cumplimiento OWASP Top 10 (2021)

| Control OWASP | Estado | Observación |
| :--- | :---: | :--- |
| **A01: Broken Access Control** | ⚠️ Fallo parcial | Bypass en `login-verificacion`; falta de autorización en `/asistencias-agenda` y `/analitica`. |
| **A02: Cryptographic Failures** |  Aprobado | `bcryptjs` con 10 rondas de salt; `JWT_SECRET` validado con mínimo de 32 caracteres al iniciar. |
| **A03: Injection** |  Aprobado | ORM Sequelize parametrizado; sin consultas dinámicas concatenadas vulnerables. |
| **A04: Insecure Design** | ⚠️ Fallo parcial | Falta de rate limit en creación de reseñas y telemetría de visitas. |
| **A05: Security Misconfiguration** | ⚠️ Fallo parcial | CORS laxo en producción; falta de CSP en Nginx; payload parser de 50 MB. |
| **A06: Vulnerable & Outdated Components** |  Aprobado | Node 22 Alpine, Angular 21, dependencias fijadas y verificadas sin vulnerabilidades directas graves. |
| **A07: Identification & Auth Failures** | ❌ Crítico | Endpoint `login-verificacion` sin validación de credenciales. |
| **A08: Software & Data Integrity Failures** |  Aprobado | Manejo estricto de uploads mediante Sharp con generación de UUID y forzado a WebP. |
| **A09: Security Logging & Monitoring** | ⚠️ Fallo parcial | Registro de passwords en tabla de auditoría; sentinel con simulación desprotegida. |
| **A10: Server-Side Request Forgery (SSRF)** |  Aprobado | La aplicación no realiza peticiones salientes basadas en URLs provistas por el usuario. |

---

## 5. Plan de Mitigación y Endurecimiento (Roadmap)

### Fase 1: Remediación Inmediata (Prioridad Crítica)
1. **Eliminar `login-verificacion`:**
   - Retirar la ruta en `backend/src/routes/usuario.route.js`.
   - Eliminar el método `usuarioCtrl.loginVerificacion` en `backend/src/controllers/usuario.controller.js`.
2. **Corregir CORS en `backend/index.js`:**
   - Rechazar orígenes no autorizados en lugar de retornar `callback(null, true)`.
3. **Ofuscar Contraseñas en Auditoría:**
   - Redactar `req.body.password` en `backend/src/middlewares/audit.middleware.js` antes de persistir.

### Fase 2: Correcciones Estructurales (Semana 1)
1. **Proteger Rutas de Asistencia a Agenda:**
   - Añadir middleware de autenticación a `asistenciaAgenda.route.js` y asociar las inscripciones a `req.usuario.legajo`.
2. **Asegurar Endpoint Sentinel:**
   - Exigir clave precompartida para `POST /cluster/failover/simulate` o restringir el endpoint a depuración local.
3. **Limitar Parsers y Añadir Rate Limiting:**
   - Ajustar `express.json({ limit: '2mb' })`.
   - Incorporar `publicPostLimiter` a `resenaStand.route.js` y `visitaStand.route.js`.

### Fase 3: Endurecimiento Perimetral y Frontend (Semana 2)
1. **Cabeceras de Seguridad Nginx:**
   - Agregar política CSP completa y corregir herencia en `/uploads/`.
2. **Saneamiento de `.env.example`:**
   - Reemplazar valores con aspecto de clave real por placeholders claros.
3. **Auditoría Periódica:**
   - Incorporar chequeo estático automatizado en pipeline CI/CD (`npm audit` y linter de seguridad).

---
*Reporte generado por el Asistente de IA bajo la directiva de la skill security-audit.*
