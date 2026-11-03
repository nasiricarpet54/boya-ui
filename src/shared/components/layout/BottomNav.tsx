import React from 'react';
import { Sparkles, Search, Calendar, Heart, User } from 'lucide-react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { toPersianDigits } from '../../utils/persianUtils';
import { useUIStore, NavTab } from '../../stores/uiStore';
import { useBookings } from '../../api/queries';
import { useFavoritesStore } from '../../stores/favoritesStore';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab, setActiveTab } = useUIStore();
  const { data: bookings = [] } = useBookings();
  
  // Calculate counts for badges
  const activeBookingsCount = (bookings || []).filter((b: any) => b.status === 'confirmed').length;
  const { savedSalonIds } = useFavoritesStore();
  const savedCount = savedSalonIds.length;

  // Sync activeTab with current path
  React.useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveTab('home');
    else if (path.includes('/salons')) setActiveTab('salons');
    else if (path.includes('/bookings')) setActiveTab('bookings');
    else if (path.includes('/saved')) setActiveTab('saved');
    else if (path.includes('/profile')) setActiveTab('profile');
  }, [location.pathname, setActiveTab]);

  const tabs: { id: NavTab; label: string; icon: React.ElementType; badge?: number; path: string }[] = [
    { id: 'home', label: 'خانه', icon: Sparkles, path: '/' },
    { id: 'salons', label: 'سالن‌ها و خدمات', icon: Search, path: '/salons' },
    { id: 'bookings', label: 'نوبت‌های من', icon: Calendar, badge: activeBookingsCount, path: '/bookings' },
    { id: 'saved', label: 'نشان‌شده‌ها', icon: Heart, badge: savedCount, path: '/saved' },
    { id: 'profile', label: 'پروفایل و تیکت', icon: User, path: '/profile' },
  ];

  const handleTabChange = (tabId: NavTab, path: string) => {
    setActiveTab(tabId);
    navigate({ to: path });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-[#E7E2DA] shadow-[0_-4px_20px_rgba(23,59,63,0.06)]">
      <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(tab.path);

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id, tab.path)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 transition-all group ${
                isActive ? 'text-[#173B3F]' : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.3] text-[#173B3F]' : 'stroke-[1.8]'
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 bg-[#D9A2B0] text-[#173B3F] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {toPersianDigits(tab.badge)}
                  </span>
                ) : null}
              </div>

              <span
                className={`text-[11px] mt-1 tracking-tight font-medium transition-colors ${
                  isActive ? 'text-[#173B3F] font-bold' : 'text-[#6C6C6C]'
                }`}
              >
                {tab.label}
              </span>

              {/* Active dot indicator with BOYA petrol teal */}
              <div
                className={`w-1.5 h-1.5 rounded-full bg-[#173B3F] mt-0.5 transition-all duration-200 ${
                  isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
