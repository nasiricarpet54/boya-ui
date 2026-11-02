import React, { useState, useMemo, useEffect } from 'react';
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
import { useSearch } from '@tanstack/react-router';
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
import { useAuthStore } from '../../../shared/stores/authStore';
import api from '../../../shared/api/apiClient';

export const SalonsScreen: React.FC = () => {
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
  const [sortByOption, setSortByOption] = useState<'distance' | 'vip' | 'rating' | 'popular'>('distance');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [savedSalonIds, setSavedSalonIds] = useState<number[]>([]);
  useEffect(() => {
    let active = true;
    if (!isAuthenticated) { setSavedSalonIds([]); return; }
    api.get('/me/favorites').then(({ data }) => { if (active) setSavedSalonIds(Array.isArray(data?.salonIds) ? data.salonIds.map(Number) : []); })
      .catch(() => { if (active) setSavedSalonIds([]); });
    return () => { active = false; };
  }, [isAuthenticated]);
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
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          if (!salon.name.toLowerCase().includes(q) && !salon.district.toLowerCase().includes(q)) return false;
        }
        return true;
      });

    list.sort((a: any, b: any) => {
      if (sortByOption === 'distance' && sortByDistance && a.distanceKm !== undefined && b.distanceKm !== undefined) {
        return a.distanceKm - b.distanceKm;
      }
      if (sortByOption === 'rating') return Number(b.salon.rating) - Number(a.salon.rating);
      return 0;
    });

    return list;
  }, [publishedSalons, selectedProvince, selectedCity, selectedDistrict, customerLocation, maxDistanceKm, sortByDistance, onlyVipFilter, onlyMobileService, selectedServiceLine, searchQuery, sortByOption]);

  const handleToggleWishlistSalon = async (id: string | number) => {
    const salonId = Number(id);
    const wasSaved = savedSalonIds.includes(salonId);
    try {
      if (wasSaved) await api.delete(`/me/favorites/${salonId}`);
      else await api.post(`/me/favorites/${salonId}`);
      setSavedSalonIds((ids) => wasSaved ? ids.filter((value) => value !== salonId) : [...ids, salonId]);
      showToast(wasSaved ? 'از نشان‌شده‌ها حذف شد.' : 'به نشان‌شده‌ها اضافه شد.');
    } catch { showToast(isAuthenticated ? 'ذخیره نشان‌شده نیازمند ورود است.' : 'برای نشان کردن سالن ابتدا وارد شوید.'); }
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
      <div className="text-center py-20 bg-white rounded-3xl border border-red-100 m-4">
        <p className="text-red-500 font-bold">خطایی در دریافت اطلاعات رخ داد.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 text-right">
      <div className="px-1 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#173B3F] font-serif">سالن‌ها و مراکز تخصصی</h1>
          <p className="text-xs text-[#6C6C6C] mt-0.5">فیلتر هوشمند بر اساس موقعیت GPS و ۳۱ استان کشور</p>
        </div>

        {/* View Mode Toggle: List vs Map */}
        <div className="flex p-1 bg-white rounded-xl border border-[#E7E2DA] shadow-xs">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-[#173B3F] text-white shadow-xs'
                : 'text-[#6C6C6C] hover:text-[#173B3F]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>لیست</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'map'
                ? 'bg-[#173B3F] text-white shadow-xs'
                : 'text-[#6C6C6C] hover:text-[#173B3F]'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>نقشه</span>
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#173B3F] to-[#1F4E53] rounded-3xl p-3.5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Compass className="w-10 h-10 p-2 rounded-2xl bg-white/10 text-[#D9A2B0] animate-pulse" />
          <div>
            <span className="text-xs font-bold block">
              {selectedProvince === 'همه' ? 'سراسر کشور' : `${selectedProvince}، ${selectedCity}`}
            </span>
            <p className="text-[11px] text-[#E8F0EF]/80">{customerLocation.label}</p>
          </div>
        </div>
        <button onClick={() => setIsLocationModalOpen(true)} className="h-9 px-4 rounded-xl bg-white text-[#173B3F] text-xs font-bold shadow-sm">تغییر مکان</button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E7E2DA] p-3 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#173B3F]">فیلتر مکانی:</span>
          <button onClick={() => { setSelectedProvince('همه'); setSelectedCity('همه'); setSelectedDistrict('همه'); }} className="text-[11px] text-[#8A3838] flex items-center gap-1"><RotateCcw className="w-3 h-3" />ریست</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative">
            <select value={selectedProvince} onChange={(e) => { setSelectedProvince(e.target.value); setSelectedCity('همه'); }} className="w-full h-10 px-3 pl-7 rounded-xl bg-[#FAF7F2] border text-xs font-semibold appearance-none">
              <option value="همه">همه استان‌ها</option>
              {IRAN_PROVINCES.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <ChevronDown className="absolute left-2.5 top-3 w-3.5 h-3.5 text-[#6C6C6C]" />
          </div>
          <div className="relative">
            <select value={selectedCity} disabled={selectedProvince === 'همه'} onChange={(e) => setSelectedCity(e.target.value)} className="w-full h-10 px-3 pl-7 rounded-xl bg-[#FAF7F2] border text-xs font-semibold appearance-none disabled:opacity-50">
              <option value="همه">همه شهرها</option>
              {availableCounties.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute left-2.5 top-3 w-3.5 h-3.5 text-[#6C6C6C]" />
          </div>
          <div className="relative">
             <input type="text" placeholder="منطقه یا محله..." value={selectedDistrict === 'همه' ? '' : selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value || 'همه')} className="w-full h-10 px-3 rounded-xl bg-[#FAF7F2] border text-xs outline-none" />
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-4 top-4 w-4 h-4 text-[#173B3F]" />
        <input type="text" placeholder="جستجوی نام سالن، متخصص یا خدمت..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white border text-xs outline-none shadow-sm" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {SERVICE_LINES.map(line => {
          const isActive = selectedServiceLine === line.id;
          return (
            <button key={line.id} onClick={() => setSelectedServiceLine(line.id)} className={`h-11 px-3.5 rounded-2xl text-xs font-semibold shrink-0 flex items-center gap-2 border transition-all ${isActive ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-md' : 'bg-white border-[#E7E2DA]'}`}>
              <BeautyActivityIcon activityId={line.id} size="sm" isActive={isActive} />
              <span>{line.name}</span>
            </button>
          );
        })}
      </div>

      {viewMode === 'map' ? (
        <div className="space-y-4 animate-fadeIn">
          <SalonMap
            salons={processedSalons}
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
                isWishlisted={savedSalonIds.includes(salon.id)}
                onToggleWishlist={() => void handleToggleWishlistSalon(salon.id)}
                onBookNow={openBookingModal}
                onViewSpecialistPortfolio={openPortfolioModal}
              />
            ))
          )}
        </div>
      )}

    </div>
  );
};
