import React, { useState } from 'react';
import { Sparkles, ChevronLeft, Search, Star, ShieldCheck, MapPin, Car, CheckCircle2, Calendar, Phone } from 'lucide-react';
import { SALONS, SERVICE_LINES, Salon, Specialist, SalonService } from '../data/marketplaceData';
import { SalonCard } from './SalonCard';
import { toPersianDigits } from '../utils/persianUtils';

interface HomeScreenProps {
  onNavigateToSalons: (serviceLineId?: string) => void;
  onBookSalon: (salon: Salon, service: SalonService, specialist: Specialist, date: string, time: string) => void;
  onViewSpecialistPortfolio: (specialist: Specialist, salon: Salon) => void;
  savedSalonIds: string[];
  onToggleWishlistSalon: (salonId: string) => void;
  selectedCity: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToSalons,
  onBookSalon,
  onViewSpecialistPortfolio,
  savedSalonIds,
  onToggleWishlistSalon,
  selectedCity,
}) => {
  const [filterMobileOnly, setFilterMobileOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredSalons = SALONS.filter((salon) => {
    if (selectedCity !== 'همه' && !salon.province.includes(selectedCity) && !salon.city.includes(selectedCity)) {
      return false;
    }
    if (filterMobileOnly && !salon.isMobileServiceActive) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = salon.name.toLowerCase().includes(q);
      const matchDistrict = salon.district.toLowerCase().includes(q);
      const matchService = salon.services.some((s) => s.name.toLowerCase().includes(q));
      const matchSpecialist = salon.specialists.some((sp) => sp.name.toLowerCase().includes(q));
      if (!matchName && !matchDistrict && !matchService && !matchSpecialist) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-24">
      {/* Editorial Hero Banner */}
      <section className="relative rounded-3xl overflow-hidden bg-[#1A2942] border border-[#EEDCC5]/40 text-white">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80"
            alt="BOYA Beauty Platform"
            className="w-full h-full object-cover object-center opacity-35 mix-blend-luminosity scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#04142C] via-[#1A2942]/75 to-transparent" />
        </div>

        <div className="relative p-6 sm:p-8 flex flex-col justify-end min-h-[300px] sm:min-h-[340px] max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF3E7]/10 backdrop-blur-md border border-[#FECE57]/30 text-[#FECE57] text-[11px] font-semibold mb-3 self-start">
            <Sparkles className="w-3.5 h-3.5" />
            <span>پلتفرم جامع خدمات و رزرواسیون زیبایی</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif leading-tight text-white mb-2">
            رزرو آنلاین معتبرترین سالن‌ها و اعزام متخصص در محل
          </h1>

          <p className="text-xs sm:text-sm text-[#ded9d2] leading-relaxed mb-5 max-w-md">
            دسترسی آسان به برترین سالن‌ها و متخصصین تایید شده در {selectedCity === 'همه' ? 'سراسر کشور' : selectedCity}. بدون کارمزد، با تایید آنی پیامکی.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateToSalons()}
              className="h-12 px-6 rounded-full bg-[#C59B27] hover:bg-[#B8860B] active:bg-[#B8860B] text-[#1A2942] font-bold text-xs flex items-center gap-2 transition-all shadow-md"
            >
              <span>جستجو و رزرو نوبت</span>
              <ChevronLeft className="w-4 h-4 text-[#1A2942]" />
            </button>

            <button
              onClick={() => setFilterMobileOnly(!filterMobileOnly)}
              className={`h-12 px-5 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center gap-2 transition-all ${
                filterMobileOnly
                  ? 'bg-[#FECE57] text-[#04142C] border-[#FECE57]'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>{filterMobileOnly ? 'فیلتر خدمات در محل فعال است' : 'خدمات در منزل (Mobile Service)'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Search Input */}
      <section className="relative">
        <div className="relative flex items-center">
          <Search className="absolute right-4 w-4 h-4 text-[#C59B27] pointer-events-none" />
          <input
            type="text"
            placeholder="جستجوی سریع: کراتین مو، کاشت ناخن، فیشیال، نام سالن یا متخصص..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white border border-[#E2E8F0] text-xs text-[#1A2942] placeholder:text-[#64748B] focus:border-[#C59B27] focus:ring-1 focus:ring-[#C59B27] outline-none transition-all shadow-sm"
          />
        </div>
      </section>

      {/* Service Lines (دسته‌بندی لاین‌های زیبایی) */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-[#1A2942] font-serif">
            لاین‌های تخصصی خدمات زیبایی
          </h2>
          <button
            onClick={() => onNavigateToSalons()}
            className="text-xs font-semibold text-[#D4A574] hover:text-[#C59B27] flex items-center gap-1"
          >
            <span>مشاهده همه لاین‌ها</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {SERVICE_LINES.map((line) => (
            <button
              key={line.id}
              onClick={() => onNavigateToSalons(line.id)}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#C59B27] hover:bg-[#FAF7F2] transition-all group"
            >
              <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                {line.emoji}
              </span>
              <span className="text-[11px] font-semibold text-[#1A2942] text-center leading-tight">
                {line.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Approved Salons */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-base font-bold text-[#1A2942] font-serif">
              سالن‌ها و کلینیک‌های دارای تاییدیه رسمی بویا
            </h2>
            <p className="text-[11px] text-[#64748B]">
              تضمین اصالت مجوز، پروتکل بهداشتی و نظارت کیفی
            </p>
          </div>
          <button
            onClick={() => onNavigateToSalons()}
            className="text-xs font-semibold text-[#D4A574] hover:text-[#C59B27] flex items-center gap-1"
          >
            <span>لیست کامل</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {filteredSalons.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#EEDCC5] p-6 space-y-2">
            <p className="text-xs font-bold text-[#1A2942]">
              سالنی مطابق با فیلتر انتخابی شما در {selectedCity} یافت نشد
            </p>
            <button
              onClick={() => {
                setFilterMobileOnly(false);
                setSearchQuery('');
              }}
              className="text-xs text-[#C59B27] font-semibold"
            >
              حذف فیلترها و مشاهده همه سالن‌ها
            </button>
          </div>
        ) : (
          filteredSalons.map((salon) => (
            <SalonCard
              key={salon.id}
              salon={salon}
              isWishlisted={savedSalonIds.includes(salon.id)}
              onToggleWishlist={() => onToggleWishlistSalon(salon.id)}
              onBookNow={onBookSalon}
              onViewSpecialistPortfolio={onViewSpecialistPortfolio}
            />
          ))
        )}
      </section>

      {/* Platform Features Banner */}
      <section className="bg-white rounded-3xl p-5 border border-[#EEDCC5] grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="space-y-1">
          <div className="w-9 h-9 rounded-full bg-[#FAF7F2] border border-[#EEDCC5] text-[#C59B27] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-[#1A2942]">جلوگیری از تداخل نوبت</h4>
          <p className="text-[10px] text-[#64748B]">الگوریتم هوشمند عدم تداخل ساعت با GiST Range</p>
        </div>

        <div className="space-y-1">
          <div className="w-9 h-9 rounded-full bg-[#FAF7F2] border border-[#EEDCC5] text-[#10B981] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-[#1A2942]">تاییدیه پیامکی ملی‌پیامک</h4>
          <p className="text-[10px] text-[#64748B]">ارسال فوری کد رهگیری و یادآوری سانس به شماره همراه</p>
        </div>

        <div className="space-y-1">
          <div className="w-9 h-9 rounded-full bg-[#FAF7F2] border border-[#EEDCC5] text-[#775A00] flex items-center justify-center mx-auto">
            <Car className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-[#1A2942]">خدمات سیار در منزل</h4>
          <p className="text-[10px] text-[#64748B]">امکان رزرو اعزام متخصص مجهز به آدرس دلخواه شما</p>
        </div>
      </section>
    </div>
  );
};
