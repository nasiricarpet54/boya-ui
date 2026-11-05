# پرامپت: حل سه گذارش دیتابیس پروژه بویا
**(برای Google AI Studio — با دسترسی اجرای دستور روی سرور دیتابیس)**

## نوع خروجی مورد انتظار
خروجی اصلی شما یک گزارش فنی است که در انتها با فرمت JSON داده می‌شود.
**مهم:** دستوراتی که دیتابیس را تغییر می‌دهند (ALTER / UPDATE / RENAME) را قبل از اجرا به من نشان دهید و تأیید بگیرید. دستورهای فقط-خواندنی (SELECT / SHOW / اطلاعات schema) را می‌توانید مستقماً اجرا کنید.

---

## نقش
شما یک DBA هستید که روی یک پایگاه‌داده‌ی **PostgreSQL زنده** دستور اجرا می‌کند. کاری که می‌کنید غیرقابل‌برگشت است. قبل از هر ALTER، وضعیت واقعی دیتابیس را بخوانید و بر اساس مشاهدات تصمیم بگیرید، نه حدس.

## پروژه
پلتفرم «بویا» — رزرو سالن زیبایی. Node/TypeScript + Express + drizzle-orm.
مسیر پروژه در سیستم من: `E:/boya/boya_ai`.
فایل‌های مرتبط: پوشه‌ی `drizzle/` (migrationها)، `src/db/migrate.ts` (runner)، `src/db/schema.ts` (schema)، `src/db/drizzle.config.ts` (تنظیمات drizzle-kit).

---

# مأموریت ۱: رفع تعارض شماره‌گذاری migrationها

## مشکل
پوشه‌ی `drizzle/` هفت فایل SQL دارد که شماره‌گذاری دو گروه از آن‌ها **تضاد** دارد:

```
drizzle/0000_perfect_harrier.sql
drizzle/0001_publication_lifecycle.sql
drizzle/0002_strange_storm.sql
drizzle/0003_refresh_tokens.sql             ← تعارض با نفر زیر
drizzle/0003_working_hours.sql              ←
drizzle/0004_salon_status.sql               ← تعارض با نفر زیر (این را خودم برای مأموریت ۲ نوشته‌ام)
drizzle/0004_specialist_working_hours.sql   ←
```

`drizzle/meta/_journal.json` در حال حاضر فقط این پنج مورد را می‌شناسد:
`0000_perfect_harrier`، `0001_publication_lifecycle`، `0002_strange_storm`، `0003_working_hours`، `0004_salon_status`.

## پیش‌زمینه (ągah باشید)
این کدبیس توسط چند نشست مختلف AI طی چند روز نوشته شده و هر نشست migration جدیدی اضافه کرده بدون اینکه migrationهای هم‌شماره‌ی نشست‌های قبلی را ببیند. به گذشته کاری کسی اشاره نکنید — فقط وضعیت نهایی را درست کنید.

## نکته‌ی فنی مهم درباره‌ی نحوه‌ی کار drizzle
من سورس `node_modules/drizzle-orm/pg-core/dialect.js` را خواندم. رفتار migrator این است:

- جدول پیگیری در schema ای به نام `drizzle` و با نام `__drizzle_migrations__` ساخته می‌شود (مستقلاً از اینکه پروژه schema اصلی شما `public` باشد). ستون‌های آن: `id (serial)`, `hash (text)`, `created_at (bigint)`.
- migrator فقط **آخرین** migration اجرا شده را می‌خواند:
  `select id, hash, created_at from drizzle.__drizzle_migrations__ order by created_at desc limit 1`
- سپس در یک transaction، migrationهایی را که `folderMillis` (همان عدد `when` در `_journal.json`) از `created_at` آخرین رکورد **بزرگتر** است اجرا می‌کند.
- **نتیجه‌ی مهم:** شماره‌گذاری فایل‌های SQL برای drizzle اهمیتی ندارد — معیار، آن عدد `when` در journal است. پس اگر یک migration را rename کنید ولی ورودی journal آن را اصلاح نکنید، drizzle سعی می‌کند آن را **دوباره اجرا کند**.
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` ایمن است (دومین بار خطا نمی‌دهد)، اما `CREATE TYPE ... AS ENUM` ایمن نیست و دفعه‌ی دوم خطای "type already exists" می‌دهد.

## کارهایی که باید انجام دهید

### گام ۱.۱ — کشف وضعیت واقعی (فقط خواندن، نیازی به تأیید ندارید)

این را اجرا کنید تا ببینید drizzle اصلاً چه migrationهایی را واقعاً اجرا کرده:

```sql
SELECT id, hash, created_at FROM drizzle.__drizzle_migrations__ ORDER BY created_at;
```

اگر این جدول وجود نداشت یا خطای "schema drizzle does not exist" داد، یعنی بخش drizzle‌ِ `runMigrations()` هرگز با موفقیت اجرا نشده و کل migrationها به Schritt بعدی (قسمت self-healing) منتقل شده‌اند. این احتمال را در گزارش بنویسید چون بسیار مهم است.

سپس وضعیت واقعی چهار migration متناقض را چک کنید:

```sql
-- Working scheduleها (مرتبط با 0003_working_hours و 0004_specialist_working_hours)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'specialists'
  AND column_name IN ('working_hours', 'working_days', 'is_mobile_active');

