# طرح استقرار عملیاتی BOYA (Deployment Plan)

**نسخه:** ۱.۰ — ۱۳ آبان ۱۴۰۵

---

## ۱. معماری استقرار

```
اینترنت (کاربران ایران)
       │
       ▼
  Nginx (Reverse Proxy + TLS)
       │
       ├──► Node.js App (BOYA)  :3000
       │         │
       │         ├──► PostgreSQL :5432
       │         └──► Redis      :6379
       │
       └──► فایل‌های آپلودشده (Volume مشترک)
```

**توضیح:** برنامه BOYA یکپارچه است — هم Frontend و هم Backend را در یک سرویس
ارائه می‌دهد (SSR + API). در نتیجه فقط یک سرویس Node.js نیاز است.

---

## ۲. مراحل استقرار گام‌به‌گام

### مرحله ۱: آماده‌سازی سرور

```bash
# ۱. به‌روزرسانی سیستم
sudo apt update && sudo apt upgrade -y

# ۲. نصب Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# ۳. نصب PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# ۴. نصب Redis
sudo apt install -y redis-server

# ۵. نصب Nginx
sudo apt install -y nginx
```

### مرحله ۲: پیکربندی پایگاه‌داده

```bash
# ورود به PostgreSQL
sudo -u postgres psql

# ساخت دیتابیس و کاربر
CREATE DATABASE boyadb;
CREATE USER boya_user WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE boyadb TO boya_user;
\q

# فعال‌سازی سرویس
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### مرحله ۳: استقرار برنامه

```bash
# ۱. clone پروژه
git clone <repository-url> /opt/boya
cd /opt/boya

# ۲. نصب وابستگی‌ها
npm install --production

# ۳. ساخت فایل .env
cp .env.example .env
nano .env
# (مقادیر واقعی را وارد کنید — به‌ویژه JWT_SECRET)

# ۴. اجرای مهاجرت‌های دیتابیس
NODE_ENV=production npm run db:migrate

# ۵. (فقط یکبار) اجرای Seed اولیه
RUN_SEED=true node tsx server.ts &
# پس از مشاهده [DB SEED] Seeding completed، سرور را متوقف کنید

# ۶. Build برنامه
npm run build
```

### مرحله ۴: پیکربندی Process Manager

```bash
# نصب PM2
npm install -g pm2

# اجرای برنامه
NODE_ENV=production pm2 start tsx --name boya -- server.ts

