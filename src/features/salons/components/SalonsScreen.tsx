import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  MapPin,
  Crown,
  Navigation,
  Compass,
  ChevronDown,
  RotateCcw,
  Car,
  Map,
  List,
} from 'lucide-react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { SERVICE_LINES, Salon } from '../../../shared/data/marketplaceData';
import { IRAN_PROVINCES, CountyCity } from '../../../shared/data/iranLocations';
import { calculateDistanceKm } from '../../../shared/utils/geoUtils';
import { SalonCard } from '../../../shared/components/ui/SalonCard';
import { SalonMap } from '../../../shared/components/ui/SalonMap';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { sortSalonsForSearchResults } from '../../../shared/utils/salonRanking';
import { BeautyActivityIcon } from '../../../shared/components/ui/BeautyActivityIcon';
import { useDataStore } from '../../../shared/stores/dataStore';
import { useLocationStore } from '../../../shared/stores/locationStore';
import { useModalStore } from '../../../shared/stores/modalStore';
import { useUIStore } from '../../../shared/stores/uiStore';
import { useSalons } from '../../../shared/api/queries';
import { RefreshCw } from 'lucide-react';

import { useFavoritesStore } from '../../../shared/stores/favoritesStore';
import { SEO } from '../../../shared/components/SEO';

