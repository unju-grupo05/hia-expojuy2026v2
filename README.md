# ExpoJuy 2026

Web de la ExpoJuy 2026 y su infraestructura completa, desarrollada como Práctica Integradora Final.

| Carpeta | Contenido |
|---|---|
| `frontend/` | App Angular 21 |
| `backend/` | API Node.js + Express (pendiente de incorporar) |
| `infra/` | Docker Compose del entorno |
| `docs/` | Plan de trabajo, consigna y contexto del proyecto |

## Levantar el entorno

Requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
cd infra
cp .env.example .env    # completar las contraseñas
docker compose up -d
```

| Servicio | URL |
|---|---|
| Web | http://localhost:8080 |
| pgAdmin | http://localhost:5050 (servidor: host `postgres`, puerto `5432`) |
| PostgreSQL desde la PC | `localhost:5433` |

## Cómo contribuir

1. Crear una rama desde `develop`: `feature/...`, `fix/...` o `docs/...`.
2. Commits con formato `tipo(ámbito): descripción`, por ejemplo `feat(infra): agregar grafana`.
3. Abrir un Pull Request contra `develop` con un compañero como revisor.
4. Nunca subir `.env`, contraseñas, tokens ni dumps de la base.

Contexto completo, decisiones y reglas para agregar servicios: [`docs/CONTEXTO_PROYECTO.md`](docs/CONTEXTO_PROYECTO.md).
