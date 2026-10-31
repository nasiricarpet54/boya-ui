import React from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { SALONS, Salon, SalonService, Specialist } from '../../../shared/data/marketplaceData';
import { SalonCard } from '../../salons/components/SalonCard';

interface SavedScreenProps {
  salons?: Salon[];
  savedSalonIds: string[];
  onToggleWishlistSalon: (salonId: string) => void;
  onBookSalon: (salon: Salon, service: SalonService, specialist: Specialist, date: string, time: string) => void;
  onViewSpecialistPortfolio: (specialist: Specialist, salon: Salon) => void;
  onNavigateToSalons: () => void;
}

export const SavedScreen: React.FC<SavedScreenProps> = ({
  salons = SALONS,
  savedSalonIds,
  onToggleWishlistSalon,
  onBookSalon,
  onViewSpecialistPortfolio,
  onNavigateToSalons,
}) => {
  const savedSalons = salons.filter((s) => savedSalonIds.includes(s.id));

  return (
    <div className="space-y-5 pb-24">
      {/* Title */}
      <div className="px-1">
        <h1 className="text-xl font-extrabold text-[#173B3F] font-serif">
          نشان‌شده‌ها و سالن‌های محبوب
        </h1>
        <p className="text-xs text-[#6C6C6C] mt-0.5">
          سالن‌ها و مراکز زیبایی که برای رزروهای آینده ذخیره کرده‌اید
        </p>
      </div>

      {savedSalons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E2DA] p-6 space-y-3 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#F8ECEE] border border-[#D9A2B0]/30 flex items-center justify-center mx-auto text-[#B35D67]">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#173B3F]">
            هنوز سالنی را نشان نکرده‌اید
          </h3>
          <p className="text-xs text-[#6C6C6C] max-w-xs mx-auto">
            با نشان کردن سالن‌های معتبر، سریع‌تر می‌توانید به تقویم سانس‌های آن‌ها دسترسی پیدا کنید.
          </p>
          <button
            onClick={onNavigateToSalons}
            className="mt-2 px-6 py-2.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] transition-colors shadow-md shadow-[#173B3F]/20"
          >
            مشاهده سالن‌ها و خدمات
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {savedSalons.map((salon) => (
            <SalonCard
              key={salon.id}
              salon={salon}
              isWishlisted={true}
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
