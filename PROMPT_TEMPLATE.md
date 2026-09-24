# 📋 Plantilla Detallada para Integración de Módulos (Frontend + Backend + CMS)

Copia todo el bloque de texto que está dentro del recuadro `text` a continuación y úsalo cada vez que abras una nueva conversación con la IA para conectar un módulo tanto en el **sitio público** como en tu **Panel CMS / Admin**.

---

```text
Actúa como un desarrollador Fullstack Senior experto en Angular 17+ (Standalone Components, RxJS, Reactive Forms) y Node.js / Express con Sequelize.

Necesito conectar un módulo del sistema (sitio público + panel CMS de administración) con su respectiva API en el Backend.

======================================================================
1. CONTEXTO DEL MÓDULO Y ENDPOINTS
======================================================================
- Nombre del módulo: [ESCRIBE AQUÍ EL MÓDULO. Ej: Expositores / Agenda / Noticias]
- Endpoints en el Backend:
  * GET (Listar público): [ej: GET http://localhost:3000/api/expositores]
  * GET (Obtener por ID): [ej: GET http://localhost:3000/api/expositores/:id]
  * POST (Crear desde CMS): [ej: POST http://localhost:3000/api/expositores]
  * PUT (Editar desde CMS): [ej: PUT http://localhost:3000/api/expositores/:id]
  * DELETE (Eliminar desde CMS): [ej: DELETE http://localhost:3000/api/expositores/:id]
- Formato de respuesta estándar de la API:
  {
    "success": true,
    "data": [ ... ],
    "message": "..."
  }

======================================================================
2. CÓDIGO ACTUAL DEL FRONTEND (SITIO PÚBLICO)
======================================================================

--- A. Servicio Angular (`api-[modulo].service.ts`) ---
Ubicación: src/app/services/

// [PEGA AQUÍ EL CÓDIGO DE TU SERVICIO ANGULAR]


--- B. Componente Vista Pública (`[modulo].component.ts`) ---
Ubicación: src/app/components/[modulo]/

// [PEGA AQUÍ EL CÓDIGO DEL COMPONENTE PÚBLICO .TS]


--- C. Plantilla Vista Pública (`[modulo].component.html`) ---
Ubicación: src/app/components/[modulo]/

<!-- [PEGA AQUÍ LA PLANTILLA PÚBLICA .HTML] -->


======================================================================
3. CÓDIGO ACTUAL DEL PANEL CMS / ADMIN
======================================================================

--- A. Componente Formulario / Tabla CMS (`admin-[modulo].component.ts`) ---
Ubicación: src/app/admin/components/ (o donde esté tu CMS)

// [PEGA AQUÍ EL CÓDIGO DE TU COMPONENTE CMS DE ADMINISTRACIÓN .TS]


--- B. Plantilla Formulario / Tabla CMS (`admin-[modulo].component.html`) ---
Ubicación: src/app/admin/components/

<!-- [PEGA AQUÍ EL HTML DE TU TABLA / FORMULARIO DEL CMS] -->


======================================================================
4. REFERENCIA DEL BACKEND (MODELO / CONTROLADOR)
======================================================================
Ubicación: src/models/[modulo].model.js (o controlador de Express)

// [PEGA AQUÍ TU MODELO SEQUELIZE O CONTROLADOR DE EXPRESS]


======================================================================
5. REQUERIMIENTOS Y SOLICITUD DE CÓDIGO
======================================================================
Por favor, genera la solución completa y actualizada cubriendo tanto la parte PÚBLICA como la ADMINISTRACIÓN EN EL CMS:

1. Servicio Angular:
   - Implementa/completa todos los métodos CRUD: `get()`, `getById()`, `create()`, `update()`, `delete()`.
   - Incluye el envío de tokens de autenticación/headers si el CMS lo requiere.

2. Vista Pública (.ts y .html):
   - Suscripción limpia, manejo de estados de carga (`loading`) y pintado mediante `@for`, `@if`, `@empty`.

3. Panel CMS / Admin (.ts y .html):
   - Conecta el formulario (Reactive Forms o Template Driven) con la API para CREAR y EDITAR registros.
   - Conecta la tabla o listado de administración para ELIMINAR con confirmación y refrescar la lista.
   - Asegura la gestión adecuada de notificaciones/alertas de éxito o error al guardar.

4. Mapeo de Atributos:
   - Valida que todos los nombres de las propiedades (`nombre`, `descripcion`, `icono`, `orden`, `id`, etc.) coincidan de forma idéntica con el modelo de Sequelize.