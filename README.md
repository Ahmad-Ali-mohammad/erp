# Construction ERP (Starter Implementation)

This repository now includes a practical starter implementation for a construction-focused ERP platform.

## What is implemented

- Backend (`Django + DRF + JWT + OpenAPI`):
  - `core`: roles, users, audit logs, health endpoint
  - `projects`: projects, phases, BoQ items
  - `finance`: chart of accounts, journal entries (balanced validation), invoices, payments, approval actions
  - `procurement`: suppliers, materials, purchase requests/orders, stock transactions, PR approvals, PO send/receive/cancel workflow
  - role-aware action permission matrix + row-level data scope for project/finance/procurement records
- Frontend (`Next.js`):
  - Initial dashboard shell connected to backend health endpoint
- DevOps:
  - `docker-compose.base.yml` + mode overrides for PostgreSQL, MySQL (+ phpMyAdmin), and SQLite
  - compatibility `docker-compose.yml` for PostgreSQL default mode
  - Dockerfiles for backend and frontend
  - PowerShell operations scripts in `scripts/`
  - `.env.example` and backend requirements

## API base paths

- Core: `/api/v1/core/`
- Projects: `/api/v1/projects/`
- Finance: `/api/v1/finance/`
- Procurement: `/api/v1/procurement/`
- JWT: `/api/auth/token/` and `/api/auth/token/refresh/`
- Docs: `/api/docs/` and `/api/schema/`

## Run modes

### Recommended mode (Docker)

```bash
.\scripts\start.ps1 -Mode docker-postgres
```

```bash
.\scripts\start.ps1 -Mode docker-mysql
```

```bash
.\scripts\start.ps1 -Mode docker-sqlite
```

Stop and cleanup:

```bash
.\scripts\stop.ps1 -Mode all -RemoveVolumes
```

Status and logs:

```bash
.\scripts\status.ps1
.\scripts\logs.ps1 -Mode docker-postgres -Service backend -Follow
```

### Direct docker compose commands

PostgreSQL mode:

```bash
docker compose --env-file .env.docker.postgres -f docker-compose.base.yml -f docker-compose.postgres.yml up -d --build
```

MySQL + phpMyAdmin mode:

```bash
docker compose --env-file .env.docker.mysql -f docker-compose.base.yml -f docker-compose.mysql.yml up -d --build
```

SQLite mode:

```bash
docker compose --env-file .env.docker.sqlite -f docker-compose.base.yml -f docker-compose.sqlite.yml up -d --build
```

### Optional local backend-only run

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r backend/requirements.txt
copy .env.example .env
.venv/Scripts/python backend/manage.py migrate
.venv/Scripts/python backend/manage.py seed_demo_data
.venv/Scripts/python backend/manage.py runserver
```

Note: local `frontend` run can fail on some Windows environments with `next dev -> spawn EPERM`. Use Docker mode for frontend.

## Environment files

- `.env.docker.postgres`:
  - Uses `db` service and PostgreSQL storage.
  - Sets `NEXT_PUBLIC_API_BASE_URL=http://backend:8000`.
- `.env.docker.mysql`:
  - Uses `db` service with MySQL 8 and enables `phpmyadmin` service.
  - Sets backend DB mode to MySQL and exposes phpMyAdmin at `http://localhost:8080`.
  - Sets `NEXT_PUBLIC_API_BASE_URL=http://backend:8000`.
- `.env.docker.sqlite`:
  - Disables PostgreSQL variables and uses SQLite in backend container.
  - Sets `NEXT_PUBLIC_API_BASE_URL=http://backend:8000`.

All Docker env files include `SEED_DEMO_DATA=true` to guarantee demo login.

Demo credentials after startup:

- Username: `admin`
- Password: `Admin@12345`

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/api/schema/` returns 500 | schema warning emission in detached stderr or unstable backend startup | Use Docker start scripts and keep `SPECTACULAR_SETTINGS.DISABLE_ERRORS_AND_WARNINGS=True`. |
| Frontend `/login` does not load | container not healthy yet or backend not healthy | Run `.\scripts\status.ps1`, then inspect `.\scripts\logs.ps1 -Mode docker-postgres -Service frontend -Follow`. |
| `next build` fails on fonts | network blocked for Google Fonts | Ensure internet/proxy access to `fonts.googleapis.com` and `fonts.gstatic.com`. |
| Ports 3000/8000/5432/3306/8080 busy | old services already listening | Stop conflicting processes or run `.\scripts\stop.ps1 -Mode all -RemoveVolumes`. |
| phpMyAdmin is not reachable on `:8080` | stack not started in MySQL mode or MySQL container unhealthy | Start with `.\scripts\start.ps1 -Mode docker-mysql`, then run `.\scripts\status.ps1` and inspect `.\scripts\logs.ps1 -Mode docker-mysql -Service db -Follow`. |
| Login fails for `admin` | seed data not created | Ensure `SEED_DEMO_DATA=true`, then restart with `.\scripts\start.ps1`. |

## CI and Merge Gate

The repository includes a unified GitHub Actions gate:

- `.github/workflows/quality-gate.yml` (orchestrates backend + frontend quality)
- `.github/workflows/backend-quality.yml`
- `.github/workflows/frontend-quality.yml`
- `.github/workflows/docker-smoke.yml` (smoke checks for postgres + mysql + sqlite modes)

### Required local checks (before opening PR)

```bash
# Backend
.venv/Scripts/python backend/manage.py check
.venv/Scripts/python backend/manage.py makemigrations --check --dry-run
.venv/Scripts/python backend/manage.py test core finance procurement projects real_estate

# Frontend
cd frontend
npm run lint
npm run check:permission-map
npm run build
```

### GitHub branch protection (recommended)

For the default branch (for example `main`):

1. GitHub repository -> `Settings` -> `Branches` (or `Rules`/`Rulesets`).
2. Add branch protection rule for the default branch.
3. Enable `Require a pull request before merging`.
4. Enable `Require status checks to pass before merging`.
5. Select the required status check: `Quality Gate`.
6. Save the rule.

## Next implementation steps

1. Auto-create stock-in transactions from purchase order receive events (warehouse-aware receiving).
2. Add integration adapters (bank statements, payment gateway, tax/e-invoicing).
3. Add production-grade CI, tests, and deployment pipeline.
