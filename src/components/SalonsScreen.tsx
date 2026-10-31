import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  MapPin,
  Sparkles,
  Filter,
  Car,
  Crown,
  Navigation,
  Compass,
  Sliders,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  ArrowUpDown,
} from 'lucide-react';
import { SALONS, SERVICE_LINES, Salon, SalonService, Specialist } from '../data/marketplaceData';
import { IRAN_PROVINCES, Province, CountyCity } from '../data/iranLocations';
import { CustomerLocationState, calculateDistanceKm, formatDistancePersian } from '../utils/geoUtils';
import { SalonCard } from './SalonCard';
import { toPersianDigits } from '../utils/persianUtils';
import { sortSalonsForSearchResults } from '../utils/salonRanking';
import { BeautyActivityIcon } from './BeautyActivityIcon';
import { LocationSelectorModal } from './LocationSelectorModal';

interface SalonsScreenProps {
  salons?: Salon[];
  initialServiceLine?: string;
  onBookSalon: (salon: Salon, service: SalonService, specialist: Specialist, date: string, time: string) => void;
  onViewSpecialistPortfolio: (specialist: Specialist, salon: Salon) => void;
  savedSalonIds: string[];
  onToggleWishlistSalon: (salonId: string) => void;
  selectedProvince?: string;
  onSelectProvince?: (province: string) => void;
  selectedCity?: string;
  onSelectCity?: (city: string) => void;
  selectedDistrict?: string;
  onSelectDistrict?: (district: string) => void;
  customerLocation?: CustomerLocationState;
  onUpdateCustomerLocation?: (state: CustomerLocationState) => void;
  maxDistanceKm?: number | null;
  onSelectMaxDistance?: (km: number | null) => void;
  sortByDistance?: boolean;
  onToggleSortByDistance?: (sort: boolean) => void;
  onOpenLocationModal?: () => void;
}

