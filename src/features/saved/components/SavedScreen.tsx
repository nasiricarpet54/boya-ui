import React from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { SalonCard } from '../../../shared/components/ui/SalonCard';
import { useSalons } from '../../../shared/api/queries';
import { useModalStore } from '../../../shared/stores/modalStore';
import { useUIStore } from '../../../shared/stores/uiStore';
import { SEO } from '../../../shared/components/SEO';

import { useFavoritesStore } from '../../../shared/stores/favoritesStore';

export const SavedScreen: React.FC = () => {
  const navigate = useNavigate();
  const { data: salons = [] } = useSalons();
  const { openBookingModal, openPortfolioModal } = useModalStore();
  const { showToast } = useUIStore();
  const { savedSalonIds, toggleFavorite, isFavorite } = useFavoritesStore();

  const savedSalons = (salons || []).filter((s: any) => savedSalonIds.some(id => String(id) === String(s.id)));

  const handleToggleWishlistSalon = (id: string | number) => {
    const isAdded = toggleFavorite(id);
    showToast(isAdded ? 'به نشان‌شده‌ها اضافه شد.' : 'از نشان‌شده‌ها حذف شد.');
  };

  return (
    <>
      <SEO 
        title="نشان‌شده‌ها" 
        description="لیست سالن‌های زیبایی و متخصصین مورد علاقه شما برای دسترسی سریع و رزرو مجدد خدمات." 
      />
      <div className="space-y-5 pb-24">
        <div className="px-1">
          <h1 className="text-xl font-extrabold text-[#173B3F] font-serif">نشان‌شده‌ها</h1>
          <p className="text-xs text-[#6C6C6C] mt-0.5">سالن‌هایی که برای رزروهای آینده ذخیره کرده‌اید</p>
        </div>

        {savedSalons.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E2DA] p-6 space-y-3">
            <Heart className="w-12 h-12 text-[#B35D67] mx-auto opacity-20" />
            <h3 className="text-base font-bold text-[#173B3F]">هنوز سالنی را نشان نکرده‌اید</h3>
            <button
              onClick={() => navigate({ to: '/salons' })}
              className="mt-2 px-6 py-2.5 rounded-full bg-[#173B3F] text-white text-xs font-bold"
            >
              مشاهده سالن‌ها
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {savedSalons.map((salon: any) => (
              <SalonCard
                key={salon.id}
                salon={salon}
                isWishlisted={true}
                onToggleWishlist={() => handleToggleWishlistSalon(salon.id)}
                onBookNow={openBookingModal}
                onViewSpecialistPortfolio={openPortfolioModal}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};
