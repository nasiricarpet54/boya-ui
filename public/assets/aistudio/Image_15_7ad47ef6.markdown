---
name: Boya Persian Luxury Marketplace
colors:
  surface: '#fef9f1'
  surface-dim: '#ded9d2'
  surface-bright: '#fef9f1'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f3eb'
  surface-container: '#f2ede5'
  surface-container-high: '#ece8e0'
  surface-container-highest: '#e7e2da'
  on-surface: '#1d1c17'
  on-surface-variant: '#44474d'
  inverse-surface: '#32302b'
  inverse-on-surface: '#f5f0e8'
  outline: '#75777e'
  outline-variant: '#c5c6ce'
  surface-tint: '#505f7a'
  primary: '#04142c'
  on-primary: '#ffffff'
  primary-container: '#1a2942'
  on-primary-container: '#8290ae'
  inverse-primary: '#b8c7e7'
  secondary: '#775a00'
  on-secondary: '#ffffff'
  secondary-container: '#fece57'
  on-secondary-container: '#735700'
  tertiary: '#211000'
  on-tertiary: '#ffffff'
  tertiary-container: '#3e2200'
  on-tertiary-container: '#b38759'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#b8c7e7'
  on-primary-fixed: '#0b1b34'
  on-primary-fixed-variant: '#384762'
  secondary-fixed: '#ffdf98'
  secondary-fixed-dim: '#eec14b'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#5a4300'
  tertiary-fixed: '#ffdcbc'
  tertiary-fixed-dim: '#efbd8a'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#614018'
  background: '#fef9f1'
  on-background: '#1d1c17'
  surface-variant: '#e7e2da'
typography:
  headline-xl:
    fontFamily: Vazirmatn
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Vazirmatn
    fontSize: 26px
    fontWeight: '800'
    lineHeight: 38px
  headline-lg:
    fontFamily: Vazirmatn
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Vazirmatn
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Vazirmatn
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Vazirmatn
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Vazirmatn
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Vazirmatn
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Vazirmatn
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Vazirmatn
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Vazirmatn
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
  price-display:
    fontFamily: Vazirmatn
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-sm: 0.5rem
  margin: 1rem
  margin-lg: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system delivers a refined, high-end editorial atmosphere tailored for a Persian beauty, skincare, and wellness marketplace. Rooted in Persian visual culture, it pairs warm natural undertones with architectural rigor, evoking feelings of calm indulgence, clinical authenticity, and personal prestige.

### Style Approach
- **Minimalist Tactility:** Clean geometric card planes over an organic, calming light cream canvas.
- **Understated Opulence:** Restrained metallic warmth balanced with deep navy precision rather than loud ostentation.
- **RTL-First Structure:** Layouts prioritize naturally weighted Persian reading orders (`dir="rtl"`), ensuring visual tension, icon directions, and alignments preserve typographic balance.
- **Strict Avoidance:** No generic splash gradients, no heavy blurred shadows on repetitive grid items, and no hidden multi-level hamburger menus. Primary journeys stay transparent, immediate, and thumb-friendly.

## Colors

The palette establishes a balance between grounded authority and soft, sun-warmed luxury:

- **Primary Canvas (`#F5F0E8`):** An uninterrupted, flat, matte light cream background providing soothing contrast against pure white cards without digital harshness.
- **Primary Navy (`#1A2942`):** Carries major headlines, icons, structural elements, and grounding UI surfaces.
- **Accent Golds (`#C59B27` primary accent, `#D4A574` rose gold highlight, `#B8860B` active/pressed):** Reserved for intentional points of conversion, active badges, premium merchant emblems, and verified seals.
- **Surfaces (`#FFFFFF`):** High-clarity white card backgrounds that elevate products, photography, and salon services.
- **Borders (`#EEDCC5` and `#E2E8F0`):** Hairline, warm neutral borders that define card structures without shadow artifacts.
- **Muted & Meta Text (`#64748B`):** Cool slate tone ensuring high legibility for product descriptions, ratings counters, and price subtitles.
- **Validation & Success (`#10B981`):** Crisp emerald green for appointment confirmations, in-stock notices, and verified badges.

## Typography

Vazirmatn is deployed across all hierarchical roles to guarantee native Persian shaping, graceful kerning, and balanced ascenders/descenders.

- **Baseline Alignment:** Vazirmatn's proportions require generous line heights (`1.5` to `1.7`) to prevent clipping of diacritics and Persian vowels (Tashdid, Tanwin).
- **Numerals:** All prices, ratings, and phone numbers must utilize Persian glyphs (`۰-۹`) using font feature settings `font-feature-settings: "ss01"` or localized numeral strings.
- **Weight Pairing:** Headlines utilize Bold (700) and ExtraBold (800) in Navy `#1A2942` for editorial impact; interactive elements employ SemiBold (600) for tactile legibility; body content remains Regular (400).

