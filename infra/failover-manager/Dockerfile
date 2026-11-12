# =============================================================================
# ExpoJuy 2026 - Sentinel & Auto-Failover Manager
# Imagen dedicada: instala las dependencias (pg) con npm ci para que el
# contenedor arranque sin depender de un node_modules montado desde el host.
# =============================================================================
FROM node:22.23.4-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.js ./

USER node

CMD ["node", "index.js"]
