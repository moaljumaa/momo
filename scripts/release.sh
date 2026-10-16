#!/usr/bin/env bash
# Cut a new release: bump version, commit, tag, push to GitHub, then publish the Docker image.
# Usage: scripts/release.sh [patch|minor|major]   (default: patch)
# Every run produces a new version; the next version is derived from the latest v* git tag
# (first ever release is 0.1.0). Nothing is published if the tree is dirty or not on main.
set -euo pipefail
cd "$(dirname "$0")/.."

BUMP="${1:-patch}"
[ "$(git branch --show-current)" = main ] || { echo "Must be on main." >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Working tree not clean." >&2; exit 1; }

# Internal files must never reach the public repo.
if git ls-files | grep -E '^(\.claude|docs|design|ee)/|^(CLAUDE|PROJECT)\.md$' >/dev/null; then
  echo "Internal files are tracked, aborting." >&2; exit 1
fi

git fetch --tags -q
LAST="$(git tag -l 'v*' --sort=-v:refname | head -1)"
if [ -z "$LAST" ]; then
  VERSION=0.1.0
else
  VERSION="$(node -e "
    const [a,b,c]='${LAST#v}'.split('.').map(Number);
    const n={major:[a+1,0,0],minor:[a,b+1,0],patch:[a,b,c+1]}['$BUMP'];
    if(!n){process.exit(1)} console.log(n.join('.'))")"
fi

node -e "
  const fs=require('fs'),p=JSON.parse(fs.readFileSync('package.json'));
  p.version='$VERSION'; fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
git add package.json
git commit -qm "Release v$VERSION"
git tag "v$VERSION"
git push origin main "v$VERSION"

scripts/publish-docker.sh "$VERSION"
echo "Released v$VERSION"
