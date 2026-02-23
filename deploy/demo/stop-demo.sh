#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.demo ]]; then
  echo "Missing .env.demo in project root."
  exit 1
fi

docker compose \
  --env-file .env.demo \
  -f docker-compose.base.yml \
  -f docker-compose.mysql.yml \
  -f deploy/demo/docker-compose.demo.yml \
  down
