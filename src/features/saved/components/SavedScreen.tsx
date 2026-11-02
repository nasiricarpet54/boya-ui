import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { SalonCard } from '../../../shared/components/ui/SalonCard';
import { useSalons } from '../../../shared/api/queries';
import { useModalStore } from '../../../shared/stores/modalStore';
import { useUIStore } from '../../../shared/stores/uiStore';
import { useAuthStore } from '../../../shared/stores/authStore';
import api from '../../../shared/api/apiClient';

export const SavedScreen: React.FC = () => {
  const navigate = useNavigate();
  const { data: salons = [] } = useSalons();
  const { openBookingModal, openPortfolioModal } = useModalStore();
  const { showToast } = useUIStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [savedSalonIds, setSavedSalonIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) { setSavedSalonIds([]); setLoading(false); return; }
    api.get('/me/favorites').then(({ data }) => {
      if (active) setSavedSalonIds(Array.isArray(data?.salonIds) ? data.salonIds.map(Number) : []);
    }).catch(() => { if (active) showToast('دریافت نشان‌شده‌ها ناموفق بود.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAuthenticated, showToast]);

  const savedSalons = (salons || []).filter((s: any) => savedSalonIds.includes(Number(s.id)));

  const handleToggleWishlistSalon = async (id: string | number) => {
    const salonId = Number(id);
    const wasSaved = savedSalonIds.includes(salonId);
    try {
      if (wasSaved) await api.delete(`/me/favorites/${salonId}`);
      else await api.post(`/me/favorites/${salonId}`);
      setSavedSalonIds((ids) => wasSaved ? ids.filter((value) => value !== salonId) : [...ids, salonId]);
      showToast(wasSaved ? 'از نشان‌شده‌ها حذف شد.' : 'به نشان‌شده‌ها اضافه شد.');
    } catch { showToast('ذخیره تغییر انجام نشد؛ دوباره تلاش کنید.'); }
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-extrabold text-[#173B3F] font-serif">نشان‌شده‌ها</h1>
        <p className="text-xs text-[#6C6C6C] mt-0.5">سالن‌هایی که برای رزروهای آینده ذخیره کرده‌اید</p>
      </div>

      {loading ? <div className="text-center py-12">در حال دریافت نشان‌شده‌ها...</div> : savedSalons.length === 0 ? (
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
              onToggleWishlist={() => void handleToggleWishlistSalon(salon.id)}
              onBookNow={openBookingModal}
              onViewSpecialistPortfolio={openPortfolioModal}
            />
          ))}
        </div>
      )}
    </div>
  );
};
