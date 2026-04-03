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
    
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/src ./src
    
    EXPOSE 3004
    
    CMD ["bun", "dist/index.js"]
