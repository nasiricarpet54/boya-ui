# پلتفرم جامع خدمات و نوبت‌دهی زیبایی بویا (BOYA)

![BOYA Banner](public/assets/aistudio/IMG_20261031_121115_770_79cc90aa.png)

بویا (BOYA) یک پلتفرم دوطرفه هوشمند و پیشرفته برای رزرو آنلاین خدمات زیبایی، مدیریت سالن‌های زیبایی، پرسنل، متخصصین سیار و مستقل، و سامانه نظارت مرکزی ادمین کل می‌باشد.

---

## 🚀 ویژگی‌های کلیدی محصول

1. **احراز هویت منحصراً با شماره تلفن همراه (SMS OTP)**:
   - ورود و ثبت‌نام سریع و امن کاربران تنها از طریق شماره همراه (پیش‌شماره ۰۹).
   - ارسال آنی کد تایید یکبار مصرف پیامکی (OTP) و عدم نیاز یا استفاده از ورود با گوگل.

2. **اپلیکیشن مشتریان (Customer App)**:
   - جستجوی هوشمند سالن‌ها بر اساس استان، شهرستان و موقعیت جغرافیایی GPS.
   - انتخاب دقیق زمان با **کامپوننت اختصاصی تقویم هجری شمسی (`JalaliDatePicker`)** منطبق بر منطقه زمانی تهران (`Asia/Tehran`) و شروع هفته با روز شنبه.
   - نمایش الگوریتمی پیشنهادات اختصاصی بر اساس سوابق رزرو و سالن‌های نشان‌شده.
   - ثبت نوبت آنلاین بدون تداخل (برقراری قفل سطح پایگاه‌داده Database-Level Locking).
   - درخواست خدمات در محل (Mobile Services / Home Service).
   - صدور کد رهگیری پیامکی رزرو نوبت.

3. **پنل سالن‌دار و متخصصین (Salon & Specialists Panel)**:
   - پرتال اختصاصی و ایزوله برای ۵ نقش: مدیر سالن، ادمین سالن، مدیر لاین (متخصص مستقل)، متخصص سالن و متخصص سیار.
   - مدیریت سانس‌های کاری، مسدودسازی زمان‌های استراحت (Schedule Blocks) و نرخ‌نامه خدمات.
   - مدیریت آلبوم ژورنالی نمونه‌کارها (Portfolio).
   - گزارش‌گیری و نمودارهای مالی تفکیکی درآمد خدمات سالن و سیار با Recharts.

4. **سامانه نظارتی ادمین کل (Super Admin Web Panel)**:
   - نظارت بر درخواست‌های ثبت سالن جدید و احراز هویت.
   - رتبه‌بندی و تعیین برچسب‌های VIP سالن‌ها.
   - گزارشات مالی و عملیاتی جامع پلتفرم.

---

## 🛠 پیش‌نیازها (Prerequisites)

برای اجرای پروژه در محیط توسعه یا تولید به موارد زیر نیاز دارید:

- **Node.js**: نسخه `18.x` یا بالاتر (`v20.x` توصیه می‌شود)
- **npm**: نسخه `9.x` یا بالاتر
- **PostgreSQL**: پایگاه‌داده رابطه‌ای (Cloud SQL / PostgreSQL 15+)
- **سامانه پیامکی OTP**: سرویس ارسال و تایید کد یکبار مصرف پیامکی

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
سرور با اسکریپت `tsx server.ts` در پورت ۳۰۰۰ اجرا می‌شود؛ آدرس `http://localhost:3000` را باز کنید.

---

## 📁 ساختار پوشه‌ها و معماری (Directory Structure)

پروژه از معماری مبتنی بر قابلیت (**Feature-Based Architecture**) پیروی می‌کند:

