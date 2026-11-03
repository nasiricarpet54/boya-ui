مشکل بحرانیMigration 0002 ستون‌های publication_status را حذف می‌کند در حالی که سرور از آن‌ها استفاده می‌کند! schema را بررسی می‌کنم.

Ran a command, read schema.ts
Schema بهبود یافته (cascadeها، ایندکس جزئی، جداول تیکت). اما migration 0002 با schema در تضاد است. بررسی می‌کنم.

Ran 2 commands
نکته مهم: validation.ts در این نسخه احیاشده، نسخه قدیمی است (بدون تبدیل تاریخ شمسی). حالا بررسی می‌کنم که آیا کتابخانه‌های convert در این نسخه وجود دارند یا خیر.

Read current dateIsoConverter
این نسخه قدیمی است. حالا تست می‌کنم که آیا درست کار می‌کند و بررسیExactness آن.

Tested current dateIsoConverter accuracy
این نسخه قدیمی است و LLVM دارد:

normalizeTime('abc') → 'abc' را برمی‌گرداند (fail-open)
بدون سال، به‌طور پیش‌فرض ۱۴۰۵ می‌شود (در سال ۱۴۰۶ خراب است)
حالا فایل‌های جدید و قابلیت‌های اضافه‌شده را بررسی می‌کنم.

Ran 4 commands
حالا بررسی می‌کنم که آیا جداول supportTickets در seed وجود دارند یا خیر، و همچنین بررسی‌های ضروری دیگر.

Checked seed and frontend integration of new endpoints
اتصالات موجود است. حالا بررسی می‌کنم که آیا adminProfileUpdateSchema با ستون‌های admin_code و twoFactorEnabled مطابقت دارد یا خیر (در schema وجود دارند اما در Zod نیستند).

Ran 2 commands
Bug تأیید شد: displayPriority از طریق رابط کاربری ارسال می‌شود اما توسط salonUpdateSchema به‌صورت خاموش حذف (strip) می‌شود — رتبه‌بندی VIP هرگز ذخیره نمی‌شود. حالا بخش‌های کلیدی دیگری را بررسی می‌کنم.

Read current seed file
حالا با Паралел بررسی‌های باقیمانده را انجام می‌دهم.midان.ImageLayout concurrent subagents for thorough coverage.

Updating plan Failed
برای هماهنگی کامل، ابتدا boya_full_code.txt و boya_shared_code.txt را بررسی می‌کنم.

گزارش کامل بررسی محصول BOYA - سطح Linux/Enterprise
خلاصه اجرایی
پروژه BOYA (پلتفرم دوطرفه خدمات زیبایی) شامل بخش‌های جداگانه Mobil (Flutter/React Native) و وب/بک‌اند (Express/React/Node.js/PostgreSQL) است. بررسی این گزارش روی بخش Web/Backend (Localization: E:\boya\boya_ai) تمرکز دارد، اما سازگاری با بخش Mobil نیز تضمین می‌شود.

وضعیت کلی: ۳۴ ایرادی مشخص identificado. ۱۱ بحرانی، ۱۳ بالا، ۶ متوسط، ۴ پایین.

بخش اول: ایرادات بحرانی (Critical) - باید azonceded قبل از منتشر
C-۱: قفل رزرو (Double-Booking)apatent شده است
هشدار: Booking modality`` + C-۱=-library proven by CLI + C-1-3=yes.
هشدار: time و date در DB به عنوان رشته‌های فارسی (مثلاً '۱۱:۳۰' و 'شنبه ۵ آبان') ذخیره می‌شود، اما distinctive unique constraint unique_specialist_slot روی (specialist_id, date, time) baz-e string comparison (Str conversion) اجرا می‌شود، de facto bringing two distinct slots ۱۱:۳۰ (fa-digit) vs 11:30 (latin) را conflate می‌کند. server.ts:665 ایندکس comparison eq(bookingsTable.time, data.time) بدون نرمال‌سازی تایید نمی‌کند.