-- جدول refresh tokens (مرتبط با 0003_refresh_tokens)
SELECT table_name FROM information_schema.tables WHERE table_name = 'refresh_tokens';

-- ستون salon status (مرتبط با مأموریت ۲)
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'salons' AND column_name = 'status';
```

### گام ۱.۲ — تصمیم (بر اساس مشاهدات گام قبل)

دو حالت وجود دارد. شما راجع به حالت درست تصمیم بگیرید و دلیلش را بنویسید:

**حالت A (محتمل‌تر):** `0003_refresh_tokens.sql` و `0004_specialist_working_hours.sql` هرگز توسط drizzle اجرا نشده‌اند — چون در journal نیستند و محتوایشان یا توسط self-healing یا توسط migrationهای دیگر پوشش داده شده است.
- `0003_refresh_tokens.sql`: اگر جدول `refresh_tokens` وجود **دارد**، این migration تکراری است → کلاً حذفش کنید. اگر وجود **ندارد**، به `0005_refresh_tokens.sql` تغییر نام دهید.
- `0004_specialist_working_hours.sql`: محتوایش زیرمجموعه‌ای از `0003_working_hours.sql` است (فقط working_hours و working_days، دارد، در حالی که ۰۰۰۳ علاوه بر آنها is_mobile_active را هم اضافه می‌کند). پس اگر ۰۰۰۳ اجرا شده، این فایل صددرصد تکراری است → حذفش کنید.

**حالت B:** هر دو اجرا شده‌اند (یعنی migrationsTable وجود دارد و رکوردهایی برایشان دارد). در این حالت نمی‌توانید آن‌ها را rename کنید چون drizzle سعی می‌کند دوباره اجرایشان کند. در عوض، فقط یک سناریو در گزارش بنویسید و به من بگویید چه کرده‌اید.

### گام ۱.۳ — فایل journal را همگام کنید

اگر فایلی را rename یا حذف کردید، `drizzle/meta/_journal.json` را با ویرایشگر متن (نه با drizzle-kit) اصلاح کنید تا فقط migrationهایی که واقعاً باید اجرا شوند را شناسایی کند. هر ورودی جدید این شکل را دارد:

```json
{
  "idx": 5,
  "version": "7",
  "when": <timestamp毫秒ی فعلی>,
  "tag": "0005_refresh_tokens",
  "breakpoints": true
}
```

**مراقب باشید:** اگر `0004_salon_status` را که خودم نوشته‌ام و هنوز اجرا نشده، از journal حذف کنید، مأموریت ۲ کار نخواهد کرد. آن را نگه دارید.

### گام ۱.۴ — خروجی مأموریت ۱

```json
{
  "taskId": "migration-conflict",
  "dbState": {
    "migrationsTableExists": true,
    "executedMigrations": ["0000_perfect_harrier", "..."],
    "specialistsWorkingColumns": ["working_hours", "..."],
    "refreshTokensTableExists": true
  },
  "actionsTaken": [
    {"action": "renamed|deleted|kept", "file": "...", "reason": "..."}
  ],
  "journalFinalEntries": ["..."],
  "errors": []
}
```

---

# مأموریت ۲: اضافه کردن ستون `salons.status`

## مشکل
فایل `src/db/schema.ts` حالا این را تعریف می‌کند:

```typescript
export const salonStatusEnum = pgEnum('salon_status', ['active', 'pending', 'suspended']);
// روی جدول salons:
status: salonStatusEnum('status').default('pending').notNull(),
```

migration سازگار با آن: `drizzle/0004_salon_status.sql`:

```sql
CREATE TYPE "public"."salon_status" AS ENUM('active', 'pending', 'suspended');--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "status" "salon_status" DEFAULT 'pending' NOT NULL;
```

این migration هنوز روی دیتابیس اعمال نشده. پنل مدیریت از طریق `PATCH /api/salons/:id` این فیلد را می‌فرستد و بدون حضور این ستون، هر تأیید یا رد سالن با خطای "column does not exist" رد می‌شود.

## کارهایی که باید انجام دهید

### گام ۲.۱ — backup بگیرید (قبل از هر چیز)

این تغییر schema است و غیرقابل‌برگشت است. یک dump کامل بگیرید:

```bash
pg_dump "$DATABASE_URL" --format=plain --file="/tmp/boya_before_salon_status.sql"
```
یا اگر PostgreSQL در docker است:
```bash
docker exec -t <postgres_container> pg_dump -U postgres boyadb > /tmp/boya_before_salon_status.sql
```

### گام ۲.۲ — بررسی (فقط خواندن)

```sql
SELECT column_name, udt_name
FROM information_schema.columns
WHERE table_name = 'salons' AND column_name = 'status';
```
اگر ستون از قبل وجود داشت (شاید یک DBA دستی ALTER کرده باشد)، مأموریت ۲ تمام است — فقط در گزارش بنویسید. در غیر این صورت ادامه دهید.

### گام ۲.۳ — اعمال migration

راه اصلی (ترجیح داده می‌شود):

```bash
cd E:/boya/boya_ai
npm run db:migrate
```

این دستور معادل `tsx src/db/migrate.ts` است (بدون نیاز به سرور). نکته: این فایل خودشicticly یک فراخوانی مستقل دارد و اگر مستقیماً اجرا شود، پس از پایان کار process.exit(0) می‌کند.

اگر خطا داد، راه دستی:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0004_salon_status.sql
```

