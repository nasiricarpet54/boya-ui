import React from 'react';
import { Sparkles, Search, Calendar, Heart, User } from 'lucide-react';
import { toPersianDigits } from '../utils/persianUtils';

export type NavTab = 'home' | 'salons' | 'bookings' | 'saved' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  bookingsCount: number;
  savedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  bookingsCount,
  savedCount,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'home', label: 'خانه', icon: Sparkles },
    { id: 'salons', label: 'سالن‌ها و خدمات', icon: Search },
    { id: 'bookings', label: 'نوبت‌های من', icon: Calendar, badge: bookingsCount },
    { id: 'saved', label: 'نشان‌شده‌ها', icon: Heart, badge: savedCount },
    { id: 'profile', label: 'پروفایل و تیکت', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-[#EEDCC5] shadow-[0_-4px_20px_rgba(26,41,66,0.05)]">
      <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 transition-all group ${
                isActive ? 'text-[#C59B27]' : 'text-[#64748B] hover:text-[#1A2942]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 bg-[#C59B27] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {toPersianDigits(tab.badge)}
                  </span>
                ) : null}
              </div>

              <span
                className={`text-[11px] mt-1 tracking-tight font-medium transition-colors ${
                  isActive ? 'text-[#1A2942] font-semibold' : 'text-[#64748B]'
                }`}
              >
                {tab.label}
              </span>

              {/* Active dot indicator adhering to spec */}
              <div
                className={`w-1.5 h-1.5 rounded-full bg-[#C59B27] mt-0.5 transition-all duration-200 ${
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