```
boya-applet/
├── src/
│   ├── db/                      # اسکیما و کلاینت Drizzle ORM
│   │   ├── schema.ts            # تعاریف جداول و روابط PostgreSQL
│   │   ├── index.ts             # کانکشن پول دیتابیس
│   │   ├── users.ts             # مدیریت کاربران بر اساس شماره همراه
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
│   │   │   └── ui/
│   │   │       ├── JalaliDatePicker.tsx        # تقویم شمسی زمان تهران
│   │   │       ├── JalaliDatePicker.stories.tsx # مستندات Storybook
│   │   │       ├── BoyaLogo.tsx
│   │   │       └── SalonCard.tsx
│   │   ├── stores/              # حالت کلاینت با Zustand (auth, ui, location)
│   │   ├── router/              # مسیرهای تایپ‌سیف TanStack Router
│   │   └── utils/               # توابع محاسباتی، تقویم جلالی و تبدیل اعداد
│   ├── middleware/              # میدلورهای احراز هویت اکسپرس (SMS Token & Auth)
│   ├── main.tsx                 # نقطه ورود فرانت‌اند React
│   └── index.css                # استایل‌های Tailwind CSS v4 و RTL
├── server.ts                    # سرور اکسپرس + سرویس OTP و Vite Middlewares
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
| `npm start` | اجرای سرور برنامه با `tsx server.ts` روی پورت ۳۰۰۰ |
| `npm run build` | ساخت نسخه تولیدی فرانت‌اند با `vite build` |
| `npm run lint` | بررسی استاتیک کد و قوانین TypeScript / ESLint |
| `npm run test` | اجرای تست‌های واحد و هوک‌ها با `Vitest` |
| `npm run test:e2e` | اجرای تست‌های سراسری End-to-End با `Playwright` |
| `npm run db:migrate` | اجرای migrationهای نسخه‌دار با قفل دیتابیس و تراکنش (نیازمند `DATABASE_URL`) |
| `npm run db:rollback` | عمداً غیرفعال است؛ rollback مخرب تا زمان طراحی migration برگشتیِ داده‌نگهدار ارائه نمی‌شود |
| `npm run storybook` | اجرای محیط مستندسازی بصری کامپوننت‌ها با `Storybook` |

---

## ⚙️ متغیرهای محیطی (Environment Variables)

| متغیر | توضیح | نمونه |
| :--- | :--- | :--- |
| `PORT` | پورت اجرای سرور اکسپرس | `3000` |
| `DATABASE_URL` | آدرس اتصال به پایگاه‌داده PostgreSQL | `postgresql://user:pass@host:5432/boyadb` |
| `VITE_FIREBASE_PROJECT_ID` | شناسه پروژه فایربیس | `boya-app` |

---

## 🛡 استقرار و تولید (Deployment)

پروژه از **npm و `package-lock.json`** استفاده می‌کند؛ نصب CI و Docker با `npm ci` انجام می‌شود. قبل از انتشار، `CORS_ALLOWED_ORIGINS` را به فهرست دقیق originهای فرانت‌اند تنظیم کنید (بدون wildcard). در production پیش‌فرض فقط `https://boya.bcshopir.ir` مجاز است.

ابتدا از پایگاه‌داده مقصد نسخه پشتیبان بگیرید و `DATABASE_URL` را به همان پایگاه‌داده تنظیم کنید. migrationها هنگام بالا آمدن سرور خودکار اجرا نمی‌شوند؛ فرمان زیر را در مرحلهٔ کنترل‌شدهٔ release، پیش از بالا آوردن نسخه جدید اجرا کنید. runner با advisory lock، ledger و transaction migrationها را idempotent اجرا می‌کند و برای نصب موجود، migration پایه را دوباره اعمال نمی‌کند:

```bash
export DATABASE_URL='postgresql://user:password@host:5432/boyadb'
npm ci
npm run db:migrate
```

پس از موفقیت مهاجرت:

```bash
npm run build
npm start
```

برای اجرای تست‌های واحد از `npm test` و برای آزمون مرورگر از `npm run test:e2e` استفاده کنید. تغییرات schema شامل favorites، support tickets، specialist schedules/invitations و ایندکس نوبت‌های فعال است. rollback خودکار و عمومی عمداً در دسترس نیست، چون حذف این جدول‌ها یا ستون‌ها می‌تواند داده‌های مشتری را نابود کند؛ در صورت نیاز به بازگشت نسخه، ابتدا نسخه قبلی برنامه را اجرا کنید و migration جبرانیِ داده‌نگهدار را با backup و بازبینی جداگانه بسازید. آزمون endpoint یکپارچه با PostgreSQL آزمایشی همچنان باید در CI افزوده شود.

---

## 📄 مجوز (License)

پروژه تحت مجوز [MIT](LICENSE) منتشر شده است.
