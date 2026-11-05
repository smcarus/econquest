# ==============================================================================
# EconQuest — Sovereign Council Orchestrator
# Multi-Stage Production Dockerfile (macOS Apple Silicon ARM64 & Windows AMD64)
# ==============================================================================

# Stage 1: Build Frontend Assets
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests first for optimal layer caching
COPY package.json package-lock.json* ./

# Install full dependencies required for Vite + TypeScript build
RUN npm install --legacy-peer-deps

# Copy application source
COPY . .

# Build production Vite frontend into /app/dist
RUN npm run build

# Stage 2: Production Runtime (Express + tsx + Static SPA)
FROM node:22-alpine AS runner

WORKDIR /app

# Install curl for container healthcheck and bash for helper scripts
RUN apk add --no-cache curl bash

ENV NODE_ENV=production
ENV SELF_HOSTED_DOCKER=true
ENV PORT=3000
ENV DEFAULT_AI_PROVIDER=ollama
ENV OLLAMA_BASE_URL=http://host.docker.internal:11434
ENV OLLAMA_QUICK_MODEL=qwen2.5:7b
ENV OLLAMA_DEEP_MODEL=qwen2.5:32b

# Copy package files and node_modules from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled frontend assets and server runtime files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/README.md ./README.md
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/metadata.json ./metadata.json

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health/full-sweep || exit 1

CMD ["npx", "tsx", "server.ts"]
