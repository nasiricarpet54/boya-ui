import React from 'react';
import { Smartphone, Monitor, MapPin, Store, UserCheck, ShieldCheck, Bell, Navigation } from 'lucide-react';
import { toPersianDigits } from '../utils/persianUtils';
import { BoyaLogo } from './BoyaLogo';

export type AppExperienceMode = 'customer' | 'salon_panel' | 'admin_panel';

interface HeaderProps {
  appMode: AppExperienceMode;
  onToggleAppMode: (mode: AppExperienceMode) => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  selectedProvince?: string;
  onOpenLocationModal?: () => void;
  hasGpsActive?: boolean;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  activeBookingsCount: number;
  pendingApprovalsCount: number;
  liveBackendStatus?: { isConnected: boolean; latencyMs: number };
}

export const Header: React.FC<HeaderProps> = ({
  appMode,
  onToggleAppMode,
  selectedCity,
  onSelectCity,
  selectedProvince = 'تهران',
  onOpenLocationModal,
  hasGpsActive = false,
  isMobileFrame,
  onToggleFrame,
  activeBookingsCount,
  pendingApprovalsCount,
  liveBackendStatus,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#F7F3EE]/95 backdrop-blur-md border-b border-[#E7E2DA] transition-all">
      {/* 3-App Master Portal Switcher Bar with Official Deep Petrol Theme */}
      <div className="bg-[#0F3232] text-white px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-[#173B3F]">
        <div className="flex items-center gap-2">
          {liveBackendStatus?.isConnected ? (
            <span className="flex items-center gap-1.5 bg-[#173B3F] text-[#6F9A8D] border border-[#6F9A8D]/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6F9A8D] animate-pulse" />
              <span>متصل به سرور بویا و دیتابیس پستگرس ({toPersianDigits(liveBackendStatus.latencyMs)}ms)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-[#173B3F] text-[#C99558] border border-[#C99558]/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C99558]" />
              <span>سرور و دیتابیس فعال</span>
            </span>
          )}
          <span className="text-[11px] text-[#E8F0EF] font-medium hidden md:inline">
            سامانه جامع زیبایی بویا (پلتفرم دوطرفه + سامانه وب ادمین کل)
          </span>
        </div>

        {/* Triple Application Switcher */}
        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-full border border-white/10">
          <button
            onClick={() => onToggleAppMode('customer')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
              appMode === 'customer'
                ? 'bg-[#D9A2B0] text-[#173B3F] shadow-sm font-bold'
                : 'text-[#E8F0EF] hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>۱. اپ مشتری</span>
          </button>

          <button
            onClick={() => onToggleAppMode('salon_panel')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
              appMode === 'salon_panel'
                ? 'bg-[#D9A2B0] text-[#173B3F] shadow-sm font-bold'
                : 'text-[#E8F0EF] hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>۲. پنل سالندار و متخصص</span>
          </button>

          <button
            onClick={() => onToggleAppMode('admin_panel')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
              appMode === 'admin_panel'
                ? 'bg-[#D9A2B0] text-[#173B3F] shadow-sm font-bold'
                : 'text-[#E8F0EF] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#C99558]" />
            <span>۳. سامانه ادمین کل</span>
            {pendingApprovalsCount > 0 && (
              <span className="bg-[#C99558] text-[#173B3F] text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                {toPersianDigits(pendingApprovalsCount)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Header Bar (Shown in Customer & Salon modes) */}
      {appMode !== 'admin_panel' && (
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Official Brand Identity */}
          <div className="flex items-center gap-2">
            <BoyaLogo variant="header" size="sm" showText={true} />
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* City & GPS Selector in Customer Mode */}
            {appMode === 'customer' && (
              <button
                onClick={onOpenLocationModal}
                className="flex items-center gap-1.5 bg-white border border-[#E7E2DA] hover:border-[#173B3F] px-2.5 py-1 rounded-full text-xs text-[#1C1C1C] hover:bg-[#FAF7F2] transition-all shadow-xs group"
                title="تغییر استان، شهرستان یا تعیین موقعیت با GPS"
              >
                <MapPin className="w-3.5 h-3.5 text-[#173B3F] group-hover:scale-110 transition-transform" />
                <span className="font-bold text-[11px] text-[#173B3F]">
                  {selectedCity === 'همه'
                    ? selectedProvince === 'همه'
                      ? 'کل کشور'
                      : selectedProvince
                    : selectedCity}
                </span>
                {hasGpsActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E5E52] animate-pulse" />
                )}
              </button>
            )}

            {/* Viewport Frame Mode Toggle (390px baseline vs desktop) */}
            <button
              onClick={onToggleFrame}
              title={isMobileFrame ? 'نمای گسترده مانیتور' : 'نمای استاندارد ۳۹۰ پیکسل'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-[#173B3F] bg-white border border-[#E7E2DA] hover:border-[#173B3F] transition-colors shadow-sm"
            >
              {isMobileFrame ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-[#173B3F]" />
                  <span className="text-[11px] font-medium hidden md:inline">نمای دسکتاپ</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-[#173B3F]" />
                  <span className="text-[11px] font-medium hidden md:inline">قاب موبایل ۳۹۰px</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
