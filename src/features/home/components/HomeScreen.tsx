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
import { useSalons, useBookings } from '../../../shared/api/queries';
import { useFavoritesStore } from '../../../shared/stores/favoritesStore';
import { SEO } from '../../../shared/components/SEO';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { data: salons = [], isLoading, isError } = useSalons();
  const { data: bookings = [] } = useBookings();
  const { selectedCity, selectedProvince, customerLocation } = useLocationStore();
  const { openBookingModal, openPortfolioModal, openSearchModal } = useModalStore();
  const { showToast, setIsLocationModalOpen } = useUIStore();
  const { savedSalonIds, toggleFavorite, isFavorite } = useFavoritesStore();

  const [filterMobileOnly, setFilterMobileOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recommendationFilter, setRecommendationFilter] = useState<'all' | 'routine_renewal' | 'booking_history' | 'saved_salon' | 'trending'>('all');

  // Generate personalized recommendations
  const recommendations = useMemo(() => {
    return generatePersonalizedRecommendations(bookings, savedSalonIds.map(String), salons, selectedCity);
  }, [bookings, savedSalonIds, salons, selectedCity]);

  const filteredRecommendations = useMemo(() => {
    if (recommendationFilter === 'all') return recommendations;
    const filtered = recommendations.filter((r) => r.reasonCategory === recommendationFilter);
    return filtered.length > 0 ? filtered : recommendations;
  }, [recommendations, recommendationFilter]);

  // Search results sorted with VIP salons first
  const filteredSalons = useMemo(() => {
    const list = salons.filter((salon: any) => {
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
        const matchService = salon.services.some((s: any) => s.name.toLowerCase().includes(q));
        const matchSpecialist = salon.specialists.some((sp: any) => sp.name.toLowerCase().includes(q));
        if (!matchName && !matchDistrict && !matchService && !matchSpecialist) return false;
      }
      return true;
    });
    return sortSalonsForSearchResults(list.map(salon => ({ salon })));
  }, [salons, selectedCity, selectedProvince, filterMobileOnly, searchQuery]);

  // Attach distanceKm to each salon
  const filteredSalonsWithDistance = useMemo(() => {
    return filteredSalons.map(({ salon }) => {
      let distanceKm: number | undefined;
      if (customerLocation?.coords) {
        distanceKm = calculateDistanceKm(
          customerLocation.coords.lat,
          customerLocation.coords.lng,
          Number(salon.latitude),
          Number(salon.longitude)
        );
      }
      return { salon, distanceKm };
    });
  }, [filteredSalons, customerLocation]);

  const handleToggleWishlistSalon = (id: string) => {
    toggleFavorite(id);
    showToast(isFavorite(id) ? 'از نشان‌شده‌ها حذف شد.' : 'به نشان‌شده‌ها اضافه شد.');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="w-8 h-8 text-[#173B3F] animate-spin" />
        <p className="text-sm font-bold text-[#173B3F]">در حال بارگذاری سالن‌ها...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="text-center py-20 bg-white rounded-3xl border border-red-100 m-4">
        <p className="text-red-500 font-bold">خطایی در دریافت اطلاعات سالن‌ها رخ داد.</p>
        <p className="text-xs text-[#6C6C6C] mt-2">لطفاً اتصال خود را بررسی و دوباره تلاش کنید.</p>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="خانه" 
        description="سامانه جامع رزرو آنلاین نوبت آرایشگاه، خدمات زیبایی در محل و مدیریت سالن‌های زیبایی بویا." 
      />
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
                aria-label="مشاهده تمام سالن‌ها"
              >
                <span>جستجو و رزرو نوبت</span>
                <ChevronLeft className="w-4 h-4 text-[#173B3F]" />
              </button>

              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="h-12 px-4 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition-all backdrop-blur-md shadow-xs"
                aria-label="تغییر موقعیت مکانی"
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
                aria-label={filterMobileOnly ? 'غیرفعال کردن فیلتر خدمات در محل' : 'فعال کردن فیلتر خدمات در محل'}
              >
                <Car className="w-3.5 h-3.5" />
                <span>{filterMobileOnly ? 'فیلتر خدمات در محل فعال' : 'خدمات در منزل'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Quick Search Trigger */}
        <section className="relative">
          <div
            onClick={() => openSearchModal(searchQuery)}
            className="relative flex items-center cursor-pointer group"
          >
            <Search className="absolute right-4 w-5 h-5 text-[#173B3F]/50 group-hover:text-[#173B3F] transition-colors" />
            <input
              type="text"
              readOnly
              onClick={() => openSearchModal(searchQuery)}
              placeholder="جستجوی هوشمند سالن، نام خدمات، متخصص یا منطقه... (کلیک کنید یا ⌘K)"
              className="w-full h-14 pr-12 pl-28 rounded-2xl bg-white border border-[#E7E2DA] group-hover:border-[#173B3F] cursor-pointer text-xs sm:text-sm text-[#173B3F] placeholder:text-[#6C6C6C]/60 transition-all shadow-sm shadow-[#173B3F]/5"
              value={searchQuery}
            />
            <div className="absolute left-3.5 flex items-center gap-1.5">
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA] text-[11px] font-bold text-[#173B3F] group-hover:bg-[#173B3F] group-hover:text-white transition-all">
                جستجوی سراسری
              </span>
              <kbd className="hidden md:inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-[#E7E2DA] text-[#6C6C6C]">
                ⌘K
              </kbd>
            </div>
          </div>
        </section>

        {/* Categories / Lines */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#173B3F]">لاین‌های تخصصی</h2>
            <button className="text-[11px] font-bold text-[#C99558] hover:underline">مشاهده همه</button>
          </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {SERVICE_LINES.map((line) => (
              <button
                key={line.id}
                onClick={() => navigate({ to: '/salons', search: { service: line.name } })}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] flex items-center justify-center text-[#173B3F] group-hover:bg-[#173B3F] group-hover:text-white transition-all group-active:scale-95 shadow-xs">
                  <BeautyActivityIcon activityId={line.id as any} className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-[#6C6C6C] group-hover:text-[#173B3F] text-center">{line.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Personalized Recommendations */}
        {recommendations.length > 0 && (
          <section className="bg-white rounded-3xl p-5 border border-[#E7E2DA] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#173B3F] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C99558]" />
                  <span>پیشنهادهای هوشمند برای شما</span>
                </h2>
                <p className="text-[10px] text-[#6C6C6C] mt-0.5">بر اساس سوابق رزرو و علایق شما تنظیم شده است.</p>
              </div>
            </div>

            {/* Filter Pills for Recommendations */}
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1">
              {[
                { id: 'all', label: 'همه پیشنهادها' },
                { id: 'routine_renewal', label: 'تجدید روتین' },
                { id: 'booking_history', label: 'بر اساس تاریخچه' },
                { id: 'saved_salon', label: 'نشان‌شده‌ها' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setRecommendationFilter(pill.id as any)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                    recommendationFilter === pill.id
                      ? 'bg-[#173B3F] text-white border-[#173B3F]'
                      : 'bg-white text-[#6C6C6C] border-[#E7E2DA] hover:bg-[#FAF7F2]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {filteredRecommendations.map((rec) => (
                <div key={rec.id} className="min-w-[260px] max-w-[260px] relative">
                  <div className="absolute top-2 right-2 z-10">
                    <span className="px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-[9px] font-extrabold text-[#173B3F] shadow-sm border border-[#E7E2DA]">
                      {rec.badgeLabel}
                    </span>
                  </div>
                  <SalonCard
                    salon={rec.salon}
                    distanceKm={
                      customerLocation.coords
                        ? calculateDistanceKm(
                            customerLocation.coords.lat,
                            customerLocation.coords.lng,
                            Number(rec.salon.latitude),
                            Number(rec.salon.longitude)
                          )
                        : undefined
                    }
                    isWishlisted={isFavorite(rec.salon.id)}
                    onToggleWishlist={() => handleToggleWishlistSalon(String(rec.salon.id))}
                    onBookNow={(s, serv, spec, d, t) => openBookingModal(s, serv, spec, d, t)}
                    onViewSpecialistPortfolio={(spec, s) => openPortfolioModal(spec, s)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main Salon Feed */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#173B3F]">
                {searchQuery ? `نتایج جستجو (${filteredSalonsWithDistance.length})` : 'سالن‌های برگزیده و نزدیک'}
              </h2>
              <p className="text-[10px] text-[#6C6C6C] mt-0.5">
                {selectedCity !== 'همه' ? `در محدوده ${selectedCity}` : 'بر اساس موقعیت شما'}
              </p>
            </div>
          </div>

          {filteredSalonsWithDistance.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredSalonsWithDistance.map(({ salon, distanceKm }) => (
                <SalonCard
                  key={salon.id}
                  salon={salon}
                  distanceKm={distanceKm}
                  isWishlisted={isFavorite(salon.id)}
                  onToggleWishlist={() => handleToggleWishlistSalon(String(salon.id))}
                  onBookNow={(s, serv, spec, d, t) => openBookingModal(s, serv, spec, d, t)}
                  onViewSpecialistPortfolio={(spec, s) => openPortfolioModal(spec, s)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#E7E2DA] border-dashed">
              <div className="w-16 h-16 bg-[#FAF7F2] rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-[#173B3F]/20" />
              </div>
              <h3 className="text-sm font-bold text-[#173B3F]">موردی یافت نشد</h3>
              <p className="text-xs text-[#6C6C6C] mt-2">
                متأسفانه سالنی با این مشخصات در محدوده انتخابی شما پیدا نکردیم.
              </p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setFilterMobileOnly(false);
                }}
                className="mt-4 text-xs font-bold text-[#C99558] hover:underline"
              >
                حذف فیلترها و تلاش مجدد
              </button>
            </div>
          )}
        </section>

        {/* Features Promo */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-[#FAF7F2] p-4 rounded-3xl border border-[#E7E2DA]">
            <ShieldCheck className="w-6 h-6 text-[#173B3F] mb-2" />
            <h3 className="text-[11px] font-bold text-[#173B3F]">متخصصین تایید شده</h3>
            <p className="text-[9px] text-[#6C6C6C] mt-1">تمام متخصصین بویا از نظر مهارتی و بهداشتی تایید شده‌اند.</p>
          </div>
          <div className="bg-[#FAF7F2] p-4 rounded-3xl border border-[#E7E2DA]">
            <CheckCircle2 className="w-6 h-6 text-[#173B3F] mb-2" />
            <h3 className="text-[11px] font-bold text-[#173B3F]">ضمانت کیفیت سرویس</h3>
            <p className="text-[9px] text-[#6C6C6C] mt-1">در صورت نارضایتی، تیم پشتیبانی تا حل مشکل همراه شماست.</p>
          </div>
        </section>
      </div>
    </>
  );
};
