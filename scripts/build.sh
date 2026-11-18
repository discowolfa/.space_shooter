#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
npm test
npm run build
test -s dist/index.html
test -s dist/sw.js
