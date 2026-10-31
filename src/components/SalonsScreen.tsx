import React, { useState, useMemo } from 'react';
import { Search, X, MapPin, Sparkles, Filter, Car, Crown } from 'lucide-react';
import { SALONS, SERVICE_LINES, Salon, SalonService, Specialist } from '../data/marketplaceData';
import { SalonCard } from './SalonCard';
import { toPersianDigits } from '../utils/persianUtils';
import { sortSalonsForSearchResults } from '../utils/salonRanking';
import { BeautyActivityIcon } from './BeautyActivityIcon';

interface SalonsScreenProps {
  salons?: Salon[];
  initialServiceLine?: string;
  onBookSalon: (salon: Salon, service: SalonService, specialist: Specialist, date: string, time: string) => void;
  onViewSpecialistPortfolio: (specialist: Specialist, salon: Salon) => void;
  savedSalonIds: string[];
  onToggleWishlistSalon: (salonId: string) => void;
  selectedCity: string;
}

export const SalonsScreen: React.FC<SalonsScreenProps> = ({
  salons = SALONS,
  initialServiceLine = 'all',
  onBookSalon,
  onViewSpecialistPortfolio,
  savedSalonIds,
  onToggleWishlistSalon,
  selectedCity,
}) => {
  const [selectedServiceLine, setSelectedServiceLine] = useState<string>(initialServiceLine);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyMobileService, setOnlyMobileService] = useState<boolean>(false);
  const [onlyVipFilter, setOnlyVipFilter] = useState<boolean>(false);

  const filteredSalons = useMemo(() => {
    const list = salons.filter((salon) => {
      // City filter
      if (selectedCity !== 'همه' && !salon.province.includes(selectedCity) && !salon.city.includes(selectedCity)) {
        return false;
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
        const matchService = salon.services.some((s) => s.name.toLowerCase().includes(q));
        const matchSpecialist = salon.specialists.some((sp) => sp.name.toLowerCase().includes(q));
        if (!matchName && !matchDistrict && !matchService && !matchSpecialist) {
          return false;
        }
      }

      return true;
    });

    // Sort with VIP salons strictly displayed first according to priority
    return sortSalonsForSearchResults(list);
  }, [salons, selectedCity, selectedServiceLine, searchQuery, onlyMobileService, onlyVipFilter]);

  return (
    <div className="space-y-5 pb-24">
      {/* Title */}
      <div className="px-1">
        <h1 className="text-xl font-extrabold text-[#173B3F] font-serif">
          سالن‌ها و مراکز تخصصی زیبایی
        </h1>
        <p className="text-xs text-[#6C6C6C] mt-0.5">
          رزرو مستقیم با برترین بیوتیشن‌ها و سالن‌های مورد تایید بویا
        </p>
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

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
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
          {toPersianDigits(filteredSalons.length)} سالن در {selectedCity} (اولویت با VIP)
        </span>
      </div>

      {/* Salons List */}
      {filteredSalons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E2DA] p-6 space-y-3">
          <p className="text-sm font-bold text-[#1C1C1C]">
            سالنی مطابق با معیارهای جستجوی شما یافت نشد
          </p>
          <p className="text-xs text-[#6C6C6C]">
            لطفاً فیلتر لاین یا شهر را تغییر دهید یا عبارت دیگری را جستجو فرمایید.
          </p>
          <button
            onClick={() => {
              setSelectedServiceLine('all');
              setSearchQuery('');
              setOnlyMobileService(false);
              setOnlyVipFilter(false);
            }}
            className="px-5 py-2.5 rounded-full bg-[#E8F0EF] border border-[#173B3F]/20 text-xs font-bold text-[#173B3F] hover:bg-[#173B3F] hover:text-white transition-all shadow-sm"
          >
            مشاهده همه سالن‌ها
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSalons.map((salon) => (
            <SalonCard
              key={salon.id}
              salon={salon}
              isWishlisted={savedSalonIds.includes(salon.id)}
              onToggleWishlist={() => onToggleWishlistSalon(salon.id)}
              onBookNow={onBookSalon}
              onViewSpecialistPortfolio={onViewSpecialistPortfolio}
            />
          ))}
        </div>
      )}
    </div>
  );
};
