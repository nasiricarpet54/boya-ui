# پلتفرم جامع خدمات و نوبت‌دهی زیبایی بویا (BOYA)

![BOYA Banner](public/assets/aistudio/IMG_20261031_121115_770_79cc90aa.png)

بویا (BOYA) یک پلتفرم دوطرفه هوشمند و پیشرفته برای رزرو آنلاین خدمات زیبایی، مدیریت سالن‌های زیبایی، پرسنل، متخصصین سیار و مستقل، و سامانه نظارت مرکزی ادمین کل می‌باشد.

---

## 🚀 ویژگی‌های کلیدی محصول

1. **اپلیکیشن مشتریان (Customer App)**:
   - جستجوی هوشمند سالن‌ها بر اساس استان، شهرستان و موقعیت جغرافیایی GPS.
   - نمایش الگوریتمی پیشنهادات اختصاصی بر اساس سوابق رزرو و سالن‌های نشان‌شده.
   - ثبت نوبت آنلاین بدون تداخل (برقراری قفل سطح پایگاه‌داده Database-Level Locking).
   - درخواست خدمات در محل (Mobile Services / Home Service).
   - صدور کد رهگیری و اطلاع‌رسانی آنی پیامکی OTP.

2. **پنل سالن‌دار و متخصصین (Salon & Specialists Panel)**:
   - پرتال اختصاصی و ایزوله برای ۵ نقش: مدیر سالن، ادمین سالن، مدیر لاین (متخصص مستقل)، متخصص سالن و متخصص سیار.
   - مدیریت سانس‌های کاری، مسدودسازی زمان‌های استراحت (Schedule Blocks) و نرخ‌نامه خدمات.
   - مدیریت آلبوم ژورنالی نمونه‌کارها (Portfolio).
   - گزارش‌گیری و نمودارهای مالی تفکیکی درآمد خدمات سالن و سیار با Recharts.

3. **سامانه نظارتی ادمین کل (Super Admin Web Panel)**:
   - نظارت بر درخواست‌های ثبت سالن جدید و احراز هویت.
   - رتبه‌بندی و تعیین برچسب‌های VIP سالن‌ها.
   - گزارشات مالی و عملیاتی جامع پلتفرم.

---

## 🛠 پیش‌نیازها (Prerequisites)

برای اجرای پروژه در محیط توسعه یا تولید به موارد زیر نیاز دارید:

- **Node.js**: نسخه `18.x` یا بالاتر (`v20.x` توصیه می‌شود)
- **npm**: نسخه `9.x` یا بالاتر
- **PostgreSQL**: پایگاه‌داده رابطه‌ای (Cloud SQL / PostgreSQL 15+)
- **Firebase Project**: برای Firebase Authentication (گوگل لاگین و ID Token)

---

## 💻 نصب و راه‌اندازی (Installation)

۱. **دریافت مخزن پروژه**:
```bash
git clone https://github.com/boya-platform/boya-applet.git
cd boya-applet
```

۲. **نصب وابستگی‌ها**:
```bash
npm install
```

۳. **تنظیم متغیرهای محیطی**:
یک فایل `.env` بر اساس `.env.example` ایجاد کرده و متغیرهای لازمه را تنظیم نمایید:
```bash
cp .env.example .env
```

۴. **اجرای سرور توسعه (Dev Server)**:
```bash
npm run dev
```
برنامه در آدرس `http://localhost:3000` آماده به کار خواهد بود.

---

## 📁 ساختار پوشه‌ها و معماری (Directory Structure)

پروژه از معماری مبتنی بر قابلیت (**Feature-Based Architecture**) پیروی می‌کند:

```
boya-applet/
├── src/
│   ├── db/                      # اسکیما و کلاینت Drizzle ORM
│   │   ├── schema.ts            # تعاریف جداول و روابط PostgreSQL
│   │   ├── index.ts             # کانکشن پูล دیتابیس
│   │   └── bookings.ts          # منطق تراکنش‌ها و قفل همزمانی
│   ├── features/                # ماژول‌های مستقل مبتنی بر قابلیت
│   │   ├── home/                # اپلیکیشن مشتری - صفحه اصلی
│   │   ├── salons/              # لیست و جستجوی سالن‌ها
│   │   ├── booking/             # کارتابل نوبت‌های مشتری
│   │   ├── profile/             # پروفایل کاربر و تیکت پشتیبانی
│   │   ├── salon-admin/         # پنل مدیریت سالن و بیوتیشن‌ها
│   │   └── admin/               # پنل ادمین کل (Super Admin)
│   ├── shared/                  # کامپوننت‌ها و استورهای مشترک
│   │   ├── api/                 # کلاینت Axios و هوک‌های TanStack Query
│   │   ├── components/          # کامپوننت‌های UI، گاردها و مدال‌ها
│   │   ├── stores/              # حالت کلاینت با Zustand (auth, ui, location)
│   │   ├── router/              # مسیرهای تایپ‌سیف TanStack Router
│   │   └── utils/               # توابع محاسباتی، تقویم جلالی و تبدیل اعداد
│   ├── middleware/              # میدلورهای احراز هویت اکسپرس
│   ├── main.tsx                 # نقطه ورود فرانت‌اند React
│   └── index.css                # استایل‌های Tailwind CSS v4 و RTL
├── server.ts                    # نقطه ورود سرور اکسپرس + Vite Middlewares
├── eslint.config.js             # پیکربندی قوانین ESLint
├── .prettierrc                  # پیکربندی فرمت‌دهی کد
├── CONTRIBUTING.md              # راهنمای مشارکت و Conventional Commits
├── LICENSE                      # مجوز استفاده MIT
└── package.json                 # وابستگی‌ها و اسکریپت‌ها
```

---

## 📜 اسکریپت‌های موجود (Available Scripts)

| اسکریپت | توضیح |
| :--- | :--- |
| `npm run dev` | اجرای همزمان فرانت‌اند و بک‌اند با `tsx server.ts` روی پورت ۳۰۰۰ |
| `npm run build` | ساخت نسخه تولیدی فرانت‌اند با `vite build` |
| `npm run lint` | بررسی استاتیک کد و قوانین TypeScript / ESLint |
| `npm run test` | اجرای تست‌های واحد و هوک‌ها با `Vitest` |
| `npm run test:e2e` | اجرای تست‌های سراسری End-to-End با `Playwright` |
| `npm run storybook` | اجرای محیط مستندسازی بصری کامپوننت‌ها با `Storybook` |

---

## ⚙️ متغیرهای محیطی (Environment Variables)

| متغیر | توضیح | نمونه |
| :--- | :--- | :--- |
| `PORT` | پورت اجرای سرور اکسپرس | `3000` |
| `DATABASE_URL` | آدرس اتصال به پایگاه‌داده PostgreSQL | `postgresql://user:pass@host:5432/boyadb` |
| `VITE_FIREBASE_PROJECT_ID` | شناسه پروژه فایربیس | `boya-app` |
| `VITE_FIREBASE_API_KEY` | کلید عمومی فایربیس | `AIzaSy...` |

---

## 🛡 استقرار و تولید (Deployment)

برای استقرار پروژه در محیط کامپایل‌شده:

```bash
npm run build
npm start
```

---

## 📄 مجوز (License)

پروژه تحت مجوز [MIT](LICENSE) منتشر شده است.
