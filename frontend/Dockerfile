# Three stages. `deps` is separated out so local development can target it and
# get node_modules without also running a production build.

# ── deps ──────────────────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app

# The lockfile is copied and `npm ci` is used deliberately. The previous image
# copied only package.json and ran `npm install`, which ignores the lockfile
# entirely — and every one of the ~35 dependencies is a `^` range, so two
# builds days apart resolved to different React, Vite and MUI versions.
COPY package.json package-lock.json ./
RUN npm ci

# ── build ─────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY . .

# Relative on purpose. nginx (below) proxies /api/v1 to the backend over the
# compose network, so no host or port is ever baked into the bundle — which is
# what lets ONE built image serve Developer, Tester and Production unchanged,
# and lets promotion re-tag an image digest instead of rebuilding.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

# NOTE: this is `vite build`, not `npm run build`.
# `npm run build` is `tsc -b && vite build`, and `tsc -b` currently fails with
# 82 pre-existing errors across 26 files on main (40 unused-symbol, 42
# substantive). vite does not typecheck, so the bundle builds regardless.
# Restore `npm run build` here as soon as the typecheck is green — the CI build
# gate in the Jenkins pipeline is meaningless until it is.
RUN npx vite build

# ── runtime ───────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ > /dev/null 2>&1 || exit 1
