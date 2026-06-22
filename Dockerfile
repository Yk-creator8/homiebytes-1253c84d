# ---- Build stage ----
FROM oven/bun:1.1 AS build
WORKDIR /app

# Install deps (cached layer)
COPY package.json bun.lockb* bunfig.toml* ./
RUN bun install --frozen-lockfile || bun install

# Copy source and build
COPY . .

# Build-time public env (Vite inlines these). Override at build:
#   docker build --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=... .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY=$VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY

RUN bun run build

# ---- Runtime stage (Node SSR server) ----
# TanStack Start builds a Nitro server. For self-hosting outside Cloudflare
# Workers, rebuild with the node-server preset (see DEPLOYMENT.md).
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
