# Production Deploy Bundle (Vercel + VPS)

This bundle deploys:
- Frontend on Vercel (`app.example.com`)
- Backend + MySQL on VPS (`api.example.com`)

## 1) DNS
Create records:
- `A` record: `api.example.com` -> VPS public IP
- `CNAME` record: `app.example.com` -> Vercel target

## 2) VPS setup
```bash
sudo apt update && sudo apt -y upgrade
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
sudo apt install -y nginx certbot python3-certbot-nginx
```

## 3) Upload project
```bash
git clone <REPO_URL> /opt/dash
cd /opt/dash
cp deploy/prod/.env.vps.example .env.prod
nano .env.prod
```
Update all `CHANGE_ME_*` values.

## 4) Start backend + mysql only
```bash
docker compose --env-file .env.prod -f docker-compose.base.yml -f docker-compose.mysql.yml -f deploy/prod/docker-compose.vps.yml up -d --build backend db
```

## 5) Configure Nginx for API domain
```bash
sudo cp deploy/prod/nginx.api.example.com.conf /etc/nginx/sites-available/api.example.com
sudo ln -s /etc/nginx/sites-available/api.example.com /etc/nginx/sites-enabled/api.example.com
sudo nginx -t
sudo systemctl reload nginx
```

Enable SSL:
```bash
sudo certbot --nginx -d api.example.com
```

## 6) Vercel setup
In Vercel:
- Import repository
- Root Directory: `frontend`
- Build Command: `npm run build`
- Start Command: leave default
- Add env vars from `deploy/prod/vercel-env.example.txt`

Map custom domain `app.example.com` to the Vercel project.

## 7) How frontend and backend are linked
1. Browser opens `https://app.example.com` (Vercel).
2. Frontend calls internal Next route `/api/backend/*`.
3. That route proxies to `https://api.example.com/api/*` using `INTERNAL_API_BASE_URL`/`NEXT_PUBLIC_API_BASE_URL`.
4. Django serves API responses; auth tokens are managed by frontend cookies.

## 8) Validation
- API health: `https://api.example.com/api/v1/core/health/`
- App login page: `https://app.example.com/login`
- In Vercel function logs, verify `/api/backend/*` proxy calls succeed.

## 9) Basic hardening
- Keep `DJANGO_DEBUG=false`
- Keep `SEED_DEMO_DATA=false`
- Use strong DB and secret values
- Do not expose ports `3306` and `8080` publicly
- Enable VPS firewall for ports `22`, `80`, `443` only