export const SalonsScreen: React.FC = () => {
  const { savedSalonIds, toggleFavorite, isFavorite } = useFavoritesStore();
  const searchParams = useSearch({ from: '/salons' }) as any;
  const initialServiceLine = searchParams?.serviceLine || 'all';

  const { data: salons = [], isLoading, isError } = useSalons();
  const { 
    selectedProvince, setSelectedProvince,
    selectedCity, setSelectedCity,
    selectedDistrict, setSelectedDistrict,
    customerLocation,
    maxDistanceKm, setMaxDistanceKm,
    sortByDistance, setSortByDistance,
  } = useLocationStore();
  
  const { openBookingModal, openPortfolioModal } = useModalStore();
  const { isLocationModalOpen, setIsLocationModalOpen, showToast } = useUIStore();

  const [selectedServiceLine, setSelectedServiceLine] = useState<string>(initialServiceLine);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyMobileService, setOnlyMobileService] = useState<boolean>(false);
  const [onlyVipFilter, setOnlyVipFilter] = useState<boolean>(false);
  const [onlyAvailableSlots, setOnlyAvailableSlots] = useState<boolean>(false);
  const [sortByOption, setSortByOption] = useState<'distance' | 'vip' | 'rating' | 'popular' | 'cheapest' | 'expensive'>('distance');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const navigate = useNavigate();

  // Reactively sync and validate search params from URL
  React.useEffect(() => {
    const rawLine = searchParams?.serviceLine;
    const rawQuery = searchParams?.q;
    const rawProvince = searchParams?.province;
    const validLines = ['all', ...SERVICE_LINES.map((s) => s.id)];

    if (rawLine && validLines.includes(String(rawLine))) {
      setSelectedServiceLine(String(rawLine));
    }
    if (rawQuery && typeof rawQuery === 'string') {
      setSearchQuery(rawQuery.trim());
    }
    if (rawProvince && typeof rawProvince === 'string' && IRAN_PROVINCES.some(p => p.name === rawProvince)) {
      setSelectedProvince(rawProvince);
    }
  }, [searchParams?.serviceLine, searchParams?.q, searchParams?.province, setSelectedProvince]);

  // Push state changes back to URL for shareable search results
  React.useEffect(() => {
    const newSearch: any = { ...searchParams };
    if (selectedServiceLine && selectedServiceLine !== 'all') newSearch.serviceLine = selectedServiceLine;
    else delete newSearch.serviceLine;
    
    if (searchQuery.trim()) newSearch.q = searchQuery.trim();
    else delete newSearch.q;

    if (selectedProvince && selectedProvince !== 'همه') newSearch.province = selectedProvince;
    else delete newSearch.province;

    navigate({ search: newSearch, replace: true });
  }, [selectedServiceLine, searchQuery, selectedProvince, navigate]);

  const publishedSalons = useMemo(() => salons.filter((salon: any) =>
    salon?.isApproved !== false && salon?.isActive !== false && salon?.active !== false &&
    (salon?.publicationStatus == null || salon.publicationStatus === 'active') &&
    (salon?.status == null || salon.status === 'active'),
  ), [salons]);

  // Counties for active province
  const currentProvinceData = IRAN_PROVINCES.find((p) => p.name === selectedProvince);
  const availableCounties: CountyCity[] = currentProvinceData ? currentProvinceData.counties : [];
  const currentCountyData = availableCounties.find((c) => c.name === selectedCity);
  const availableDistricts: string[] = currentCountyData?.districts || [];

  const processedSalons = useMemo(() => {
    const list = publishedSalons
      .map((salon: any) => {
        let distanceKm: number | undefined;
        if (customerLocation.coords) {
          distanceKm = calculateDistanceKm(
            customerLocation.coords.lat,
            customerLocation.coords.lng,
            Number(salon.latitude),
            Number(salon.longitude)
          );
        }
        return { salon, distanceKm };
      })
      .filter(({ salon, distanceKm }: any) => {
        if (selectedProvince !== 'همه' && salon.province !== selectedProvince && !salon.province.includes(selectedProvince)) return false;
        if (selectedCity !== 'همه' && salon.city !== selectedCity && !salon.city.includes(selectedCity)) return false;
        if (selectedDistrict !== 'همه' && salon.district !== selectedDistrict && !salon.district.includes(selectedDistrict)) return false;
        if (maxDistanceKm !== null && distanceKm !== undefined && distanceKm > maxDistanceKm) return false;
        if (onlyVipFilter && !salon.isVip) return false;
        if (onlyMobileService && !salon.isMobileServiceActive) return false;
        if (selectedServiceLine !== 'all') {
          const hasServiceInLine = salon.services.some((s: any) => s.serviceLineId === selectedServiceLine);
          if (!hasServiceInLine) return false;
        }
        // P0: only keep salons that still have at least one free slot for booking.
        if (onlyAvailableSlots) {
          const hasFree = (salon.availableSlots || []).some((day: any) =>
            (day.slots || []).some((slot: any) => !slot.booked)
          );
          if (!hasFree) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = salon.name.toLowerCase().includes(q);
          const matchDistrict = (salon.district || '').toLowerCase().includes(q);
          const matchCity = (salon.city || '').toLowerCase().includes(q);
          const matchService = salon.services?.some((s: any) => s.name.toLowerCase().includes(q));
          const matchSpecialist = salon.specialists?.some((sp: any) => sp.name.toLowerCase().includes(q));
          if (!matchName && !matchDistrict && !matchCity && !matchService && !matchSpecialist) return false;
        }
        return true;
      });

    return sortSalonsForSearchResults(list, sortByOption);
  }, [publishedSalons, customerLocation, selectedProvince, selectedCity, selectedDistrict, maxDistanceKm, onlyVipFilter, onlyMobileService, onlyAvailableSlots, selectedServiceLine, searchQuery, sortByOption]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <RefreshCw className="w-8 h-8 text-[#173B3F] animate-spin" />
      <span className="text-xs font-bold text-[#173B3F]">در حال دریافت اطلاعات سالن‌ها...</span>
    </div>
  );

  return (
    <>
      <SEO 
        title="جستجوی سالن‌ها" 
        description="جستجو و رزرو آنلاین برترین سالن‌های زیبایی و خدمات آرایشی در سراسر ایران با تفکیک لاین‌های تخصصی." 
      />
      <div className="space-y-5 pb-20">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#173B3F] font-serif">سالن‌ها و خدمات</h1>
            <p className="text-[11px] text-[#6C6C6C]">مشاهده {toPersianDigits(processedSalons.length)} مورد تایید شده در محدوده شما</p>
          </div>
          <div className="flex bg-white rounded-xl border border-[#E7E2DA] p-1">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#173B3F] text-white' : 'text-[#6C6C6C]'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'map' ? 'bg-[#173B3F] text-white' : 'text-[#6C6C6C]'}`}
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="space-y-3">
          {/* Quick Line Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
            <button
              onClick={() => setSelectedServiceLine('all')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                selectedServiceLine === 'all'
                  ? 'bg-[#173B3F] text-white border-[#173B3F]'
                  : 'bg-white text-[#1C1C1C] border-[#E7E2DA] hover:border-[#173B3F]'
              }`}
            >
              همه لاین‌ها
            </button>
            {SERVICE_LINES.map((line) => (
              <button
                key={line.id}
                onClick={() => setSelectedServiceLine(line.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all ${
                  selectedServiceLine === line.id
                    ? 'bg-[#173B3F] text-white border-[#173B3F]'
                    : 'bg-white text-[#1C1C1C] border-[#E7E2DA] hover:border-[#173B3F]'
                }`}
              >
                <BeautyActivityIcon activityId={line.id} size="sm" />
                <span>{line.name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C6C]" />
              <input
                type="text"
                placeholder="جستجوی نام..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pr-9 pl-3 rounded-xl bg-white border border-[E7E2DA] text-xs outline-none focus:border-[#173B3F]"
              />
            </div>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center justify-between px-3 h-10 rounded-xl bg-white border border-[E7E2DA] text-xs font-bold text-[#173B3F]"
            >
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{selectedCity === 'همه' ? 'موقعیت من' : selectedCity}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* P0: Sort + availability filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
            <select
              value={sortByOption}
              onChange={(e) => setSortByOption(e.target.value as any)}
              className="flex-shrink-0 h-9 px-2 rounded-xl bg-white border border-[E7E2DA] text-[11px] font-bold text-[#173B3F] outline-none"
            >
              <option value="distance">مرتب‌سازی: نزدیک‌ترین</option>
              <option value="cheapest">مرتب‌سازی: ارزان‌ترین</option>
              <option value="expensive">مرتب‌سازی: گران‌ترین</option>
              <option value="rating">مرتب‌سازی: بهترین امتیاز</option>
              <option value="popular">مرتب‌سازی: محبوب‌ترین</option>
              <option value="vip">مرتب‌سازی: VIP</option>
            </select>
            <button
              onClick={() => setOnlyAvailableSlots((v) => !v)}
              className={`flex-shrink-0 px-3 h-9 rounded-full text-[11px] font-bold border transition-all ${
                onlyAvailableSlots
                  ? 'bg-[#173B3F] text-white border-[#173B3F]'
                  : 'bg-white text-[#1C1C1C] border-[E7E2DA] hover:border-[#173B3F]'
              }`}
            >
              سانس آزاد
            </button>
          </div>
        </div>

        {viewMode === 'map' ? (
          <div className="space-y-4 animate-fadeIn">
            <SalonMap
              salons={processedSalons.map((p: any) => p.salon)}
              onBookNow={(salon) => {
                const serv = salon.services?.[0];
                const spec = salon.specialists?.[0];
                const date = salon.availableSlots?.[0]?.date || 'شنبه ۵ آبان';
                const time = salon.availableSlots?.[0]?.slots?.[0]?.time || '۱۱:۰۰';
                if (serv && spec) {
                  openBookingModal(salon, serv, spec, date, time);
                }
              }}
            />
            <p className="text-[11px] text-center text-[#6C6C6C]">
              روی نشانگرهای نقشه کلیک کنید تا اطلاعات سالن و دکمه رزرو نوبت نمایش داده شود.
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn">
            {processedSalons.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-3xl border border-[#E7E2DA]">سالنی یافت نشد.</div>
            ) : (
              processedSalons.map(({ salon, distanceKm }: any) => (
                <SalonCard
                  key={salon.id}
                  salon={salon}
                  distanceKm={distanceKm}
                  isWishlisted={isFavorite(salon.id)}
                  onToggleWishlist={() => {
                    const isAdded = toggleFavorite(salon.id);
                    showToast(isAdded ? 'به نشان‌شده‌ها اضافه شد.' : 'از نشان‌شده‌ها حذف شد.');
                  }}
                  onBookNow={openBookingModal}
                  onViewSpecialistPortfolio={openPortfolioModal}
                />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
};