### گام ۲.۴ — backfill داده‌ها

من عمداً backfill را از فایل SQL حذف کردم چون می‌خواهم شما روی دیتابیس زنده تصمیم بگیرید. دو حالت:

**حالت A (پیشنهادی):** همگام‌سازی `status` با `is_approved`:
```sql
-- ابتدا شمارش کنید
SELECT is_approved, COUNT(*) FROM salons GROUP BY is_approved;
-- سپس
UPDATE salons SET status = 'active'   WHERE is_approved = true;
UPDATE salons SET status = 'pending'  WHERE is_approved = false;
```

**حالت B:** همه روی `pending` (default) بمانند تا مدیر دستی تصمیم بگیرد — هیچ backfillی لازم نیست.

این دستورها (UPDATE) را قبل از اجرا به من نشان دهید.

### گام ۲.۵ — بررسی یکپارچگی

```sql
SELECT id, name, is_approved, status FROM salons LIMIT 10;
```

و یک transaction تستی (که در پایان ROLLBACK می‌شود):

```sql
BEGIN;
UPDATE salons SET status = 'suspended' WHERE id = (SELECT id FROM salons ORDER BY id LIMIT 1);
SELECT id, status FROM salons ORDER BY id LIMIT 1;
ROLLBACK;
```

### گام ۲.۶ — هشدار درباره‌ی drizzle-kit

**تحت هیچ شرایطی `npx drizzle-kit push` را اجرا نکنید** — این دستور schema را مستقیماً با دیتابیس همگام می‌کند و می‌تواند ستون‌ها/جدول‌هایی که در schema نیستند را حذف کند.

دستور مجاز: `npx drizzle-kit generate --config=src/db/drizzle.config.ts` (فقط فایل migration جدید می‌سازد، دیتابیس را نمی‌زند). اگر این دستور خطای "Interactive prompts require a TTY terminal" داد، طبیعی است — فقط در گزارش بنویسید.

### گام ۲.۷ — خروجی مأموریت ۲

```json
{
  "taskId": "salon-status-column",
  "backupTaken": true,
  "columnExistedBefore": false,
  "migrationApplied": true,
  "backfillMode": "A",
  "backfillResult": {"active": 0, "pending": 0},
  "verifyQueryResult": "خروجی SELECT نهایی",
  "errors": []
}
```

---

# مأموریت ۳: بررسی یکپارچگی پس از تغییرات (regression)

## هدف
بعد از migrationها مطمئن شوید سرور بدون خطا بالا می‌آید و endpointهایی که به این جداول وابسته‌اند کار می‌کنند. من این کار را نمی‌توانم انجام دهم چون دیتابیس زنده ندارم.

