#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.demo.domain ]]; then
  echo "Missing .env.demo.domain in project root."
  exit 1
fi

docker compose \
  --env-file .env.demo.domain \
  -f docker-compose.base.yml \
  -f docker-compose.mysql.yml \
  -f deploy/demo-domain/docker-compose.demo-domain.yml \
  down
