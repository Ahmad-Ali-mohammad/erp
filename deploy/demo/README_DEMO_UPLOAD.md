# Demo Upload Bundle (VPS)

هذا المجلد مخصص لتشغيل عرض Demo سريع على VPS بدون Vercel.

## المحتوى
- `.env.demo.example` إعدادات البيئة للديمو
- `docker-compose.demo.yml` إعدادات docker للديمو
- `start-demo.sh` تشغيل كامل البيئة
- `stop-demo.sh` إيقاف البيئة
- `nginx.demo.example.com.conf` (اختياري) ربط عبر دومين

## خطوات التشغيل
1) ارفع المشروع إلى VPS.
2) من جذر المشروع:
```bash
cp deploy/demo/.env.demo.example .env.demo
nano .env.demo
```
3) شغل البيئة:
```bash
bash deploy/demo/start-demo.sh
```

## روابط الوصول
- Frontend: `http://<VPS_IP>:3000/login`
- API Health: `http://<VPS_IP>:8000/api/v1/core/health/`
- phpMyAdmin: `http://<VPS_IP>:8080`

## حساب الديمو
- Username: `admin`
- Password: `Admin@12345`

## إيقاف الديمو
```bash
bash deploy/demo/stop-demo.sh
```

## ملاحظة أمنية
هذا إعداد Demo فقط. للإنتاج استخدم ملفات `deploy/prod`.