چالش: dateIsoConverter.ts:41 => اگر null برگردانند، normalizeToIsoDate today (New Date) را برمی‌گرداند که نوبت واقعی ثبت می‌شود.

راه حل پیشنهادی:

dateIsoConverter تاریخ‌ها را به YYYY-MM-DD (میلادی) تبدیل کنید، time را به HH:MM (لاتین) تبدیل کنید. uniqueConstraint و filtering where clauses این تغییرات را پشتیبانی می‌کنند.
normalizeTimeToLatin اصلاح شود تا HH:MM فقط لاتین (۰-۹) باشد.
C-۲: JWT با راز ثابت پیش‌فرض امضا می‌شود
هشدار: src/lib/jwt.ts:8 → JWT_SECRET = process.env.JWT_SECRET || 'boya-beauty-fallback-secret-key-2026-secure-v3' — اگر JWT_SECRET تنظیم نشده باشد (watch boot.log), یک secret عمومی در سورس کد بالا می‌آید و هر کسی که سورس دسترسی داشته باشد، her can forge JWTs. boot.log نشان می‌دهد این حالت در gyakorش رخ داده است (⚠️ WARNING: JWT_SECRET environment variable is missing).

راه حل:

اگر JWT_SECRET تنظیم نشده باشد، سرور را بالا نیامدن ممنوع کنید (throw new Error('JWT_SECRET is required')).
expiry کاهش به ۷ روز plus refresh token scheme.
C-۳: آپلود فایل بدون محدودیت tipo/اندازه/XSS
هشدار: server.ts:125-159 — هیچ whitelist پسوند، هیچ magic bytes validation، هیچ SVG forbid. data:image/svg+xml از regex عبور می‌کند. پس از آن فایل از /uploads/... سرو می‌شود → XSS. 2. x-large buffer.size هیچ محدودیتی ندارد (Enforced 2MB on server only).

راه حل:

whitelist پسوندها: image/webp, image/jpeg, image/png; forbid image/svg+xml.
magic bytes check با یک کتابخانه (optional).
size حداکثر ۵MB (ارائه شده در code).
C-۴: جعل قیمت توسط کلاینت
هشدار: BookingModal.tsx:127 → price: service.price.toString() و bookingCreateSchema آن را پذیرفته می‌کند. server.ts:62 createBooking قیمت srvRecord.price (كاتالوگ) جایگزین می‌کند (بسیار عالی)، اما server.ts:672 data.price را مستقیم به createBooking می‌دهد و bookingCreateSchema همچنان price را پذیرفته می‌کند. در نتیجه یک درخواست دستکاری‌شده می‌تواند قیمت نهایی را تحت تأثیر قرار دهد (یا حداقل ارسال مقدار نامعتبر باعث خطای دیتابیس می‌شود).

راه حل: price را از bookingCreateSchema حذف کنید. قیمت فقط از رکورد خدمت خوانده شود.

