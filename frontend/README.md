# ERP Frontend (Next.js)

This repository hosts the frontend application only.

## Deploy On Vercel

1. Import this repo into Vercel.
2. Framework preset: `Next.js`.
3. Root directory: repository root.
4. Build command: `npm run build`.
5. Install command: `npm install`.

## Required Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

- `INTERNAL_API_BASE_URL=https://api.example.com`
- `NEXT_PUBLIC_API_BASE_URL=https://api.example.com`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=` (optional)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=` (optional)

## Backend Link

The app proxies all authenticated API calls through:

- `/api/backend/*`
- `/api/auth/*`

These routes use `INTERNAL_API_BASE_URL` on the server side to call your Django backend.

## Quick Local Run

```bash
npm install
cp .env.example .env.local
npm run dev
```
