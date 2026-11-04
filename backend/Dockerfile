FROM node:22.23.4-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .
# uploads/ se monta como volumen; debe pertenecer al usuario sin privilegios.
RUN mkdir -p uploads && chown node:node uploads

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "index.js"]
