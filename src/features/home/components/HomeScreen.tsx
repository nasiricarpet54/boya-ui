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
  Bookmark,
  RefreshCw,
  Clock,
  ArrowLeft,
  Navigation,
  Heart,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { SERVICE_LINES } from '../../../shared/data/marketplaceData';
import { SalonCard } from '../../../shared/components/ui/SalonCard';
import { toPersianDigits, formatPrice } from '../../../shared/utils/persianUtils';
import { calculateDistanceKm } from '../../../shared/utils/geoUtils';
import { generatePersonalizedRecommendations } from '../../../shared/utils/recommendationEngine';
import { sortSalonsForSearchResults } from '../../../shared/utils/salonRanking';
import { BeautyActivityIcon } from '../../../shared/components/ui/BeautyActivityIcon';
import { useDataStore } from '../../../shared/stores/dataStore';
import { useLocationStore } from '../../../shared/stores/locationStore';
import { useUIStore } from '../../../shared/stores/uiStore';
import { useModalStore } from '../../../shared/stores/modalStore';
import { useSalons } from '../../../shared/api/queries';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { data: salons = [], isLoading, isError } = useSalons();
  const { bookings } = useDataStore();
  const { selectedCity, selectedProvince, customerLocation, setIsLocationModalOpen } = useLocationStore();
  const { openBookingModal, openPortfolioModal } = useModalStore();
  const { showToast } = useUIStore();

  const [filterMobileOnly, setFilterMobileOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recommendationFilter, setRecommendationFilter] = useState<'all' | 'routine_renewal' | 'booking_history' | 'saved_salon' | 'trending'>('all');

  const savedSalonIds = ['salon-1', 'salon-3']; // This should be in a store too

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
      if (selectedProvince && selectedProvince !== 'همه') {
        if (!salon.province.includes(selectedProvince)) {
          return false;
        }
      }
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
  }, [salons, selectedCity, selectedProvince, filterMobileOnly, searchQuery]);

  // Attach distanceKm to each salon
  const filteredSalonsWithDistance = useMemo(() => {
    return filteredSalons.map((salon) => {
      let distanceKm: number | undefined;
      if (customerLocation?.coords) {
        distanceKm = calculateDistanceKm(
          customerLocation.coords.lat,
          customerLocation.coords.lng,
          salon.latitude,
          salon.longitude
        );
      }
      return { salon, distanceKm };
    });
  }, [filteredSalons, customerLocation]);

  const handleToggleWishlistSalon = (id: string) => {
    showToast(savedSalonIds.includes(id) ? 'از نشان‌شده‌ها حذف شد.' : 'به نشان‌شده‌ها اضافه شد.');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="w-8 h-8 text-[#173B3F] animate-spin" />
        <p className="text-sm font-bold text-[#173B3F]">در حال بارگذاری سالن‌ها...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Editorial Hero Banner */}
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
            دسترسی آسان به برترین سالن‌ها و متخصصین تایید شده در {selectedCity === 'همه' ? (selectedProvince === 'همه' ? 'سراسر کشور' : selectedProvince) : `${selectedProvince}، ${selectedCity}`}.
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate({ to: '/salons' })}
              className="h-12 px-6 rounded-full bg-[#D9A2B0] hover:bg-[#E6B5C0] active:bg-[#C98F9F] text-[#173B3F] font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-[#D9A2B0]/25"
            >
              <span>جستجو و رزرو نوبت</span>
              <ChevronLeft className="w-4 h-4 text-[#173B3F]" />
            </button>

            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="h-12 px-4 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition-all backdrop-blur-md shadow-xs"
            >
              <Navigation className="w-3.5 h-3.5 text-[#D9A2B0] rotate-45" />
              <span>GPS و انتخاب شهر ({selectedCity})</span>
            </button>

            <button
              onClick={() => setFilterMobileOnly(!filterMobileOnly)}
              className={`h-12 px-4 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center gap-2 transition-all ${
                filterMobileOnly
                  ? 'bg-[#C99558] text-[#173B3F] border-[#C99558] shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>{filterMobileOnly ? 'فیلتر خدمات در محل فعال' : 'خدمات در منزل'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Search */}
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

      {/* Service Lines */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-[#173B3F] font-serif">
            لاین‌های تخصصی خدمات زیبایی
          </h2>
          <button
            onClick={() => navigate({ to: '/salons' })}
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
              onClick={() => navigate({ to: '/salons', search: { serviceLine: line.id } as any })}
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

      {/* Recommendations */}
      <section className="bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F2] to-[#E8F0EF]/70 rounded-3xl p-5 border border-[#E7E2DA] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E2DA] pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF2EF] text-[#2E5E52] border border-[#6F9A8D]/30 text-[11px] font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#6F9A8D]" />
              <span>موتور هوشمند پیشنهاد خدمات بویا</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#173B3F] font-serif">
              پیشنهادهای اختصاصی بر مبنای سوابق و سالن‌های شما
            </h2>
          </div>
        </div>

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
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF2EF] border border-[#6F9A8D]/30 text-[#2E5E52] text-[10px] font-bold">
                      <Sparkles className="w-3 h-3 text-[#6F9A8D]" />
                      <span>{toPersianDigits(rec.matchScore)}٪ تطابق</span>
                    </div>
                    <button
                      onClick={() => handleToggleWishlistSalon(rec.salon.id)}
                      className="p-1.5 rounded-full text-[#6C6C6C] hover:text-[#B35D67] transition-colors"
                    >
                      <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#B35D67] text-[#B35D67]' : 'text-[#6C6C6C]'}`} />
                    </button>
                  </div>
                  <div className="bg-[#FAF7F2] border-r-2 border-[#173B3F] px-3 py-1.5 rounded-l-lg text-[11px]">
                    {rec.reasonText}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <img src={rec.salon.coverImage} className="w-16 h-16 rounded-2xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold truncate">{rec.service.name}</h3>
                    <div className="text-[11px] text-[#6C6C6C] truncate">
                      {rec.salon.name} · {rec.salon.district}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E7E2DA]">
                  <div className="text-xs font-extrabold text-[#173B3F]">
                    {formatPrice(rec.service.price)}
                  </div>
                  <button
                    onClick={() => openBookingModal(rec.salon, rec.service, rec.specialist, defaultDate, defaultTime)}
                    className="h-9 px-4 rounded-xl bg-[#173B3F] text-white text-xs font-bold flex items-center gap-1.5"
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

      {/* Featured Salons */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-bold text-[#173B3F] font-serif">
            سالن‌های دارای تاییدیه رسمی بویا
          </h2>
        </div>

        {filteredSalonsWithDistance.map(({ salon, distanceKm }) => (
          <SalonCard
            key={salon.id}
            salon={salon}
            distanceKm={distanceKm}
            isWishlisted={savedSalonIds.includes(salon.id)}
            onToggleWishlist={() => handleToggleWishlistSalon(salon.id)}
            onBookNow={openBookingModal}
            onViewSpecialistPortfolio={openPortfolioModal}
          />
        ))}
      </section>

      {/* Features Banner */}
      <section className="bg-white rounded-3xl p-5 border border-[#E7E2DA] grid grid-cols-1 sm:grid-cols-3 gap-4 text-center shadow-sm">
        <div className="space-y-1">
          <CheckCircle2 className="w-10 h-10 text-[#173B3F] mx-auto" />
          <h4 className="text-xs font-bold text-[#173B3F]">جلوگیری از تداخل نوبت</h4>
        </div>
        <div className="space-y-1">
          <ShieldCheck className="w-10 h-10 text-[#6F9A8D] mx-auto" />
          <h4 className="text-xs font-bold text-[#173B3F]">تاییدیه پیامکی</h4>
        </div>
        <div className="space-y-1">
          <Car className="w-10 h-10 text-[#C99558] mx-auto" />
          <h4 className="text-xs font-bold text-[#173B3F]">خدمات سیار</h4>
        </div>
      </section>
    </div>
  );
};
