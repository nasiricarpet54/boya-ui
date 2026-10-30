import React, { useState, useMemo } from 'react';
import { Search, X, MapPin, Sparkles, Filter, Car } from 'lucide-react';
import { SALONS, SERVICE_LINES, Salon, SalonService, Specialist } from '../data/marketplaceData';
import { SalonCard } from './SalonCard';
import { toPersianDigits } from '../utils/persianUtils';

interface SalonsScreenProps {
  initialServiceLine?: string;
  onBookSalon: (salon: Salon, service: SalonService, specialist: Specialist, date: string, time: string) => void;
  onViewSpecialistPortfolio: (specialist: Specialist, salon: Salon) => void;
  savedSalonIds: string[];
  onToggleWishlistSalon: (salonId: string) => void;
  selectedCity: string;
}

export const SalonsScreen: React.FC<SalonsScreenProps> = ({
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

  const filteredSalons = useMemo(() => {
    return SALONS.filter((salon) => {
      // City filter
      if (selectedCity !== 'همه' && !salon.province.includes(selectedCity) && !salon.city.includes(selectedCity)) {
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
  }, [selectedCity, selectedServiceLine, searchQuery, onlyMobileService]);

  return (
    <div className="space-y-5 pb-24">
      {/* Title */}
      <div className="px-1">
        <h1 className="text-xl font-extrabold text-[#1A2942] font-serif">
          سالن‌ها و مراکز تخصصی زیبایی
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          رزرو مستقیم با برترین بیوتیشن‌ها و سالن‌های مورد تایید بویا
        </p>
      </div>

      {/* Search Input Bar (48px height conforming to spec) */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute right-4 w-4 h-4 text-[#C59B27] pointer-events-none" />
          <input
            type="text"
            placeholder="جستجوی نام سالن، متخصص، خدمت (کراتین، فیشیال، ناخن...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pr-11 pl-11 rounded-2xl bg-white border border-[#E2E8F0] text-xs text-[#1A2942] placeholder:text-[#64748B] focus:border-[#C59B27] focus:ring-1 focus:ring-[#C59B27] outline-none transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-4 w-5 h-5 rounded-full bg-[#FAF7F2] flex items-center justify-center text-[#64748B] hover:text-[#1A2942]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Service Line Chips (36px height pill radius) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SERVICE_LINES.map((line) => {
          const isActive = selectedServiceLine === line.id;
          return (
            <button
              key={line.id}
              onClick={() => setSelectedServiceLine(line.id)}
              className={`h-9 px-4 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#1A2942] text-white border border-[#1A2942]'
                  : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:border-[#C59B27]'
              }`}
            >
              <span>{line.emoji}</span>
              <span>{line.name}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-2 px-1 text-xs">
        <button
          onClick={() => setOnlyMobileService(!onlyMobileService)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
            onlyMobileService
              ? 'border-[#C59B27] bg-[#FAF3E7] text-[#1A2942] font-semibold'
              : 'border-[#E2E8F0] bg-white text-[#64748B]'
          }`}
        >
          <Car className="w-3.5 h-3.5 text-[#C59B27]" />
          <span>پذیرش خدمات در محل (Mobile Service)</span>
        </button>

        <span className="text-xs text-[#64748B]">
          {toPersianDigits(filteredSalons.length)} سالن فعال در {selectedCity}
        </span>
      </div>

      {/* Salons List */}
      {filteredSalons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#EEDCC5] p-6 space-y-3">
          <p className="text-sm font-bold text-[#1A2942]">
            سالنی مطابق با معیارهای جستجوی شما یافت نشد
          </p>
          <p className="text-xs text-[#64748B]">
            لطفاً فیلتر لاین یا شهر را تغییر دهید یا عبارت دیگری را جستجو فرمایید.
          </p>
          <button
            onClick={() => {
              setSelectedServiceLine('all');
              setSearchQuery('');
              setOnlyMobileService(false);
            }}
            className="px-5 py-2 rounded-full bg-[#FAF3E7] border border-[#EEDCC5] text-xs font-bold text-[#1A2942] hover:bg-[#C59B27]"
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
