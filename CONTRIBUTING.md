# راهنمای مشارکت در پروژه بویا (CONTRIBUTING)

از اینکه علاقه‌مند به مشارکت در توسعه پلتفرم زیبایی بویا هستید سپاسگزاریم. برای حفظ کیفیت کد، یکپارچگی معماری و فرایند توسعه منظم، رعایت نکات زیر الزامی است.

---

## 🌿 استراتژی شاخه‌بندی (Branching Strategy)

ما از استراتژی **Git Flow ساده‌شده** استفاده می‌کنیم:

- **`main`**: شاخه اصلی تولیدی (Production-ready). کد موجود در این شاخه همیشه مستقر و پایدار است.
- **`develop`**: شاخه اصلی ادغام تغییرات آماده برای انتشار بعدی.
- **`feature/<feature-name>`**: شاخه‌های توسعه قابلیت‌های جدید (مثال: `feature/salon-booking-lock`).
- **`fix/<bug-name>`**: شاخه‌های رفع باگ و اشکالات نرم‌افزاری (مثال: `fix/auth-modal-loader`).
- **`refactor/<refactor-name>`**: شاخه‌های بهینه‌سازی و بازنویسی کد.

---

## 📝 فرمت پیام‌های کامیت (Conventional Commits)

تمامی پیام‌های کامیت **باید** دقیقاً مطابق با استاندارد [Conventional Commits](https://www.conventionalcommits.org/) باشند:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

### انواع Type مجاز:

- **`feat`**: افزودن یک قابلیت جدید به سیستم.
- **`fix`**: برطرف کردن یک باگ یا خطا.
- **`docs`**: تغییرات در مستندات پروژه (مانند README).
- **`style`**: تغییرات در ظاهر یا فرمت کد بدون تغییر در منطق (فاصله‌ها، سمی‌کولون‌ها).
- **`refactor`**: بازنویسی کد بدون تغییر در عملکرد یا افزودن باگ/قابلیت.
- **`test`**: افزودن یا اصلاح تست‌های Vitest / Playwright.
- **`chore`**: تغییر در ابزارهای ساخت، کانفیگ‌ها یا وابستگی‌های `package.json`.

### نمونه کامیت‌های معتبر:
```bash
git commit -m "feat(booking): implement database-level lock for appointment slots"
git commit -m "fix(auth): resolve duplicate loading state in auth modal"
git commit -m "docs(readme): add environment variables setup instructions"
git commit -m "refactor(salon-admin): migrate specialist dashboard to use React Query hooks"
```

---

## 🔀 فرآیند ارسال و ادغام Pull Request (PR)

۱. یک شاخه جدید از روی `develop` یا `main` ایجاد کنید:
   ```bash
   git checkout -b feature/my-new-feature
   ```
۲. تغییرات خود را اعمال کرده و با پیام‌های استاندارد کامیت کنید.
۳. بررسی‌های محلی شامل تست‌ها و Lint را اجرا کنید:
   ```bash
   npm run lint
   npm run test
   ```
۴. شاخه خود را به مخزن ارسال کرده و یک **Pull Request** ایجاد نمایید.
۵. **شرایط لازم برای ادغام (Merge Criteria)**:
   - موفقیت تمامی تست‌های خودکار و بررسی‌های ESLint / TypeScript.
   - تایید و بازبینی حداقل یک توسعه‌دهنده (Code Review).
   - عدم وجود Conflict با شاخه مقصد.
   - استفاده از روش **Squash and Merge** یا **Rebase and Merge** برای تمیز نگه داشتن تاریخچه کامیت‌ها.

از مشارکت شما متشکریم! 🌹
