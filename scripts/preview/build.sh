#!/usr/bin/env bash
# Build the Jekyll site in Docker and serve it locally for preview/screenshots.
set -euo pipefail
cd "$(dirname "$0")/../../"

OUT_DIR=".preview-site"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo ">> Building Jekyll site in Docker..."
docker run --rm \
  -v "$PWD:/site" \
  -w /site \
  -e JEKYLL_ENV=production \
  jekyll/jekyll:4.4.1 \
  bash -c "bundle install >/dev/null 2>&1; bundle exec jekyll build --destination $OUT_DIR 2>&1 | tail -3"

echo ">> Build complete. Output in $OUT_DIR"
