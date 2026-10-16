#!/usr/bin/env bash
# Build and push the production image to Docker Hub as :<version> and :latest (linux/amd64).
# Usage: scripts/publish-docker.sh [version]   (defaults to version in package.json)
# Normally called by scripts/release.sh. Requires `docker login` as moaljumaa.
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE="${IMAGE:-moaljumaa/momo}"
VERSION="${1:-$(node -p "require('./package.json').version")}"

[ -z "$(git status --porcelain)" ] || { echo "Working tree not clean, commit first." >&2; exit 1; }

docker buildx build --platform linux/amd64 \
  -t "$IMAGE:$VERSION" -t "$IMAGE:latest" \
  --label "org.opencontainers.image.version=$VERSION" \
  --label "org.opencontainers.image.revision=$(git rev-parse HEAD)" \
  --label "org.opencontainers.image.source=https://github.com/moaljumaa/momo" \
  --push .

echo "Published $IMAGE:$VERSION and $IMAGE:latest"
