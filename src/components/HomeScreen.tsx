import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ChevronLeft,
  Search,
  Star,
  ShieldCheck,
  MapPin,
  Car,
  CheckCircle2,
  Calendar,
  Phone,
  Bookmark,
  Heart,
  RefreshCw,
  Clock,
  Layers,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';
import { SALONS, SERVICE_LINES, Salon, Specialist, SalonService, Booking } from '../data/marketplaceData';
import { SalonCard } from './SalonCard';
import { toPersianDigits, formatPrice } from '../utils/persianUtils';
import { generatePersonalizedRecommendations, RecommendedServiceItem } from '../utils/recommendationEngine';
import { sortSalonsForSearchResults } from '../utils/salonRanking';
import { BeautyActivityIcon } from './BeautyActivityIcon';

interface HomeScreenProps {
  salons?: Salon[];
  bookings?: Booking[];
  onNavigateToSalons: (serviceLineId?: string) => void;
  onBookSalon: (salon: Salon, service: SalonService, specialist: Specialist, date: string, time: string) => void;
  onViewSpecialistPortfolio: (specialist: Specialist, salon: Salon) => void;
  savedSalonIds: string[];
  onToggleWishlistSalon: (salonId: string) => void;
  selectedCity: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  salons = SALONS,
  bookings = [],
  onNavigateToSalons,
  onBookSalon,
  onViewSpecialistPortfolio,
  savedSalonIds,
  onToggleWishlistSalon,
  selectedCity,
}) => {
  const [filterMobileOnly, setFilterMobileOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recommendationFilter, setRecommendationFilter] = useState<'all' | 'routine_renewal' | 'booking_history' | 'saved_salon' | 'trending'>('all');

  // Generate personalized recommendations
  const recommendations = useMemo(() => {
    return generatePersonalizedRecommendations(bookings, savedSalonIds, salons, selectedCity);
  }, [bookings, savedSalonIds, salons, selectedCity]);

  const filteredRecommendations = useMemo(() => {
    if (recommendationFilter === 'all') return recommendations;
    const filtered = recommendations.filter((r) => r.reasonCategory === recommendationFilter);
    return filtered.length > 0 ? filtered : recommendations;
  }, [recommendations, recommendationFilter]);

  // Search results sorted with VIP salons first
  const filteredSalons = useMemo(() => {
    const list = salons.filter((salon) => {
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
    return sortSalonsForSearchResults(list);
  }, [salons, selectedCity, filterMobileOnly, searchQuery]);

  return (
    <div className="space-y-6 pb-24">
      {/* Editorial Hero Banner with Official Deep Petrol Teal & Rose Gold Highlights */}
      <section className="relative rounded-3xl overflow-hidden bg-[#173B3F] border border-[#6F9A8D]/30 text-white shadow-lg shadow-[#173B3F]/15">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80"
            alt="BOYA Beauty Platform"
            className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B2626] via-[#173B3F]/80 to-transparent" />
        </div>

        <div className="relative p-6 sm:p-8 flex flex-col justify-end min-h-[300px] sm:min-h-[340px] max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-[#D9A2B0]/40 text-[#D9A2B0] text-[11px] font-bold mb-3 self-start">
            <Sparkles className="w-3.5 h-3.5" />
            <span>پلتفرم جامع خدمات و رزرواسیون زیبایی بویا</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif leading-tight text-white mb-2">
            رزرو آنلاین معتبرترین سالن‌ها و اعزام متخصص در محل
          </h1>

          <p className="text-xs sm:text-sm text-[#E8F0EF] leading-relaxed mb-5 max-w-md">
            دسترسی آسان به برترین سالن‌ها و متخصصین تایید شده در {selectedCity === 'همه' ? 'سراسر کشور' : selectedCity}. بدون کارمزد، با تایید آنی پیامکی.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateToSalons()}
              className="h-12 px-6 rounded-full bg-[#D9A2B0] hover:bg-[#E6B5C0] active:bg-[#C98F9F] text-[#173B3F] font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-[#D9A2B0]/25"
            >
              <span>جستجو و رزرو نوبت</span>
              <ChevronLeft className="w-4 h-4 text-[#173B3F]" />
            </button>

            <button
              onClick={() => setFilterMobileOnly(!filterMobileOnly)}
              className={`h-12 px-5 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center gap-2 transition-all ${
                filterMobileOnly
                  ? 'bg-[#C99558] text-[#173B3F] border-[#C99558] shadow-md font-bold'
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
          <Search className="absolute right-4 w-4 h-4 text-[#173B3F] pointer-events-none" />
          <input
            type="text"
            placeholder="جستجوی سریع: کراتین مو، کاشت ناخن، فیشیال، نام سالن یا متخصص..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white border border-[#E7E2DA] text-xs text-[#1C1C1C] placeholder:text-[#6C6C6C] focus:border-[#173B3F] focus:ring-1 focus:ring-[#173B3F] outline-none transition-all shadow-sm"
          />
        </div>
      </section>

      {/* Service Lines (دسته‌بندی لاین‌های زیبایی با آیکون‌های تخصصی شخصی‌سازی‌شده) */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-[#173B3F] font-serif">
            لاین‌های تخصصی خدمات زیبایی
          </h2>
          <button
            onClick={() => onNavigateToSalons()}
            className="text-xs font-semibold text-[#173B3F] hover:text-[#0F3232] flex items-center gap-1"
          >
            <span>مشاهده همه لاین‌ها</span>
            <ChevronLeft className="w-3.5 h-3.5 text-[#173B3F]" />
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
          {SERVICE_LINES.map((line) => (
            <button
              key={line.id}
              onClick={() => onNavigateToSalons(line.id)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#E7E2DA] hover:border-[#173B3F] hover:bg-[#E8F0EF]/40 transition-all duration-200 group shadow-sm"
            >
              <div className="mb-1.5 transition-transform duration-200 group-hover:scale-110">
                <BeautyActivityIcon activityId={line.id} size="md" />
              </div>
              <span className="text-[11px] font-bold text-[#1C1C1C] text-center leading-tight">
                {line.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Personalized Service Recommendation Engine (پیشنهادهای هوشمند اختصاصی بر مبنای سوابق) */}
      <section className="bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F2] to-[#E8F0EF]/70 rounded-3xl p-5 border border-[#E7E2DA] shadow-sm space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E2DA] pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF2EF] text-[#2E5E52] border border-[#6F9A8D]/30 text-[11px] font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#6F9A8D]" />
              <span>موتور هوشمند پیشنهاد خدمات بویا</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#173B3F] font-serif">
              پیشنهادهای اختصاصی بر مبنای سوابق و سالن‌های شما
            </h2>
            <p className="text-[11px] text-[#6C6C6C]">
              تحلیل هوشمند روتین‌های نوبت‌گیری، چرخه مراقبت دوره‌ای و علاقه‌مندی‌های ثبت‌شده
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-[#6C6C6C] font-medium bg-white px-2.5 py-1 rounded-full border border-[#E7E2DA]">
              {toPersianDigits(filteredRecommendations.length)} خدمت منتخب
            </span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setRecommendationFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              recommendationFilter === 'all'
                ? 'bg-[#173B3F] text-white shadow-sm'
                : 'bg-white hover:bg-[#E8F0EF] text-[#1C1C1C] border border-[#E7E2DA]'
            }`}
          >
            همه پیشنهادها ({toPersianDigits(recommendations.length)})
          </button>
          <button
            onClick={() => setRecommendationFilter('routine_renewal')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              recommendationFilter === 'routine_renewal'
                ? 'bg-[#D9A2B0] text-[#173B3F] shadow-sm font-bold'
                : 'bg-white hover:bg-[#E8F0EF] text-[#1C1C1C] border border-[#E7E2DA]'
            }`}
          >
            <RefreshCw className="w-3 h-3 text-[#173B3F]" />
            <span>موعد تمدید روتین</span>
          </button>
          <button
            onClick={() => setRecommendationFilter('booking_history')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              recommendationFilter === 'booking_history'
                ? 'bg-[#173B3F] text-white shadow-sm'
                : 'bg-white hover:bg-[#E8F0EF] text-[#1C1C1C] border border-[#E7E2DA]'
            }`}
          >
            <Sparkles className="w-3 h-3 text-[#D9A2B0]" />
            <span>مکمل خدمات قبلی</span>
          </button>
          <button
            onClick={() => setRecommendationFilter('saved_salon')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              recommendationFilter === 'saved_salon'
                ? 'bg-[#173B3F] text-white shadow-sm'
                : 'bg-white hover:bg-[#E8F0EF] text-[#1C1C1C] border border-[#E7E2DA]'
            }`}
          >
            <Bookmark className="w-3 h-3 text-[#6F9A8D]" />
            <span>از سالن‌های نشان‌شده</span>
          </button>
          <button
            onClick={() => setRecommendationFilter('trending')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              recommendationFilter === 'trending'
                ? 'bg-[#173B3F] text-white shadow-sm'
                : 'bg-white hover:bg-[#E8F0EF] text-[#1C1C1C] border border-[#E7E2DA]'
            }`}
          >
            <Star className="w-3 h-3 text-[#C99558]" />
            <span>محبوب‌ترین‌ها</span>
          </button>
        </div>

        {/* Recommendations Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredRecommendations.map((rec) => {
            const defaultSlot = rec.salon.availableSlots[0];
            const defaultTime = defaultSlot?.slots?.find((s) => !s.booked)?.time || '۱۱:۳۰';
            const defaultDate = defaultSlot?.date || '۱۴۰۳/۰۸/۱۵';
            const isWishlisted = savedSalonIds.includes(rec.salon.id);

            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-[#E7E2DA] hover:border-[#173B3F] p-4 transition-all duration-200 flex flex-col justify-between space-y-3.5 shadow-sm"
              >
                {/* Header: Match Score & Reason Pill */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF2EF] border border-[#6F9A8D]/30 text-[#2E5E52] text-[10px] font-bold">
                      <Sparkles className="w-3 h-3 text-[#6F9A8D]" />
                      <span>{toPersianDigits(rec.matchScore)}٪ تطابق هوشمند با سبک شما</span>
                    </div>

                    <button
                      onClick={() => onToggleWishlistSalon(rec.salon.id)}
                      className="p-1.5 rounded-full text-[#6C6C6C] hover:text-[#B35D67] hover:bg-[#F8ECEE] transition-colors"
                      title={isWishlisted ? 'حذف از نشان‌شده‌ها' : 'نشان کردن سالن'}
                    >
                      <Heart
                        className={`w-4 h-4 ${isWishlisted ? 'fill-[#B35D67] text-[#B35D67]' : 'text-[#6C6C6C]'}`}
                      />
                    </button>
                  </div>

                  {/* Recommendation Reason Banner */}
                  <div className="bg-[#FAF7F2] border-r-2 border-[#173B3F] px-3 py-1.5 rounded-l-lg text-[11px] text-[#1C1C1C] font-medium leading-relaxed">
                    {rec.reasonText}
                  </div>
                </div>

                {/* Service Details & Thumbnail */}
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-[#E7E2DA] bg-[#F7F3EE]">
                    <img
                      src={rec.salon.coverImage}
                      alt={rec.service.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <BeautyActivityIcon activityId={rec.service.serviceLineId} size="sm" />
                      <h3 className="text-sm font-bold text-[#1C1C1C] truncate">
                        {rec.service.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#6C6C6C] truncate">
                      <span className="font-semibold text-[#173B3F]">{rec.salon.name}</span>
                      <span>·</span>
                      <MapPin className="w-3 h-3 inline text-[#6C6C6C]" />
                      <span>{rec.salon.district}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5 text-[#C99558] font-bold">
                        <Star className="w-3 h-3 fill-[#C99558]" />
                        <span>{toPersianDigits(rec.salon.rating)}</span>
                      </span>
                    </div>

                    {/* Specialist Row */}
                    <div className="mt-2 flex items-center justify-between gap-2 pt-2 border-t border-[#E7E2DA]/60">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={rec.specialist.avatar}
                          alt={rec.specialist.name}
                          className="w-5 h-5 rounded-full object-cover border border-[#D9A2B0]"
                        />
                        <span className="text-[11px] font-medium text-[#1C1C1C]">
                          {rec.specialist.name}
                        </span>
                        <span className="text-[10px] text-[#6C6C6C]">({rec.specialist.role})</span>
                      </div>

                      <button
                        onClick={() => onViewSpecialistPortfolio(rec.specialist, rec.salon)}
                        className="text-[10px] text-[#173B3F] hover:text-[#0F3232] font-bold flex items-center gap-0.5"
                      >
                        <span>نمونه‌کارها</span>
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cadence Note if applicable */}
                {rec.cadenceNote && (
                  <div className="text-[10px] text-[#8C5526] bg-[#FBF4EC] border border-[#C99558]/30 rounded-xl p-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-[#C99558]" />
                    <span>{rec.cadenceNote}</span>
                  </div>
                )}

                {/* Card Footer: Duration, Price & Booking Button */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E7E2DA]/60">
                  <div>
                    <div className="text-xs font-extrabold text-[#173B3F]">
                      {formatPrice(rec.service.price)}
                    </div>
                    <div className="text-[10px] text-[#6C6C6C] flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{toPersianDigits(rec.service.durationMinutes)} دقیقه</span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      onBookSalon(rec.salon, rec.service, rec.specialist, defaultDate, defaultTime)
                    }
                    className="h-9 px-4 rounded-xl bg-[#173B3F] hover:bg-[#0F3232] active:bg-[#0B2626] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>رزرو مستقیم</span>
                    <ArrowLeft className="w-3.5 h-3.5 text-[#D9A2B0]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Approved Salons */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-base font-bold text-[#173B3F] font-serif">
              سالن‌ها و کلینیک‌های دارای تاییدیه رسمی بویا
            </h2>
            <p className="text-[11px] text-[#6C6C6C]">
              تضمین اصالت مجوز، پروتکل بهداشتی و نظارت کیفی
            </p>
          </div>
          <button
            onClick={() => onNavigateToSalons()}
            className="text-xs font-semibold text-[#173B3F] hover:text-[#0F3232] flex items-center gap-1"
          >
            <span>لیست کامل</span>
            <ChevronLeft className="w-3.5 h-3.5 text-[#173B3F]" />
          </button>
        </div>

        {filteredSalons.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-2">
            <p className="text-xs font-bold text-[#1C1C1C]">
              سالنی مطابق با فیلتر انتخابی شما در {selectedCity} یافت نشد
            </p>
            <button
              onClick={() => {
                setFilterMobileOnly(false);
                setSearchQuery('');
              }}
              className="text-xs text-[#173B3F] font-bold"
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

      {/* Platform Features Banner with Official Sage & Petrol Highlights */}
      <section className="bg-white rounded-3xl p-5 border border-[#E7E2DA] grid grid-cols-1 sm:grid-cols-3 gap-4 text-center shadow-sm">
        <div className="space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F0EF] border border-[#173B3F]/20 text-[#173B3F] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5 text-[#173B3F]" />
          </div>
          <h4 className="text-xs font-bold text-[#173B3F]">جلوگیری از تداخل نوبت</h4>
          <p className="text-[10px] text-[#6C6C6C]">الگوریتم هوشمند عدم تداخل ساعت با GiST Range</p>
        </div>

        <div className="space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-[#EAF2EF] border border-[#6F9A8D]/30 text-[#6F9A8D] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5 text-[#6F9A8D]" />
          </div>
          <h4 className="text-xs font-bold text-[#173B3F]">تاییدیه پیامکی ملی‌پیامک</h4>
          <p className="text-[10px] text-[#6C6C6C]">ارسال فوری کد رهگیری و یادآوری سانس به شماره همراه</p>
        </div>

        <div className="space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-[#FBF4EC] border border-[#C99558]/30 text-[#8C5526] flex items-center justify-center mx-auto">
            <Car className="w-5 h-5 text-[#C99558]" />
          </div>
          <h4 className="text-xs font-bold text-[#173B3F]">خدمات سیار در منزل</h4>
          <p className="text-[10px] text-[#6C6C6C]">امکان رزرو اعزام متخصص مجهز به آدرس دلخواه شما</p>
        </div>
      </section>
    </div>
  );
};