export const SalonsScreen: React.FC<SalonsScreenProps> = ({
  salons = SALONS,
  initialServiceLine = 'all',
  onBookSalon,
  onViewSpecialistPortfolio,
  savedSalonIds,
  onToggleWishlistSalon,
  selectedProvince: propProvince = 'تهران',
  onSelectProvince: propOnSelectProvince,
  selectedCity: propCity = 'تهران',
  onSelectCity: propOnSelectCity,
  selectedDistrict: propDistrict = 'همه',
  onSelectDistrict: propOnSelectDistrict,
  customerLocation: propLocation,
  onUpdateCustomerLocation: propOnUpdateLocation,
  maxDistanceKm: propMaxDistance = null,
  onSelectMaxDistance: propOnSelectMaxDistance,
  sortByDistance: propSortByDistance = true,
  onToggleSortByDistance: propOnToggleSortByDistance,
  onOpenLocationModal,
}) => {
  // Local state fallbacks if not lifted
  const [internalProvince, setInternalProvince] = useState<string>(propProvince);
  const [internalCity, setInternalCity] = useState<string>(propCity);
  const [internalDistrict, setInternalDistrict] = useState<string>(propDistrict);
  const [internalLocation, setInternalLocation] = useState<CustomerLocationState>(
    propLocation || {
      coords: { lat: 35.7951, lng: 51.4239 },
      status: 'simulated',
      source: 'preset',
      label: 'موقعیت پیش‌فرض (تهران، الهیه)',
    }
  );
  const [internalMaxDistance, setInternalMaxDistance] = useState<number | null>(propMaxDistance);
  const [internalSortByDistance, setInternalSortByDistance] = useState<boolean>(propSortByDistance);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Active values
  const activeProvince = propOnSelectProvince ? propProvince : internalProvince;
  const setActiveProvince = propOnSelectProvince || setInternalProvince;

  const activeCity = propOnSelectCity ? propCity : internalCity;
  const setActiveCity = propOnSelectCity || setInternalCity;

  const activeDistrict = propOnSelectDistrict ? propDistrict : internalDistrict;
  const setActiveDistrict = propOnSelectDistrict || setInternalDistrict;

  const activeLocation = propLocation || internalLocation;
  const setActiveLocation = propOnUpdateLocation || setInternalLocation;

  const activeMaxDistance = propOnSelectMaxDistance ? propMaxDistance : internalMaxDistance;
  const setActiveMaxDistance = propOnSelectMaxDistance || setInternalMaxDistance;

  const activeSortByDistance = propOnToggleSortByDistance ? propSortByDistance : internalSortByDistance;
  const setActiveSortByDistance = propOnToggleSortByDistance || setInternalSortByDistance;

  // Filter and search states
  const [selectedServiceLine, setSelectedServiceLine] = useState<string>(initialServiceLine);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyMobileService, setOnlyMobileService] = useState<boolean>(false);
  const [onlyVipFilter, setOnlyVipFilter] = useState<boolean>(false);
  const [sortByOption, setSortByOption] = useState<'distance' | 'vip' | 'rating' | 'popular'>('distance');

  // Counties for active province
  const currentProvinceData = IRAN_PROVINCES.find((p) => p.name === activeProvince);
  const availableCounties: CountyCity[] = currentProvinceData ? currentProvinceData.counties : [];
  const currentCountyData = availableCounties.find((c) => c.name === activeCity);
  const availableDistricts: string[] = currentCountyData?.districts || [];

  // Salons computation with Haversine distance & multi-tier sorting
  const processedSalons = useMemo(() => {
    // 1. Calculate distances & filter
    const list = salons
      .map((salon) => {
        let distanceKm: number | undefined;
        if (activeLocation.coords) {
          distanceKm = calculateDistanceKm(
            activeLocation.coords.lat,
            activeLocation.coords.lng,
            salon.latitude,
            salon.longitude
          );
        }
        return {
          salon,
          distanceKm,
        };
      })
      .filter(({ salon, distanceKm }) => {
        // Province filter (All 31 Provinces)
        if (activeProvince !== 'همه') {
          if (salon.province !== activeProvince && !salon.province.includes(activeProvince)) {
            return false;
          }
        }

        // City / County filter
        if (activeCity !== 'همه') {
          if (salon.city !== activeCity && !salon.city.includes(activeCity)) {
            return false;
          }
        }

        // District filter
        if (activeDistrict !== 'همه') {
          if (salon.district !== activeDistrict && !salon.district.includes(activeDistrict)) {
            return false;
          }
        }

        // Distance radius filter (دوری و نزدیکی بر اساس شعاع)
        if (activeMaxDistance !== null && distanceKm !== undefined) {
          if (distanceKm > activeMaxDistance) {
            return false;
          }
        }

        // VIP filter if toggled
        if (onlyVipFilter && !salon.isVip) {
          return false;
        }

        // Mobile service filter
        if (onlyMobileService && !salon.isMobileServiceActive) {
          return false;
        }

        // Service line filter
        if (selectedServiceLine !== 'all') {
          const hasServiceInLine = salon.services.some(
            (s) => s.serviceLineId === selectedServiceLine
          );
          const hasSpecialistInLine = salon.specialists.some(
            (sp) => sp.specialtyLine === selectedServiceLine
          );
          if (!hasServiceInLine && !hasSpecialistInLine) {
            return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = salon.name.toLowerCase().includes(q);
          const matchDistrict = salon.district.toLowerCase().includes(q);
          const matchAddress = salon.address.toLowerCase().includes(q);
          const matchService = salon.services.some((s) => s.name.toLowerCase().includes(q));
          const matchSpecialist = salon.specialists.some((sp) => sp.name.toLowerCase().includes(q));
          if (!matchName && !matchDistrict && !matchAddress && !matchService && !matchSpecialist) {
            return false;
          }
        }

        return true;
      });

    // 2. Sorting
    list.sort((a, b) => {
      // If user selected distance sorting and coordinates are available
      if (sortByOption === 'distance' && activeSortByDistance && a.distanceKm !== undefined && b.distanceKm !== undefined) {
        // VIP salons get prominent placement if within comparable distance, or direct distance sort
        if (a.salon.isVip && !b.salon.isVip && a.distanceKm <= b.distanceKm * 1.3) return -1;
        if (!a.salon.isVip && b.salon.isVip && b.distanceKm <= a.distanceKm * 1.3) return 1;
        return a.distanceKm - b.distanceKm;
      }

      if (sortByOption === 'vip') {
        if (a.salon.isVip && !b.salon.isVip) return -1;
        if (!a.salon.isVip && b.salon.isVip) return 1;
        if (a.salon.isVip && b.salon.isVip) {
          return (a.salon.displayPriority || 99) - (b.salon.displayPriority || 99);
        }
      }

      if (sortByOption === 'rating') {
        return b.salon.rating - a.salon.rating;
      }

      if (sortByOption === 'popular') {
        return b.salon.reviewsCount - a.salon.reviewsCount;
      }

      // Default: VIP ranking
      return sortSalonsForSearchResults([a.salon, b.salon])[0].id === a.salon.id ? -1 : 1;
    });

    return list;
  }, [
    salons,
    activeProvince,
    activeCity,
    activeDistrict,
    activeLocation,
    activeMaxDistance,
    activeSortByDistance,
    onlyVipFilter,
    onlyMobileService,
    selectedServiceLine,
    searchQuery,
    sortByOption,
  ]);

  const openModal = () => {
    if (onOpenLocationModal) {
      onOpenLocationModal();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <div className="space-y-4 pb-24 text-right">
      {/* Title & Proximity Subtitle */}
      <div className="px-1 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#173B3F] font-serif">
            سالن‌ها و مراکز تخصصی زیبایی
          </h1>
          <p className="text-xs text-[#6C6C6C] mt-0.5">
            فیلتر پیشرفته بر اساس موقعیت مکانی GPS، دوری و نزدیکی و کلیه استان‌های کشور
          </p>
        </div>
      </div>

      {/* GPS & Location Quick Toolbar */}
      <div className="bg-gradient-to-r from-[#173B3F] to-[#1F4E53] rounded-3xl p-3.5 text-white shadow-md shadow-[#173B3F]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#D9A2B0] border border-white/15 shrink-0">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-white">
                {activeProvince === 'همه' ? 'سراسر کشور' : `${activeProvince}، ${activeCity}`}
                {activeDistrict !== 'همه' ? ` (${activeDistrict})` : ''}
              </span>
              {activeLocation.coords && (
                <span className="bg-[#D9A2B0]/20 text-[#D9A2B0] border border-[#D9A2B0]/30 text-[9.5px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Navigation className="w-2.5 h-2.5 rotate-45" />
                  <span>GPS فعال</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#E8F0EF]/80 mt-0.5">
              {activeLocation.label || 'موقعیت تنظیم نشده'}
              {activeMaxDistance !== null && ` • شعاع تا ${toPersianDigits(activeMaxDistance)} ک‌م`}
            </p>
          </div>
        </div>

        {/* Change Location / GPS Button */}
        <button
          onClick={openModal}
          className="h-9 px-4 rounded-xl bg-white text-[#173B3F] text-xs font-bold hover:bg-[#FAF7F2] transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0 self-end sm:self-center"
        >
          <MapPin className="w-3.5 h-3.5 text-[#173B3F]" />
          <span>تغییر شهر یا مکان‌یابی GPS</span>
        </button>
      </div>

      {/* Inline Cascading Filters (استان -> شهر -> محله) for Instant 1-Click Access */}
      <div className="bg-white rounded-2xl border border-[#E7E2DA] p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#173B3F]" />
            فیلتر استانی و شهری (پوشش ۳۱ استان کشور):
          </span>
          {(activeProvince !== 'همه' || activeCity !== 'همه' || activeDistrict !== 'همه') && (
            <button
              onClick={() => {
                setActiveProvince('همه');
                setActiveCity('همه');
                setActiveDistrict('همه');
              }}
              className="text-[11px] text-[#8A3838] hover:underline flex items-center gap-0.5 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ریست استان</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* استان */}
          <div className="relative">
            <select
              value={activeProvince}
              onChange={(e) => {
                const prov = e.target.value;
                setActiveProvince(prov);
                setActiveCity('همه');
                setActiveDistrict('همه');
              }}
              className="w-full h-10 px-3 pl-7 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA] text-xs text-[#1C1C1C] font-semibold focus:border-[#173B3F] outline-none appearance-none"
            >
              <option value="همه">همه ۳۱ استان ایران</option>
              {IRAN_PROVINCES.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute left-2.5 top-3 w-3.5 h-3.5 text-[#6C6C6C] pointer-events-none" />
          </div>

          {/* شهر / شهرستان */}
          <div className="relative">
            <select
              value={activeCity}
              disabled={activeProvince === 'همه'}
              onChange={(e) => {
                setActiveCity(e.target.value);
                setActiveDistrict('همه');
              }}
              className="w-full h-10 px-3 pl-7 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA] text-xs text-[#1C1C1C] font-semibold focus:border-[#173B3F] outline-none appearance-none disabled:bg-[#F2EFE9] disabled:text-[#999]"
            >
              <option value="همه">
                {activeProvince === 'همه' ? 'ابتدا استان را انتخاب کنید' : 'همه شهرستان‌ها'}
              </option>
              {availableCounties.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute left-2.5 top-3 w-3.5 h-3.5 text-[#6C6C6C] pointer-events-none" />
          </div>

          {/* منطقه یا محله */}
          <div className="relative">
            {availableDistricts.length > 0 ? (
              <select
                value={activeDistrict}
                onChange={(e) => setActiveDistrict(e.target.value)}
                className="w-full h-10 px-3 pl-7 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA] text-xs text-[#1C1C1C] font-semibold focus:border-[#173B3F] outline-none appearance-none"
              >
                <option value="همه">همه مناطق و محله‌ها</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="محله یا منطقه..."
                value={activeDistrict === 'همه' ? '' : activeDistrict}
                onChange={(e) => setActiveDistrict(e.target.value || 'همه')}
                className="w-full h-10 px-3 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none placeholder:text-[#999]"
              />
            )}
            {availableDistricts.length > 0 && (
              <ChevronDown className="absolute left-2.5 top-3 w-3.5 h-3.5 text-[#6C6C6C] pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {/* Distance Radius Quick Filter Bar (دوری و نزدیکی) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[#6C6C6C] text-[11px] shrink-0 font-medium ml-1">
          فاصله تا شما:
        </span>
        {[
          { label: 'همه فواصل', value: null },
          { label: 'تا ۳ ک‌م', value: 3 },
          { label: 'تا ۵ ک‌م', value: 5 },
          { label: 'تا ۱۰ ک‌م', value: 10 },
          { label: 'تا ۲۵ ک‌م', value: 25 },
        ].map((dist) => {
          const isSelected = activeMaxDistance === dist.value;
          return (
            <button
              key={String(dist.value)}
              onClick={() => setActiveMaxDistance(dist.value)}
              className={`h-8 px-3 rounded-full text-xs font-semibold shrink-0 transition-all border ${
                isSelected
                  ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-xs'
                  : 'bg-white text-[#1C1C1C] border-[#E7E2DA] hover:border-[#173B3F]'
              }`}
            >
              {dist.label}
            </button>
          );
        })}
      </div>

      {/* Search Input Bar (48px height conforming to spec) */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute right-4 w-4 h-4 text-[#173B3F] pointer-events-none" />
          <input
            type="text"
            placeholder="جستجوی نام سالن، متخصص، خدمت (کراتین، فیشیال، ناخن...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pr-11 pl-11 rounded-2xl bg-white border border-[#E7E2DA] text-xs text-[#1C1C1C] placeholder:text-[#6C6C6C] focus:border-[#173B3F] focus:ring-1 focus:ring-[#173B3F] outline-none transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-4 w-5 h-5 rounded-full bg-[#E8F0EF] flex items-center justify-center text-[#173B3F] hover:bg-[#173B3F] hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Service Line Chips with Specialized Beauty Activity Icons */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SERVICE_LINES.map((line) => {
          const isActive = selectedServiceLine === line.id;
          return (
            <button
              key={line.id}
              onClick={() => setSelectedServiceLine(line.id)}
              className={`h-11 px-3.5 rounded-2xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 border shadow-sm ${
                isActive
                  ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-md shadow-[#173B3F]/20'
                  : 'bg-white text-[#1C1C1C] border-[#E7E2DA] hover:border-[#173B3F]'
              }`}
            >
              <BeautyActivityIcon activityId={line.id} size="sm" isActive={isActive} />
              <span>{line.name}</span>
            </button>
          );
        })}
      </div>

      {/* Filter & Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Proximity Sort Button */}
          <button
            onClick={() => {
              setSortByOption('distance');
              setActiveSortByDistance(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
              sortByOption === 'distance'
                ? 'border-[#173B3F] bg-[#173B3F] text-white font-bold shadow-xs'
                : 'border-[#E7E2DA] bg-white text-[#1C1C1C] hover:border-[#173B3F]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 rotate-45" />
            <span>نزدیک‌ترین به من (GPS)</span>
          </button>

          {/* VIP Filter */}
          <button
            onClick={() => setOnlyVipFilter(!onlyVipFilter)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
              onlyVipFilter
                ? 'border-[#C99558] bg-[#FBF4EC] text-[#8C5526] font-bold shadow-xs'
                : 'border-[#E7E2DA] bg-white text-[#6C6C6C] hover:border-[#C99558]'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-[#C99558]" />
            <span>فقط سالن‌های VIP</span>
          </button>

          {/* Mobile Service Filter */}
          <button
            onClick={() => setOnlyMobileService(!onlyMobileService)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
              onlyMobileService
                ? 'border-[#173B3F] bg-[#E8F0EF] text-[#173B3F] font-bold'
                : 'border-[#E7E2DA] bg-white text-[#6C6C6C] hover:border-[#173B3F]'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-[#173B3F]" />
            <span>خدمات در محل</span>
          </button>
        </div>

        <span className="text-[11px] text-[#6C6C6C]">
          {toPersianDigits(processedSalons.length)} سالن فعال
        </span>
      </div>

      {/* Salons List */}
      {processedSalons.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-[#E7E2DA] p-6 space-y-3">
          <p className="text-sm font-bold text-[#1C1C1C]">
            سالنی مطابق با معیارهای مکانی و جستجوی شما یافت نشد
          </p>
          <p className="text-xs text-[#6C6C6C] max-w-md mx-auto leading-relaxed">
            احتمالاً در استان یا شعاع مسافت انتخابی شما هنوز سالنی ثبت نشده است، یا فیلتر لاین محدود است.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setActiveProvince('همه');
                setActiveCity('همه');
                setActiveDistrict('همه');
                setActiveMaxDistance(null);
                setSearchQuery('');
                setSelectedServiceLine('all');
                setOnlyMobileService(false);
                setOnlyVipFilter(false);
              }}
              className="px-5 py-2.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#112D30] transition-all shadow-sm"
            >
              نمایش همه سالن‌های کشور
            </button>

            <button
              onClick={openModal}
              className="px-4 py-2.5 rounded-full bg-[#E8F0EF] border border-[#173B3F]/20 text-xs font-bold text-[#173B3F] hover:bg-[#173B3F] hover:text-white transition-all shadow-sm flex items-center gap-1"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>تنظیم موقعیت GPS</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {processedSalons.map(({ salon, distanceKm }) => (
            <SalonCard
              key={salon.id}
              salon={salon}
              distanceKm={distanceKm}
              isWishlisted={savedSalonIds.includes(salon.id)}
              onToggleWishlist={() => onToggleWishlistSalon(salon.id)}
              onBookNow={onBookSalon}
              onViewSpecialistPortfolio={onViewSpecialistPortfolio}
            />
          ))}
        </div>
      )}

      {/* Modal instance if not provided externally */}
      {!onOpenLocationModal && (
        <LocationSelectorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          locationState={activeLocation}
          onUpdateLocation={setActiveLocation}
          selectedProvince={activeProvince}
          onSelectProvince={setActiveProvince}
          selectedCity={activeCity}
          onSelectCity={setActiveCity}
          selectedDistrict={activeDistrict}
          onSelectDistrict={setActiveDistrict}
          maxDistanceKm={activeMaxDistance}
          onSelectMaxDistance={setActiveMaxDistance}
          sortByDistance={activeSortByDistance}
          onToggleSortByDistance={setActiveSortByDistance}
        />
      )}
    </div>
  );
};
