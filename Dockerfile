# Production image, shared by the web app, the worker and the one-off migration job.
# (Dockerfile.dev is the separate development image.)
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* && corepack enable
# Fetch pnpm once at build time so containers never download it on start.
ENV COREPACK_HOME=/opt/corepack
RUN corepack prepare pnpm@10.34.4 --activate && chmod -R a+rX /opt/corepack
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY packages/widget/package.json packages/widget/
RUN pnpm install --frozen-lockfile

COPY apps apps
COPY packages packages
RUN pnpm --filter @momo/db generate && pnpm --filter @momo/web build

ENV NODE_ENV=production
ENV UPLOADS_DIR=/data/uploads
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "@momo/web", "start", "-H", "0.0.0.0"]
