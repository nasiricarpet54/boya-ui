import React from 'react';
import { Smartphone, Monitor, MapPin, Store, UserCheck, Bell } from 'lucide-react';

interface HeaderProps {
  appMode: 'customer' | 'salon_panel';
  onToggleAppMode: (mode: 'customer' | 'salon_panel') => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  activeBookingsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  appMode,
  onToggleAppMode,
  selectedCity,
  onSelectCity,
  isMobileFrame,
  onToggleFrame,
  activeBookingsCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#F5F0E8]/95 backdrop-blur-md border-b border-[#EEDCC5]/70 transition-all">
      {/* Top Banner: Mode Switcher (Customer App vs Salon App) */}
      <div className="bg-[#1A2942] text-white px-3 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[11px] text-[#D6E3FF] font-medium hidden sm:inline">
            پلتفرم جامع بویا (Phase 1 ویترین رایگان)
          </span>
        </div>

        {/* Two-Sided Platform Toggle */}
        <div className="flex items-center gap-1 bg-[#04142C] p-0.5 rounded-full border border-white/10">
          <button
            onClick={() => onToggleAppMode('customer')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
              appMode === 'customer'
                ? 'bg-[#C59B27] text-[#1A2942] shadow-sm'
                : 'text-[#D6E3FF] hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>اپ مشتری</span>
          </button>

          <button
            onClick={() => onToggleAppMode('salon_panel')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
              appMode === 'salon_panel'
                ? 'bg-[#C59B27] text-[#1A2942] shadow-sm'
                : 'text-[#D6E3FF] hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>پنل سالندار و متخصص</span>
          </button>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#1A2942] flex items-center justify-center text-[#C59B27] border border-[#C59B27]/40 shadow-sm shrink-0">
            <span className="font-serif font-black text-lg select-none">ب</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight text-[#1A2942] font-serif">
                بویا
              </span>
              <span className="text-[10px] tracking-widest text-[#775A00] font-semibold uppercase">
                BOYA
              </span>
            </div>
            <p className="text-[10px] text-[#64748B] -mt-1 hidden xs:block">
              {appMode === 'customer'
                ? 'رزرو آنلاین سالن‌ها و خدمات در محل'
                : 'سیستم جامع مدیریت سالن و سانس‌های کاری'}
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* City Selector */}
          {appMode === 'customer' && (
            <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] px-2.5 py-1 rounded-full text-xs text-[#1A2942]">
              <MapPin className="w-3.5 h-3.5 text-[#C59B27]" />
              <select
                value={selectedCity}
                onChange={(e) => onSelectCity(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="تهران">تهران</option>
                <option value="شیراز">شیراز</option>
                <option value="اصفهان">اصفهان</option>
                <option value="همه">همه شهرها</option>
              </select>
            </div>
          )}

          {/* Viewport Frame Mode Toggle (390px baseline vs desktop) */}
          <button
            onClick={onToggleFrame}
            title={isMobileFrame ? 'نمای گسترده مانیتور' : 'نمای استاندارد ۳۹۰ پیکسل'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-[#1A2942] bg-white border border-[#E2E8F0] hover:border-[#C59B27] transition-colors"
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-[#C59B27]" />
                <span className="text-[11px] font-medium hidden md:inline">نمای دسکتاپ</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-[#C59B27]" />
                <span className="text-[11px] font-medium hidden md:inline">قاب موبایل ۳۹۰px</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
