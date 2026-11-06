# Critique — BOYA customer panel home screen

Target: `src/features/home/components/HomeScreen.tsx`
Method: dual-agent (A: a968175585bb50bcd · B: afe7cec946cfbe72f)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | bare spinner, no `role="status"`, error has `role="alert"` but no retry action |
| 2 | Match System / Real World | 3 | Jalali/toman/31 provinces strong; jargon loses a point (لاین‌های تخصصی، ویترین رایگان، فاز ۱) |
| 3 | User Control and Freedom | 2 | favorites toggle has toast but no undo; filters persist with no reset except empty state |
| 4 | Consistency and Standards | 2 | one concept, three names (خدمات در منزل / خدمات در محل / خدمات سیار); `no-scrollbar` (undefined) vs `scrollbar-none` (defined) |
| 5 | Error Prevention | 1 | category taps silently drop the filter; rec pills silently show all; no slot-conflict check before insert |
| 6 | Recognition Rather Than Recall | 3 | all visible, but each card demands re-reading a 5-section form |
| 7 | Flexibility and Efficiency | 2 | ⌘K useless on target device; GlobalSearchModal `focusedIndex` state never wired |
| 8 | Aesthetic and Minimalist Design | 2 | 3 hero CTAs + duplicate search + 8 tiles + carousel of full booking cards |
| 9 | Error Recovery | 2 | generic خطایی در دریافت اطلاعات with no recovery action |
| 10 | Help and Documentation | 1 | no onboarding, no tooltips, support buried in /profile |
| **Total** | | **20/40** | **Acceptable — significant improvements needed before users are happy** |

## Design Specificity Verdict

**Half-authored.** The Persian engineering is genuine — Jalali date generation, Persian digits, toman, 31-province cascade, Persian geo error copy, a commissioned palette with motion tokens that carry a philosophy. But the page structure is category-interchangeable: hero + fake search + round category grid + "personalized" carousel + vertical feed + trust strip. Worse, every feed "card" is actually a complete booking application form (line filters, specialist roster, service list, 30-day strip, Jalali calendar, 8-slot time grid, CTA) — browse and transact modes collapsed into one repeated unit.

**Deterministic scan:** clean — `impeccable detect --json` returned `[]`, exit 0, twice and with `--no-config`. Caveat: the scan is regex-only on `.tsx` source; element rules (contrast, tiny-text) cannot fire, so clean is an undercount, not a bill of health.

**Visual overlays:** injection not available — no dev server was serving at the time of the run (`curl :3000` → 000, no listener). No overlay was injected and none is claimed.

## Overall Impression

The craft is real and the Persian foundation is strong, but three things a user touches in the first 30 seconds are broken or fabricated: the category tiles silently drop their filter, the "personalized" recommendations are hardcoded trending copy for a zero-history user, and "nearest to you" is actually VIP-ordered with distances measured from a fake hardcoded Tehran point. Nothing else on the screen produces value while the category tap does nothing.

## What's Working

1. **Persian-first engineering** — `generateUpcomingDays` builds real Jalali labels, `normalizeToIsoDate` parses Persian textual dates, `findNearestIranianRegion` maps GPS to the nearest Iranian county with Persian fallback copy.
2. **Motion system with a philosophy** — press/hover scale tokens plus a `prefers-reduced-motion` block that keeps colour feedback because "it carries meaning".
3. **BookingModal confirmation** — tracking code BY-xxxxxx, SMS note, itemized summary, پرداخت در محل سالن. The one screen that feels finished.

## Priority Issues

### [P0] Category tiles are inert
**What:** `HomeScreen.tsx:224` navigates with `search:{ service: line.name }` but `SalonsScreen.tsx:40` reads `searchParams?.serviceLine` and validates against SERVICE_LINES ids (`'hair'`). Both key and value are wrong; the filter is silently discarded.
**Why it matters:** the first explore action a new user takes is a no-op that teaches helplessness inside 30 seconds.
**Fix:** `search:{ serviceLine: line.id }`, plus a regression test over every SERVICE_LINES entry.
**Suggested command:** `/impeccable harden`

### [P0] Personalization lies
**What:** for a zero-history user the engine falls back to hardcoded trending (`matchScore: 89`) while the copy claims «بر اساس سوابق رزرو و علایق شما تنظیم شده است»; `HomeScreen.tsx:48–49` silently renders ALL recommendations when a pill filter is empty; `reasonText` is never rendered at all.
**Why it matters:** trust is the product's entire proposition for Niloofar; a fabricated claim breaks it before the first booking.
**Fix:** render `reasonText`, retitle to پرفروش‌ترین‌های این هفته when only trending is available, make empty pills honest.
**Suggested command:** `/impeccable clarify`

