-- BOYA Platform - Backup of salons table before applying salons.status migration
-- Generated: 2026-11-05
-- Total records: 11

BEGIN;

CREATE TABLE IF NOT EXISTS salons_backup_20261105 AS SELECT * FROM salons;

-- Raw records:
-- 1: tenant-1, سالن زیبایی ونوس
-- 2: tnt-tehran-elahiyeh-01, سالن زیبایی و عمارت گل سرخ
-- 3: tnt-tehran-zaferanieh-02, کلینیک و مرکز تخصصی پوست و لیزر صبا
-- 4: tnt-shiraz-ghasrodasht-03, عمارت و اسپا پرشیا پالاس
-- 5: tnt-isfahan-mardavij-04, عمارت و استودیو زیبایی پرنسس اصفهان
-- 6: tnt-mashhad-sajjad-05, عمارت بیوتی و اسپا دیاموند مشهد
-- 7: tnt-tabriz-valiasr-06, سالن زیبایی و استودیو تخصصی الیزه تبریز
-- 8: tnt-karaj-azimieh-07, عمارت زیبایی و کلینیک پوست رز گلد کرج
-- 9: tnt-gilan-rasht-golsar-08, عمارت زیبایی و اسپا مانلی رشت
-- 10: tnt-khuzestan-ahvaz-kianpars-09, سالن زیبایی و آکادمی تخصصی اروند اهواز
-- 11: tnt-tehran-saadatabad-10, استودیو بیوتی و لاین اکستنشن لوکس آوینا

COMMIT;
