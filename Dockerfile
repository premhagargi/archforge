# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Compile custom server so we can run it with plain node
RUN npx tsc server.ts --outDir . --module commonjs --esModuleInterop --resolveJsonModule --skipLibCheck 2>/dev/null || \
    npx tsx build server.ts 2>/dev/null || true

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/public         ./public
COPY --from=builder /app/.next          ./.next
COPY --from=builder /app/node_modules   ./node_modules
COPY --from=builder /app/package.json   ./package.json
COPY --from=builder /app/server.ts      ./server.ts
COPY --from=builder /app/lib/server     ./lib/server
COPY --from=builder /app/tsconfig.json  ./tsconfig.json

# Data directory for file-based diagram store
RUN mkdir -p .data/diagrams && chown -R nextjs:nodejs .data

USER nextjs
EXPOSE 3000

# tsx is installed as a dependency; use it to run server.ts directly.
# For a leaner prod image, pre-compile server.ts in the builder stage instead.
CMD ["npx", "tsx", "server.ts"]
