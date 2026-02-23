# Demo Single-Domain Bundle (Nginx + SSL)

This setup runs demo on one domain:
- `https://demo.example.com` -> Next frontend
- Backend stays private inside Docker network and is reached through Next proxy (`/api/backend/*`)

## 1) DNS
Create an `A` record:
- `demo.example.com` -> VPS public IP

## 2) VPS prerequisites
```bash
sudo apt update && sudo apt -y upgrade
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
sudo apt install -y nginx certbot python3-certbot-nginx
```

## 3) Prepare environment
From project root on VPS:
```bash
cp deploy/demo-domain/.env.demo.domain.example .env.demo.domain
nano .env.demo.domain
```
Update these values at minimum:
- `DJANGO_SECRET_KEY`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- domain names in `DJANGO_ALLOWED_HOSTS` and `DJANGO_CSRF_TRUSTED_ORIGINS`

## 4) Run demo stack
```bash
bash deploy/demo-domain/start-demo-domain.sh
```

## 5) Configure Nginx + SSL
```bash
sudo cp deploy/demo-domain/nginx.demo.single-domain.conf /etc/nginx/sites-available/demo.example.com
sudo ln -s /etc/nginx/sites-available/demo.example.com /etc/nginx/sites-enabled/demo.example.com
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d demo.example.com
```

## 6) Access
- URL: `https://demo.example.com/login`
- Demo account: `admin / Admin@12345`

## 7) How components are linked
1. User opens `demo.example.com` -> Nginx forwards to Next on `127.0.0.1:3000`.
2. Next UI requests `/api/backend/*` and `/api/auth/*`.
3. Next server proxies API calls internally to Django (`http://backend:8000`).
4. MySQL is internal-only (`db` service), not publicly exposed.

## 8) Stop demo
```bash
bash deploy/demo-domain/stop-demo-domain.sh
```
