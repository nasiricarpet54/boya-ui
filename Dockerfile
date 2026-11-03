# --- Stage 1: Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (leveraging Docker layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code and config files
COPY . .

# Build frontend and compile typescript
RUN npm run build

# --- Stage 2: Production Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm install tsx --no-save

# Copy built artifacts and server files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src

# Create uploads directory for persistent storage volume
RUN mkdir -p /app/uploads public/uploads

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