## کارهایی که باید انجام دهید

### گام ۳.۱ — type check و تست‌ها (بدون دیتابیس هم کار می‌کنند)

```bash
cd E:/boya/boya_ai
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
```

مورد انتظار: `tsc` بدون خطا، `vitest` عدد ۲۷ تست پاسخ‌شده را نشان می‌دهد. اگر عدد دیگری بود، در گزارش بنویسید.

### گام ۳.۲ — بالا آوردن سرور

```bash
cd E:/boya/boya_ai
npm run dev
```

سرور باید این خط را چاپ کند:
```
🚀 [READY] Server on port 3000 [Mode: Development]
```

در log به دنبال این خط‌ها بگردید و آن‌ها را در گزارش کپی کنید:
- `[DB MIGRATE] Running hybrid migrations & self-healing checks...`
- `[DB MIGRATE] Drizzle ORM migrations executed successfully.`
- `[DB MIGRATE] Hybrid migration & self-healing completed successfully.`

اگر به جای این‌ها warningهای `ECONNREFUSED 127.0.0.1:5432` دیدید، یعنی دیتابیس در دسترس نیست — ابتدا دیتابیس را روشن کنید.

### گام ۳.۳ — smoke test اندپوینت‌های بحرانی (با curl بعد از boot)

```bash
# سلامت سرور
curl -s http://localhost:3000/api/health
# مورد انتظار: {"status":"ok",...}

# فید اعلان‌های عمومی (باید باز باشد)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/notifications/public
# مورد انتظار: 200

# فید اعلان‌های کارکنان (بدون توکن باید 401 بدهد)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/notifications
# مورد انتظار: 401

# لیست سالن‌ها
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/salons
# مورد انتظار: 200
```

### گام ۳.۴ — یکپارچگی schema

```sql
-- باید یک رکورد برگرداند
SELECT column_name, udt_name
FROM information_schema.columns
WHERE table_name = 'salons' AND column_name = 'status';
-- مورد انتظار: status | salon_status

-- enumها درست ساخته شده باشند
SELECT e.enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public' AND t.typname = 'salon_status'
ORDER BY e.enumsortorder;
-- مورد انتظار: ۳ رکورد: active, pending, suspended
```

### گام ۳.۵ — خروجی مأموریت ۳

```json
{
  "taskId": "regression-check",
  "typeCheck": "pass",
  "vitestResult": "27 passed",
  "serverBoot": "success",
  "migrationLogs": ["...", "..."],
  "endpointTests": {"health": 200, "notificationsPublic": 200, "notificationsStaffAnonymous": 401, "salonsList": 200},
  "schemaIntegrity": {"statusColumn": "salon_status", "enumLabels": ["active", "pending", "suspended"]},
  "errors": []
}
```

---

## اطلاعات ارتباط با دیتابیس
- نام دیتابیس runtime: `boyadb`
- `src/db/drizzle.config.ts` برای drizzle-kit از `SQL_HOST` / `SQL_ADMIN_USER` / `SQL_ADMIN_PASSWORD` / `SQL_DB_NAME` استفاده می‌کند (نه از `DATABASE_URL`). `.env.example` مقادیر نمونه را نشان می‌دهد.
- runner اصلی پروژه: `npm run db:migrate` → `tsx src/db/migrate.ts`. این همان کدی است که `server.ts` هم در boot اجرا می‌کند.

## قوانین سختگیرانه
۱. `drizzle-kit push` ممنوع است.
۲. `DROP TABLE` یا `DROP COLUMN` ممنوع است مگر اینکه من صراحتاً گفته باشم.
۳. اگر در هر مرحله‌ای خطای غیرمنتظره‌ای دیدید، آن را عیناً در بخش `errors` کپی کنید و ادامه دهید.
۴. اگر بین دو حالت شک کردید، حالت A را انتخاب کنید و انتخاب خود را توضیح دهید.
۵. قبل از هر کاری backup بگیرید (گام ۲.۱).
۶. دستورهای تغییردهنده (ALTER / UPDATE / RENAME) را قبل از اجرا نشان دهید و تأیید بگیرید. دستورهای فقط-خواندنی را مستقماً اجرا کنید.

## خروجی نهایی
سه JSON بالا را در یک پاسخ واحد بدهید، همراه با:

```json
{
  "overallStatus": "success",
  "remainingConcerns": ["..."],
  "filesChanged": ["drizzle/...", "..."]
}
```
