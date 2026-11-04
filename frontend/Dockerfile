# ---------- Etapa 1: build de Angular ----------
FROM node:22.23.4-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ARG NG_CONFIGURATION=production,docker
RUN npx ng build --configuration ${NG_CONFIGURATION}

# ---------- Etapa 2: Nginx sin root ----------
FROM nginxinc/nginx-unprivileged:1.30.6-alpine AS runtime

ENV BACKEND_URL=http://backend:3000 \
    NGINX_ENVSUBST_FILTER=^BACKEND_

COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/expojuy_2026/browser /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
