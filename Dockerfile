# ===========================================
# BOYA — Production Dockerfile
# ===========================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN apk add --no-cache curl

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps --omit=dev && \
    npm install tsx --legacy-peer-deps --legacy-peer-deps --legacy-peer-deps --no-save

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public

RUN mkdir -p /app/uploads /app/public/uploads

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=25s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

CMD ["npx", "tsx", "server.ts"]
