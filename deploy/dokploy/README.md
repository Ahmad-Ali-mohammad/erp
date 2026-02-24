# Dokploy Deployment (Monorepo)

Your failure happened because Dokploy used `Nixpacks` on a monorepo root.
Use **Docker Compose** deployment instead.

## 1) In Dokploy

1. Create new application.
2. Source: `github.com/Ahmad-Ali-mohammad/erp.git`
3. Deployment type: **Docker Compose** (not Nixpacks).
4. Compose file path: `docker-compose.dokploy.yml`
5. Exposed service: `frontend`
6. Internal service port: `3000`

If you see `unknown instruction: services:` then Dokploy is treating the compose file as a Dockerfile.
Switch deployment type to **Docker Compose** (or create a Stack) and keep Dockerfile path empty.

## 2) Required Environment Variables

Set these in Dokploy app env:

- `DJANGO_SECRET_KEY` = strong random value
- `DJANGO_DEBUG` = `false`
- `DJANGO_ALLOWED_HOSTS` = your domain and app hostnames
- `DJANGO_CSRF_TRUSTED_ORIGINS` = `https://your-domain`
- `APP_MYSQL_DB` = `construction_erp`
- `APP_MYSQL_USER` = `erp`
- `APP_MYSQL_PASSWORD` = strong password
- `APP_MYSQL_ROOT_PASSWORD` = strong password
- `SEED_DEMO_DATA` = `true` (for demo login)
- `POSTING_V2_MODE` = `compat`
- `API_V1_READONLY` = `true`
- `NEXT_PUBLIC_API_BASE_URL` = `https://your-domain`

Optional:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## 3) Login

After successful deploy:

- Username: `admin`
- Password: `Admin@12345`

If login still fails, verify backend health inside Dokploy logs:

- `/api/v1/core/health/` should return status `ok`
