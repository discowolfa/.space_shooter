#!/usr/bin/env bash
# Run on the target VPS only after its owner approves deployment.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${APP_URL:?Set APP_URL to the HTTPS origin}"
ROOT=/var/www/space-shooter
[[ -d dist && -s dist/index.html && -s dist/sw.js ]]
release="$ROOT/releases/$(date -u +%Y%m%dT%H%M%S)-$(git rev-parse --short HEAD)"
mkdir -p "$release"
cp -a dist/. "$release/"
old=$(readlink -f "$ROOT/current" || true)
ln -s "$release" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"
if ! curl --fail --silent --show-error --retry 3 "$APP_URL/" >/dev/null; then
  if [[ -n "$old" && -d "$old" ]]; then
    ln -s "$old" "$ROOT/current.rollback"
    mv -Tf "$ROOT/current.rollback" "$ROOT/current"
  fi
  echo 'Health check failed; previous release restored when available.' >&2
  exit 1
fi
if [[ -n "$old" && -d "$old" ]]; then
  ln -sfn "$old" "$ROOT/previous"
fi
echo "Published $release"
