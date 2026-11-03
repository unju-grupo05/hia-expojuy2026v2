# Instrucciones para asistentes de IA

Antes de proponer cambios, leer `docs/CONTEXTO_PROYECTO.md`: estado real del repo, decisiones
tomadas, convenciones y reglas para agregar servicios a `infra/`. Si contradice a
`docs/PLAN_TRABAJO_INTEGRADOR_EXPOJUY_2026.md`, vale `CONTEXTO_PROYECTO.md`.

Reglas que no se negocian:

- Monorepo: `frontend/` (Angular 21), `backend/` (Node + Express), `infra/` (Docker Compose).
  Los comandos de Git se ejecutan desde la raíz del repo.
- Nunca escribir secretos en archivos versionados. Toda variable nueva va a `infra/.env.example`
  con un valor de ejemplo.
- No exponer Postgres, pgAdmin ni interfaces administrativas fuera de `127.0.0.1`.
- No redefinir las redes `app` y `data` ni cambiar puertos existentes (5433, 5050, 8080) sin coordinarlo.
- Imágenes Docker con versión fija, nunca `latest`.
- Ramas desde `develop` (`feature/*`, `fix/*`, `docs/*`), commits `tipo(ámbito): descripción`
  en español, integración solo por Pull Request.
- Para código Angular, seguir además `.gemini/GEMINI.md`.
