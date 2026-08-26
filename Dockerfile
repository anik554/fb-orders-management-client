# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# --------------------------------------------------------------------- builder
FROM deps AS builder
WORKDIR /app

COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY src ./src

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, not read
# at runtime. Setting this in Railway's *variables* alone is not enough — it must
# be present for the build, which is why it is a build argument. Getting this
# wrong ships a bundle that calls http://localhost:3000 from the browser.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Fail loudly rather than shipping a bundle pointed at localhost.
RUN test -n "$NEXT_PUBLIC_API_URL" || (echo "NEXT_PUBLIC_API_URL build arg is required" && exit 1)

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --------------------------------------------------------------------- runtime
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
# Listen on every interface: the platform's proxy reaches the container from
# outside, and the Next default of localhost would refuse it.
ENV HOSTNAME=0.0.0.0

# The standalone bundle carries its own minimal node_modules, so nothing is
# installed here.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3001

CMD ["node", "server.js"]
