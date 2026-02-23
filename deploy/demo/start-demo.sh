#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.demo ]]; then
  echo "Missing .env.demo in project root."
  echo "Copy deploy/demo/.env.demo.example to .env.demo and fill placeholders."
  exit 1
fi

docker compose \
  --env-file .env.demo \
  -f docker-compose.base.yml \
  -f docker-compose.mysql.yml \
  -f deploy/demo/docker-compose.demo.yml \
  up -d --build

echo "Demo URLs:"
echo "- Frontend: http://<VPS_IP>:3000/login"
echo "- Backend Health: http://<VPS_IP>:8000/api/v1/core/health/"
echo "- phpMyAdmin: http://<VPS_IP>:8080"
echo "Demo login: admin / Admin@12345"