### [P0] Fabricated proximity
**What:** the feed is VIP-sorted by default (`sortBy: SalonSortOption = 'vip'` hoists `isVip`) while the subtitle says «بر اساس موقعیت شما», and `locationStore` seeds every visitor with fixed coords `35.7951, 51.4239` labelled «موقعیت آزمایشی: تهران (الهیه)».
**Why it matters:** for a user in Isfahan or Mashhad, "near you" is wrong on every card, and the order is paid placement presented as relevance.
**Fix:** sort by distance (or align the copy), seed coords as null and prompt for GPS so no false distance is shown.
**Suggested command:** `/impeccable audit`

### [P1] SalonCard is the booking form
**What:** unbounded service/specialist lists, 30-day strip + full Jalali calendar toggle + 8-slot grid per card, squeezed to `min-w-[260px]` in the recommendations carousel — each card is ~1500px+ with two horizontal scrollers.
**Why it matters:** browse and transact are collapsed into one repeated unit; the feed is exhausting and the carousel truncates the widget.
**Fix:** split a true SalonCard from the booking widget (move the booking surface to a detail page or expandable sheet), bound the service list to 3 with «+N خدمت دیگر».
**Suggested command:** `/impeccable distill`

### [P1] Times New Roman headline
**What:** `font-serif` (line 142) is never overridden and no `--font-serif` token is defined, so Tailwind v4 resolves it to `ui-serif, Georgia, Times New Roman` — the main Persian headline renders in Times New Roman while Vazirmatn is registered for body only.
**Why it matters:** the first thing a Persian-reading user sees looks foreign and unfinished, the opposite of trustworthy-local.
**Fix:** define `--font-serif: 'Vazirmatn', ...` in `:root` of `src/index.css`; audit `font-mono`/`font-serif` for Persian glyph fallbacks app-wide (47 uses).
**Suggested command:** `/impeccable typeset`

### [P2] Hero duplicates the header; undefined class
**What:** the hero's location button and search trigger open the same modals as Header; `no-scrollbar` (HomeScreen.tsx:250, 271) is defined nowhere — the compiled CSS contains only `.scrollbar-none`.
**Why it matters:** two competing paths to the same action plus a class that silently does nothing.
**Fix:** drop the hero duplications; use `scrollbar-none` or register `no-scrollbar` as an `@utility`.
**Suggested command:** `/impeccable quieter`

### [P2] Empty/error states have no recovery
**What:** the `isError` block (lines 109–116) has no retry despite React Query being available; no skeleton; loading causes layout shift.
**Why it matters:** a dead-end error with no way back reads as broken, not as a network condition.
**Fix:** wire تلاش مجدد to `refetch`, add `role="status"`, skeleton cards.
**Suggested command:** `/impeccable harden`

### [P3] Polish
`toPersianDigits`/`formatPrice` imported but unused (line 15); ⌘K and جستجوی سراسری hidden below `md:`/`sm:` on a mobile-first product; dead `focusedIndex` state in GlobalSearchModal.
**Suggested command:** `/impeccable polish`

## Persona Red Flags

**Casey (distracted mobile):** no salon visible without ~2 scrolls (300px hero + search + 8 tiles + carousel); wishlist heart is 36px at the top-left of the cover image; two date systems per card; `handleBooking` silently books an ۱۱:۳۰ slot she never picked; transient toasts with no undo.

**Jordan (first-timer):** zero onboarding; she must infer that the specialist/service/day/time rows are silent selections feeding the CTA; smart claims outpace reality; trust evidence sits at the bottom, unlinked, after the decision; her first interaction may be a no-op that trains unreliability.

**Niloofar (Iranian woman, 20s–30s, one-handed, never booked):** the headline typeset in Times New Roman reads as foreign; she is lied to about proximity (distances from a hardcoded Tehran point while the feed says «بر اساس موقعیت شما», order is paid VIP placement); her real trust criteria (female specialists, hygiene, verified-vs-paid) are unaddressable from home; operator jargon with no vocabulary bridge (لاین، ویترین رایگان، فاز ۱، سانس آزاد تعیین وقت); the terminal action sits at the bottom of a very tall card.

## Minor Observations

The error state uses `role="alert"` (good) but the loading state has no `role="status"`. The Unsplash hero image is a fixed remote URL at `opacity-30` — no layout shift, but a single point of failure on a slow connection. The trust strip labels are bare text with no links.

## Questions to Consider

- اگر فیلتر لاین‌ها واقعاً کار می‌کرد، آیا هنوز به ۸ کاشی نیاز بود یا ۴ کاشی اصلی + «همه» کافی است؟
- آیا «پیشنهادهای هوشمند» باید اصلاً برای کاربر بدون تاریخچه نمایش داده شود، یا بهتر است در اولین ورود چیزی واقعی‌تر جای آن بنشیند؟
- وقتی ترتیب سالن‌ها بر اساس VIP است، زیرعنوان «بر اساس موقعیت شما» چه ارزشی به کاربر می‌دهد؟
