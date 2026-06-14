# =============================================================
# DOCKERFILE — FRONTEND NEXT.JS
# =============================================================

# -----------------------------------------------------------
# STAGE 1 — builder
# -----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install && npm ci --prefer-offline

COPY . .

# --- Variables NEXT_PUBLIC_* : baked au build ---
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_VEHICLE_API_BASE_URL
ARG NEXT_PUBLIC_OSM_BASE_URL
ARG NEXT_PUBLIC_COMPLIANCE_URL

RUN printf "NEXT_PUBLIC_API_BASE_URL=%s\n\
NEXT_PUBLIC_VEHICLE_API_BASE_URL=%s\n\
NEXT_PUBLIC_OSM_BASE_URL=%s\n\
NEXT_PUBLIC_COMPLIANCE_URL=%s\n" \
  "$NEXT_PUBLIC_API_BASE_URL" \
  "$NEXT_PUBLIC_VEHICLE_API_BASE_URL" \
  "$NEXT_PUBLIC_OSM_BASE_URL" \
  "$NEXT_PUBLIC_COMPLIANCE_URL" \
  > .env

RUN npm run build

# -----------------------------------------------------------
# STAGE 2 — runner
# Seul .next/standalone est copié → image finale légère
# -----------------------------------------------------------
FROM node:20-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone contient le serveur Node minimal
COPY --from=builder /app/.next/standalone ./
# Fichiers statiques publics (images, fonts, etc.)
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

#HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=20s \
#  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
