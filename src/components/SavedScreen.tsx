import React from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { SALONS, Salon, SalonService, Specialist } from '../data/marketplaceData';
import { SalonCard } from './SalonCard';

interface SavedScreenProps {
  savedSalonIds: string[];
  onToggleWishlistSalon: (salonId: string) => void;
  onBookSalon: (salon: Salon, service: SalonService, specialist: Specialist, date: string, time: string) => void;
  onViewSpecialistPortfolio: (specialist: Specialist, salon: Salon) => void;
  onNavigateToSalons: () => void;
}

export const SavedScreen: React.FC<SavedScreenProps> = ({
  savedSalonIds,
  onToggleWishlistSalon,
  onBookSalon,
  onViewSpecialistPortfolio,
  onNavigateToSalons,
}) => {
  const savedSalons = SALONS.filter((s) => savedSalonIds.includes(s.id));

  return (
    <div className="space-y-5 pb-24">
      {/* Title */}
      <div className="px-1">
        <h1 className="text-xl font-extrabold text-[#1A2942] font-serif">
          نشان‌شده‌ها و سالن‌های محبوب
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          سالن‌ها و مراکز زیبایی که برای رزروهای آینده ذخیره کرده‌اید
        </p>
      </div>

      {savedSalons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#EEDCC5] p-6 space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#FAF7F2] border border-[#EEDCC5] flex items-center justify-center mx-auto text-[#C59B27]">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#1A2942]">
            هنوز سالنی را نشان نکرده‌اید
          </h3>
          <p className="text-xs text-[#64748B] max-w-xs mx-auto">
            با نشان کردن سالن‌های معتبر، سریع‌تر می‌توانید به تقویم سانس‌های آن‌ها دسترسی پیدا کنید.
          </p>
          <button
            onClick={onNavigateToSalons}
            className="mt-2 px-6 py-2.5 rounded-full bg-[#C59B27] text-[#1A2942] text-xs font-bold hover:bg-[#B8860B] transition-colors"
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
