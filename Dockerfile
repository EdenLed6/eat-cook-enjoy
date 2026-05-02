FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json drizzle.config.ts ./
COPY apps/whatsapp-worker/package.json ./apps/whatsapp-worker/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/nutrition/package.json ./packages/nutrition/
COPY packages/vision/package.json ./packages/vision/
COPY packages/agent-core/package.json ./packages/agent-core/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile=false

FROM base AS build
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @eat/shared build \
 && pnpm --filter @eat/db build \
 && pnpm --filter @eat/nutrition build \
 && pnpm --filter @eat/vision build \
 && pnpm --filter @eat/agent-core build \
 && pnpm --filter @eat/whatsapp-worker build \
 && pnpm --filter @eat/web build

FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl tini && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app

EXPOSE 3000 8080
ENTRYPOINT ["/usr/bin/tini", "--"]