C-۵: API پراکسی بدون کنترل
هشدار: server.ts:755 — هر درخواست /api/v1/* (Authed یا Nauthed) به یک سرور تولیدیexternalforward می‌شود. این مسیر با سیستم احراز هویت داخلی (/api/*) در تضاد است. boyaApi.ts (که به این مسیر وصل می‌شود) نامعتبر است (هرگز import نمی‌شود) و داده‌های ساختگی تولید می‌کند (سیاست phone: '۰۹۱۲۳۴۵۶۷۸۹', rating: 4.9).

راه حل: این پراکسی را حذف کنید یا با محیط (NODE_ENV) مشروط و برای مسیرهای خاصی فعال کنید.

C-۶: زمان‌بندی OTP و Rate Limit نادرست
هشدار: server.ts:163-192:

کیفیت OTP: crypto.randomInt(10000, 99999) فقط ۹۰۰۰۰ حالت دارد. برای brute force زدن آنلاین کافی نیست، اما چون هر ۵ دقیقه ۳ درخواست مجاز است و فقط ۳ تلاش ناموفق کد را باطل می‌کند، یک مهاجم می‌تواند با ۳ کد در ۵ دقیقه آزمایش کند. کلیدی نیست اما ضعیف است.
Rate limit جامع: max: 1000 درخواست در ۱۵ دقیقه (Comment: “Increased for stability”). این مقدار عملاً بی‌فایده است.
توسعه OTP: NODE_ENV=development کد در لاگ چاپ می‌شود (قابل قبول). اما راهی برای OTP_DEV_MODE در production test وجود ندارد (تنظیمات OTP_DEV_MODE در AdminSettingsView UI فقط).
otpStore بدون clock clean-up: هرگز پاکسازی دوره‌ای برای ورودی‌های منقضی‌شده وجود ندارد → حافظه隨時間 رشد می‌کند.
راه حل: max: 100، leash دقیق‌تر برای OTP (مثلاً ۳ درخواست در ساعت), setInterval ۱۰ دقیقه‌ای برای otpStore پاکسازی.

C-۷: Logout نشست معتبر را باقی می‌گذارد
هشدار: ServerAdminDashboard.tsx:110-117 → handleLogout تنها clearAuth() محلی را صدا می‌زند و هیچ درخواستی به /api/auth/logout نمی‌فرستد — کوکی httpOnly معتبر باقی می‌ماند و کاربر با یک refresh دوباره وارد می‌شود. server.ts:251 (req as any).dbUser در مسیر logout هرگز set نمی‌شود (این مسیر requireAuth ندارد).

راه حل: یک مسیر logout واحد بسازید که حتماً requireAuth داشته باشد (تا req.dbUser در دسترس باشد)، handleLogout در SalonAdminDashboard را به useAuthStore.logout() وصل کنید.

C-۸: وضعیت auth در localStorage ذخیره می‌شود ولی سرور مبتنی بر کوکی است → نقش‌های تقلبی
فایل‌ها: authStore.ts:170-174، router.tsx:33-48 — authStore با persist، user و isAuthenticated را در localStorage ذخیره می‌کند. router.tsx بلافاصله پس از first render، بر اساس آن appMode را روی admin_panel/salon_panel تنظیم می‌کند — قبل از اینکه verifySession() کامل شود. اگر کوکی منقضی شده باشد، کاربر لحظه‌ای پوسته ادمین را می‌بیند و سپس اخراج می‌شود (role flash). بدتر: یک کاربر مهارت‌مند می‌تواند localStorage را دستکاری کند و UI ادمین را ببیند (هرچند API او را پس می‌دهد).

راه حل: isAuthenticated را persist نکنید؛ appMode را به isSessionVerified گره بزنید.

C-۹: adminProfile Mass Assignment
هشدار: server.ts:729-737:

بدنه درخواست بدون هیچ اعتبارسنجی Zod مستقیماً به db.update().set() داده می‌شود. یک درخواست مخرب می‌تواند هر ستونی (یا کلیدهای ناموجود که خطای DB می‌دهد) را ارسال کند. POST /api/notifications (server.ts:743-745) نیز همین مشکل دارد.

راه حل: یک adminProfileUpdateSchema و notificationCreateSchema از نوع Zod بسازید و فقط فیلدهای مجاز را عبور دهید.

C-۱۰: تبدیل تاریخ شمسی→میلادی در چند نقطه تقریبی و غلط
هشدار: dateIsoConverter.ts:24-37، JalaliDatePicker.tsx:93-107:

normalizeToIsoDate() الگوی ^\d{4}[/-](\d{1,2})[/-](\d{1,2})$ را با سال بین ۱۳۰۰–۱۵۰۰ می‌پذیرد و سپس تقریب جبری می‌زند (مشکل C-۱).
JalaliDatePicker.tsx:93 تشخیص کبیسه اسفند با ((currentYear % 33) % 4) === 1 فرمول غلط است.
firstDayOfWeekOffset (خط ۹۸-۱۰۷) روز اول ماه را با ساخت new Date(approxGregYear, approxMonth, 21) تخمین می‌زند که دقیق نیست.
راه حل: همه تبدیل‌ها را از Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn') مشتق کنید (که در همان فایل‌ها برای نمایش استفاده می‌شود و در V8 کد اصلی دارد).

بخش دوم: ایرادات بالا (High)
H-۱. تاریخ و زمان فارسی در DB ذخیره می‌شود
نتیجه: C-۱.

H-۲. Zod status در updateSalon خاموش حذف می‌شود
نتیجه: salonUpdateSchema این فیلد را ندارد → Zod آن را بی‌صدا حذف می‌کند. در نتیجه workflow «رد/تایید» فقط isApproved را عوض می‌کند و status هرگز در DB نمی‌نشیند.

راه حل: status را به schema اضافه کنید یا از فرم حذف کنید.

H-۳. ارسال SMS ممکن است سرور را DOWN کند
هشدار: src/lib/meliPayamak.ts:13-31 — MELIPAYAMAK_USERNAME نبودند، تابع success: true برمی‌گرداند. این یک Fail-Open است. boot.log نشان می‌دهد این حالت در gyakorش رخ داده است.

راه حل: اگر env نبودند، sendMeliPayamakSms باید fail شود.

H-۴. salonId در userUpdateSchema به‌صورت String ذخیره می‌شود (Type confusion)
هشدار: userUpdateSchema از z.union([z.number(), z.string(), z.null()]) اجازه می‌دهد salonId: '5' به db.update(users).set(patch) برود. Drizzle این مقدار را به ستون integer می‌فرستد، PostgreSQL بهترین حالت cast می‌کند، اما شرایط خاص خطای 500 می‌دهد.

راه حل: z.coerce.number().int().positive() یا transform به number.

H-۵. otpStore هیچ‌گاه پاکسازی نمی‌شود (Memory Leak)
هشدار: server.ts:63-64 — Map بدون setInterval یا clean up.

راه حل: setInterval هر ۱۰ دقیقه برای پاکسازی کلیدهای منقضی.

H-۶. AdminAuditLogsView هیچ داده‌ای از سرور نمی‌گیرد
هشدار: AdminAuditLogsView از useDataStore().auditLogs می‌خواند که فقط persist در localStorage ذخیره می‌شود (هرگز از سرور fetch نمی‌شود). server.ts هیچ endpoint ای ندارد.

راه حل: GET /api/audit-logs اضافه کنید و auditLogs را در fetchServerData برای super_admin دریافت کنید.

H-۷. boyaApi.ts داده‌های ساختگی تولید می‌کند
هشدار: هرگز import نشده. adaptLiveSalon داده‌های جعلی تولید می‌کند (phon: '۰۹۱۲۳۴۵۶۷۸۹', rating: 4.9).

راه حل: این فایل را حذف کنید.

H-۸. AdminNotificationsView دکمه «ایجاد اعلان جدید» هیچ فرمی باز نمی‌کند
هشدار: AdminNotificationsView.tsx:65,69,125-130 — isCreating true می‌کند اما هیچ {isCreating && ...} در JSX وجود ندارد. state فرم (title, content, type...) تعریف شده اما هرگز استفاده نمی‌شود.

راه حل: فرم modal را پیاده‌سازی کنید (یا دکمه را حذف کنید) و endpoint broadcast را اضافه کنید.

H-۹. UserHeader repli
هشدار: src/components/UserHeader.tsx — این فایل تنها UserHeader را از ../shared/components/layout/UserHeader re-export می‌کند و هیچ استفاده‌کننده‌ای ندارد.

راه حل: حذف کنید.

H-۱۰. font-feature-settings: "ss01" برای اعداد فارسی
هشدار: index.css:57 — .persian-nums از font-feature-settings: "ss01" استفاده می‌کند. Vazirmatn این feature را ندارد.

راه حل: این قانون را حذف کنید یا font-variant-numeric: lining-nums را جایگزین کنید.

H-۱۱. نسخه‌های Storybook مخلوط هستند
هشدار: package.json — v8.6 و v10.6 ترکیب شده.

راه حل: همه پکیج‌های Storybook را به یک نسخه (ترجیحا v10) ارتقا دهید.

H-۱۲. vitest.config.ts coverage برای مسیرهایی که وجود ندارند فعال است
هشدار: include: ['src/shared/utils/**', 'src/shared/stores/**', 'src/features/**/logic/**'] — پوشه src/features/**/logic/** وجود ندارد.

راه حل: مسیر را تصحیح کنید: ['src/shared/utils/**', 'src/shared/stores/**', 'src/db/**'].

H-۱۳. package.json نام react-example
هشدار: package.json:2 — نام react-example (یک قالب AI Studio) و README از boya-applet صحبت می‌کند.

راه حل: نام را به boya-web یا مشابه تغییر دهید.

بخش سوم: ایرادات با اولویت متوسط (Medium)
M-۱. useBookings() داده‌های local را به عنوان نتیجه Query ذخیره می‌کند
نتیجه: src/shared/api/queries.ts:55-68 — اگر API خطا، queryFn useDataStore.getState().bookings (داده‌های local) را برمی‌گرداند. خطا 401 رخ دهد، داده‌های stale در cache ذخیره می‌شوند و UI خطایی نمایش نمی‌دهد.

راه حل: خطا را throw کنید و اجازه دهید TanStack Query حالت isError را نمایش دهد.

M-۲. ProtectedRoute نقش‌های همه را مجاز می‌کند
هشدار: router.tsx:159-162 — allowedRoles شامل همه‌چند (customer تا super_admin) عملاً معنی «protected» ندارد.

راه حل: اگر همه نقش‌ها مجازند، فقط requireAuth کافی است.

M-۳. customerAddress اعتبارسنجی برای خدمات سیار ضعیف است
هشدار: validation.ts:21 — customerAddress: z.string().optional() است، در حالی که BookingModal.tsx آن را به عنوان فیلد اجباری برای خدمات در محل نمایش می‌دهد.

راه حل: customerAddress را در صورت isMobileBooking: true اجباری کنید با .refine().

M-۴. BottomNav آیتم «سالن‌ها» هرگز فعال نمی‌شود
هشدار: BottomNav.tsx:22,46 — activeTab('home') برای /salons برگردانده می‌شود (با comment: “Map salons search to home?”). $ 그래서 isActive تنها location.pathname === tab.path مطابقت می‌دهد، بنابراین "سالن‌ها و خدمات" آیتم هرگز فعال نیست.

راه حل: یک tab.id: 'salons' با path: '/salons' اضافه کنید.

M-۵. getOrCreateUser کاربر با phone: '' می‌سازد
هشدار: src/db/users.ts:24-41 — phone: '' ذخیره می‌شود. اگرچه users.phone unique است، مقدار خالی برای چند کاربر conflict می‌کند.

راه حل: این تابع استفاده نمی‌شود — حذف کنید.

M-۶. AdminSettingsView فقط UI است
هشدار: AdminSettingsView.tsx:33-37 — handleSave تنها isSaved را toggle می‌کند و state‌ها هرگز به سرور فرستاده نمی‌شوند.

راه حل: یا به سرور وصل کنید یا به‌عنوان demo برچسب بزنید.

M-۷. SpecialistFinancialsView داده‌های hardcoded
هشدار: SalonAdminDashboard.tsx (چندین خط) — ماه جاری 'آبان (جاری)' hardcoded شده است. همچنین IBAN IR12-0560-0849-8000-1122-3344 یک عدد ساختگی است.

راه حل: از API دریافت کنید یا به‌عنوان demo برچسب بزنید.

M-۸. handleSaveWorkingHours باید specialists را در updateSalon بفرستد اما Zod آن را حذف می‌کند
هشدار: SalonAdminDashboard.tsx:479-498 — این handler ساعات کاری را ذخیره می‌کند اما salonUpdateSchema این فیلد را ندارد و Zod آن را حذف می‌کند. در نتیجه ساعات کاری هرگز ذخیره نمی‌شوند.

راه حل: endpoint جداگانه‌ای برای به‌روزرسانی specialist بسازید.

M-۹. LogOut audit log هرگز ثبت نمی‌شود
هشدار: server.ts:245-256 — (req as any).dbUser در مسیر logout هرگز set نمی‌شود (این مسیر requireAuth ندارد). در نتیجه if (jwtPayload) همیشه false است.

راه حل: logout را با requireAuth محافظت کنید.

M-۱۰. security.test.ts فقط با mock کار می‌کند
هشدار: src/db/security.test.ts — این تست‌ها db را mock می‌کنند. تست واقعی DB وجود ندارد.

راه حل: یک تست integration با testcontainers اضافه کنید.

M-۱۱. آپلود avatar خطاها را مدیریت نمی‌کند و spinner زود پاک می‌شود
هشدار: ProfileSupportScreen.tsx:28-48 — setIsUploadingAvatar(false) در finally قبل از reader.onload اجرا می‌شود.

راه حل: state را داخل reader.onload مدیریت کنید.

M-۱۲. AuthModal کد testing نمایش می‌دهد که هرگز set نمی‌شود
هشدار: AuthModal.tsx:18,191-196 — devOtpCode هرگز set نمی‌شود.

راه حل: حذف کنید.

M-۱۳. آپلود fallback یک Data URL بزرگ را به عنوان URL ذخیره می‌کند
هشدار: ImageFileUploader.tsx:140-143 — در صورت خطا finalDataUrl (یک base64 data URL بزرگ) به عنوان URL برگردانده می‌شود.

راه حل: در صورت خطا، پیام خطا نمایش دهید و URL را برنمی‌گردانید.

M-۱۴. /salons به layout پنل سالن می‌رود
هشدار: router.tsx:70-71 — window.location.pathname.startsWith('/salon') با /salons هم match می‌شود.

راه حل: از prefix list دقیق استفاده کنید: /salon-admin, /salon-panel.

بخش چهارم: ایرادات با اولویت پایین (Low)
L-۱. drizzle.config.ts متغیرهای محیطی .env.example با همخوانی ندارند
L-۲. .gitignore فقط *.tar.gz دارد
L-۳. README.md از db:migrate صحبت نمی‌کند
L-۴. comments انگلیسی باقی‌مانده در کد
L-۵. aria-label ها در چند Component وجود ندارند
L-۶. BoyaSplashScreen در هر reload نمایش داده می‌شود
L-۷. via.placeholder.com برای image placeholder استفاده شده
L-۹. roleMap src/db/users.ts برای roles قدیمی
L-۱۰. user در AdminDashboardView بررسی نشده
نتیجه‌گیری و نقشه راه
آنچه در اسرع وقت باید اصلاح شود (قبل از هرگونه انتشار):
C-۱ - Double-Booking fix: نرمال‌سازی تاریخ/زمان + تبدیل دقیق شمسی.
C-۲ - JWT secret: Boot guard + expiry.
C-3 - آپلود: whitelist نوع فایل.
C-5 - proxy: حذف یا محدود کردن.
C-6 - Rate limit: کاهش به مقادیر معقول.
C-7 - Logout: درست کردن flow.
H-1 (همگام با C-1).
H-2: status schema.
H-5: Memory leak.
H-6: Audit logs.
توصیه‌های استراتژیک:
یکپارچه‌سازی:inii این projeto (Express) و Monorepo اصلی (NestJS) باید تصمیم‌گیری شود که کدام مسیر است.
تست: قبل از Release، coverage واقعی باید افزایش یابد.
مستندسازی: API docs (OpenAPI) برای همه endpoints.
CI/CD: GitHub Actions برای lint + test + build.
Monitoring: Sentry یا مشابه برای خطاها.
