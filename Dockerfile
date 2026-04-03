# ---- Stage 1: Build ----
FROM oven/bun:1.2.23-slim AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# ---- Stage 2: Production ----
FROM oven/bun:1.2.23-slim AS production

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/auth-schema.ts ./auth-schema.ts

EXPOSE 5001

CMD ["bun", "run", "start:prod"]
