#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.prod ]]; then
  echo "Missing .env.prod in project root."
  echo "Copy deploy/prod/.env.vps.example to .env.prod and fill values."
  exit 1
fi

docker compose \
  --env-file .env.prod \
  -f docker-compose.base.yml \
  -f docker-compose.mysql.yml \
  -f deploy/prod/docker-compose.vps.yml \
  up -d --build backend db

docker compose \
  --env-file .env.prod \
  -f docker-compose.base.yml \
  -f docker-compose.mysql.yml \
  -f deploy/prod/docker-compose.vps.yml \
  ps