# ذخیره پیکربندی و راه‌اندازی خودکار
pm2 save
pm2 startup
```

### مرحله ۵: پیکربندی Nginx

```nginx
# /etc/nginx/sites-available/boya.conf
server {
    listen 80;
    server_name boya.ir www.boya.ir;

    # آپلودهای بزرگ
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/boya.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### مرحله ۶: فعال‌سازی HTTPS

```bash
# نصب Certbot
sudo apt install -y certbot python3-certbot-nginx

# دریافت گواهی
sudo certbot --nginx -d boya.ir -d www.boya.ir

# تمدید خودکار فعال است
```

---

## ۳. چک‌لیست قبل از انتشار (Pre-Launch Checklist)

### زیرساخت
- [ ] PostgreSQL نصب و بک‌آپ خودار روزانه تنظیم شده
- [ ] Redis نصب و در حال اجرا
- [ ] Nginx به‌عنوان Reverse Proxy پیکربندی شده
- [ ] گواهی TLS نصب شده
- [ ] فایروال فقط پورت‌های ۸۰/۴۳ باز است

### برنامه
- [ ] تمام متغیرهای محیطی در `.env` تنظیم شده‌اند
- [ ] `NODE_ENV=production` است
- [ ] `JWT_SECRET` حداقل ۳۲ بایت تصادفی است
- [ ] `RUN_SEED=false` است (فقط برای Seed اولیه true شود)
- [ ] مهاجرت‌های DB اجرا شده‌اند
- [ ] Build Production انجام شده
- [ ] `/api/health` پاسخ می‌دهد

### امنیت
- [ ] Boot Guard ها کار می‌کنند (JWT, DB)
- [ ] Rate Limit فعال است
- [ ] پوشه uploads از بیرون قابل دسترسی مستقیم نیست
- [ ] Audit Logs ثبت می‌شوند

### پشتیبان‌گیری
- [ ] بک‌آپ دیتابیس روزانه (حداقل ۷ روز)
- [ ] بک‌آپ پوشه uploads
- [ ] آزمایش بازیابی بک‌آپ

---

## ۴. مانیتورینگ و نگهداری

### ۴.۱. Health Checks

```bash
# بررسی سلامت برنامه
curl http://localhost:3000/api/health

# بررسی Status سرویس‌ها
sudo systemctl status postgresql redis-server nginx
pm2 status
```

### ۴.۲. مشاهده لاگ‌ها

```bash
# لاگ‌های برنامه
pm2 logs boya --lines 100

# لاگ‌های Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# لاگ‌های دیتابیس
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### ۴.۳. بک‌آپ و بازیابی

```bash
# بک‌آپ دستی
pg_dump -U boya_user boyadb > backup_$(date +%Y%m%d).sql

# بازیابی
psql -U boya_user boyadb < backup_YYYYMMDD.sql

# بک‌آپ خودکار (Cron)
0 3 * * * pg_dump -U boya_user boyadb | gzip > /backups/boya_$(date +\%Y\%m\%d).sql.gz
```

### ۴.۴. به‌روزرسانی برنامه

```bash
cd /opt/boya
git pull origin main
npm install --production
npm run build
NODE_ENV=production pm2 restart boya
```

---

## ۵. مقیاس‌پذیری (Scaling)

### مرحله ۱ (تا ۵۰۰ کاربر هم‌زمان)
- یک سرور: Node.js + PostgreSQL + Redis
- رم: ۴ گیگابایت، CPU: ۲ هسته

### مرحله ۲ (تا ۵,۰۰۰ کاربر هم‌زمان)
- جداسازی DB به سرور مجزا
- رم: ۸ گیگابایت، CPU: ۴ هسته
- اضافه کردن CDN برای فایل‌های استاتیک

### مرحله ۳ (بیشتر از ۵,۰۰۰)
- Load Balancer + چندین Instance برنامه
- PostgreSQL Replication
- CDN برای Assets

---

## ۶. سناریوهای اضطراری

### ۶.۱. از کار افتادگی برنامه
```bash
pm2 restart boya
# اگر حل نشد:
pm2 stop boya
npm run build
pm2 start boya
```

### ۶.۲. از کار افتادگی دیتابیس
```bash
sudo systemctl restart postgresql
# اگر حل نشد، آخرین بک‌آپ را بازیابی کنید:
psql -U boya_user boyadb < /backups/boya_last.sql
```

### ۶.۳. نقص پیامک
- برنامه همچنان کار می‌کند (فقط OTP ارسال نمی‌شود)
- لاگ `[SMS FAIL]` را بررسی کنید
- با پشتیبانی ملی‌پیامک تماس بگیرید

---

## ۷. برآورد هزینه

| مورد | مرحله ۱ | مرحله ۲ |
|---|---|---|
| سرور (VPS) | ~۵۰۰ هزار تومان/ماه | ~۲ میلیون تومان/ماه |
| دامنه | ~۱۰۰ هزار تومان/سال | همان |
| گواهی TLS | رایگان (Let's Encrypt) | همان |
| پیامک | متناسب با مصرف | همان |
| **مجموع** | **~۶۰۰ هزار تومان/ماه** | **~۲.۵ میلیون تومان/ماه** |

---

## ۸.-plugins پیشنهادی برای آینده

1. **Sentry** — ظرف ۵ دقیقه نصب می‌شود و خطاها را مانیتور می‌کند
2. **PM2 Plus** — داشبورد حرفه‌ای برای PM2
3. **Uptime Robot** — مانیتورینگ Uptime رایگان
4. **Cloudflare** — CDN + DDoS Protection

---

**نکته نهایی:** این طرح برای یک نمایش Pilot کافی است. قبل از انتشار عمومی
در سطح ملی، توصیه می‌شود تست Load و Security Audit انجام شود.
