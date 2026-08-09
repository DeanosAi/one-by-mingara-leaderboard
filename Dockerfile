FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_BASE_PATH=/one-leaderboard/
RUN npm run build -- --base=${VITE_BASE_PATH}

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4173

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 4173
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:4173/api/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"]

CMD ["node", "server/index.js"]
