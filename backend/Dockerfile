# ==============================================================
# Nivesh Backend — Multi-stage Production Dockerfile
# ==============================================================
# Stage 1: Install dependencies
# Stage 2: Build TypeScript → JavaScript
# Stage 3: Lean production image
# ==============================================================

# ---- Stage 1: Dependencies ----
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy only package manifests for layer caching
COPY package.json pnpm-lock.yaml ./
COPY prisma/schema.prisma ./prisma/schema.prisma

# Install all deps (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile

# Generate Prisma client for the target (linux-musl for alpine)
RUN pnpm prisma generate

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Re-use node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy source code
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/

# Build NestJS application
RUN pnpm run build

# Prune devDependencies after build
RUN pnpm prune --prod

# ---- Stage 3: Production ----
FROM node:20-alpine AS production

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init wget

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only what is needed at runtime
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma

USER appuser

EXPOSE 3000

# Health check pointing to the deep health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
