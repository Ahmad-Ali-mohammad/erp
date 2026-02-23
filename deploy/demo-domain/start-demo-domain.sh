#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.demo.domain ]]; then
  echo "Missing .env.demo.domain in project root."
  echo "Copy deploy/demo-domain/.env.demo.domain.example to .env.demo.domain and fill values."
  exit 1
fi

docker compose \
  --env-file .env.demo.domain \
  -f docker-compose.base.yml \
  -f docker-compose.mysql.yml \
  -f deploy/demo-domain/docker-compose.demo-domain.yml \
  up -d --build backend db frontend

echo "Demo is running behind nginx on https://demo.example.com"
echo "Demo login: admin / Admin@12345"
