# Plan de Integración Backend ↔ Frontend (ExpoJuy 2026)

Para garantizar un desarrollo limpio, fácil de depurar y mantener un historial de control de versiones ordenado en Git, la integración entre **Angular 17+** y el backend en **Node.js / Express / Sequelize** se realizará **por partes utilizando Feature Branches**.

---

## 📌 Estrategia de Ramas en Git

No se conectará todo el proyecto en un solo commit. Se creará una rama por cada módulo/sección independiente del sistema:

| Módulo                    | Nombre de la Rama                         | Estado       |
| :------------------------ | :---------------------------------------- | :----------- |
| **Ejes Estratégicos**     | `feature/integracion-ejes`                | 🟡 Pendiente |
| **Expositores & Stands**  | `feature/integracion-expositores`         | 🟡 Pendiente |
| **Agenda & Conferencias** | `feature/integracion-agenda`              | 🟡 Pendiente |
| **Novedades & Noticias**  | `feature/integracion-novedades`           | 🟡 Pendiente |
| **Galería Multimedia**    | `feature/integracion-galeria`             | 🟡 Pendiente |
| **Acreditaciones & Auth** | `feature/integracion-auth-acreditaciones` | 🟡 Pendiente |

---

## 🛠️ Flujo de Trabajo por Rama

1. **Crear y cambiar a la rama correspondiente:**
   ```bash
   git checkout -b feature/integracion-[nombre-modulo]
   ```
