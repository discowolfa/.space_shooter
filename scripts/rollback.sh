#!/usr/bin/env bash
set -euo pipefail
ROOT=/var/www/space-shooter
previous=$(readlink -f "$ROOT/previous")
[[ "$previous" == "$ROOT/releases/"* && -s "$previous/index.html" ]]
ln -s "$previous" "$ROOT/current.rollback"
mv -Tf "$ROOT/current.rollback" "$ROOT/current"
echo "Restored $previous"
