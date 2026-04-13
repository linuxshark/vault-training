# syntax=docker/dockerfile:1.6
ARG NODE_VERSION=20

# --- deps ---
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# --- builder ---
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/data /app/content/_index && \
    npx prisma generate && \
    DATABASE_URL="file:/app/data/build.db" npm run build && \
    rm -f /app/data/build.db

# --- runner ---
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app
RUN apk add --no-cache wget openssl

COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=app:app /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=app:app /app/node_modules ./node_modules

USER app
EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma db push && node server.js"]