## Layout & Spacing

The structural layout conforms strictly to a 390px mobile viewport baseline with complete right-to-left (`dir="rtl"`) orientation.

- **Columns & Canvas:** 4-column fluid mobile grid with 16px (`1rem`) outer canvas margins and 12px (`0.75rem`) gutters between adjacent cards.
- **RTL Fluidity:** Visual balance flows right-to-left. Leading elements (icons, avatar thumbnails, product badges) align right; trailing controls (chevrons, price totals, action buttons) anchor left.
- **Vertical Spacing Scale:** 4px baseline module (`0.25rem`). Standard element stack spacing defaults to `space-md` (12px), while inter-section padding uses `space-xl` (24px) to retain breathing room.
- **Bottom Clearance:** Maintain 80px safe area above the bottom navigation bar on all scrollable views to prevent interaction clashes with device gesture bars.

## Elevation & Depth

This system avoids blurred dark drop shadows on cards to maintain an editorial, clean cosmetic surface aesthetic.

- **Surface Tiers & Hairline Definition:** Depth is defined by pure white `#FFFFFF` cards resting on the `#F5F0E8` canvas, bordered with subtle 1px outlines in warm neutral tint (`rgba(212, 165, 116, 0.22)` or `#E2E8F0`).
- **Floating Modals & Sheets:** Bottom action sheets and sticky checkout ribbons use a subtle ambient lift: `0px -4px 20px rgba(26, 41, 66, 0.05)`, preserving soft boundaries without black grime.
- **Active State Highlights:** Selected service slots or chosen cosmetic variations trigger a 1.5px solid border in `#C59B27` and a muted warm surface tint (`#FAF7F2`) rather than artificial elevation.

## Shapes

The geometric contour balances modern cosmetics packaging with approachable mobile interaction:

- **Cards & Containers:** `rounded-lg` (16px / 1rem) for product cards, service tiles, and booking panels.
- **Buttons & Pills:** Pill-shaped radius (full round / 9999px) for interactive buttons, category chips, and filter toggles to emulate beauty stones and sleek cosmetic cylinders.
- **Thumbnails & Media:** 12px corner rounding for square cosmetic imagery, maintaining soft corners without distorting product proportions.

## Components

### Buttons
- **Primary:** Full warm gold background (`#C59B27`), text in dark navy (`#1A2942`) or white (`#FFFFFF`) with SemiBold weight. Pill rounded, 48px height for effortless thumb targets. Active state dims to `#B8860B`.
- **Secondary / Outlined:** Transparent surface with a 1.5px navy border (`#1A2942`), navy text.
- **Tertiary / Text:** No border, warm rose gold text (`#D4A574`) with an RTL-oriented leftward arrow chevron.

### Cards (Product & Service)
- Built on `#FFFFFF` with a 1px delicate border (`#EEDCC5`).
- Images sit flush at top or with an 8px inset.
- Pricing displayed in Persian format on the left edge; product name, brand tag, and category anchored on the right.
- Zero drop shadow in resting state.

### Filter & Category Chips
- 36px height, pill radius.
- Inactive: `#FFFFFF` fill with `#E2E8F0` border and `#64748B` text.
- Active: `#1A2942` fill with `#FFFFFF` text, or subtle gold tint (`#FAF3E7`) with `#C59B27` border and text.

### Inputs & Search Bars
- 48px height, rounded-lg (12px or 16px).
- Flat `#FFFFFF` fill with 1px border `#E2E8F0`. On focus, transitions to 1.5px gold border (`#C59B27`).
- Search icon positioned on the far right; clear icon positioned on the far left.

### Navigation Architecture
- **No Hamburger Menus:** Replaced with a sticky, refined 5-tab bottom navigation bar (`Home`, `Marketplace`, `Appointments/Salons`, `Saved`, `Profile`).
- Bottom bar utilizes a frosted white surface (`#FFFFFF` with 98% opacity) with a 1px top border in `#EEDCC5`. Active tab highlighted via `#C59B27` icon and label dot.

### Specialized Marketplace Elements
- **Service Time Slots:** Compact white pills with Persian start times. Booked slots marked muted slate `#64748B` with diagonal crossline; selected slot marked with `#C59B27` solid border.
- **Beauty Specialist Badges:** Micro-pills with 10px Vazirmatn type, displaying verified checkmark in `#10B981` paired with metallic bronze borders.