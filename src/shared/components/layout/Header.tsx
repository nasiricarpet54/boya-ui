import React from 'react';
import { Smartphone, Monitor, MapPin } from 'lucide-react';
import { BoyaLogo } from '../ui/BoyaLogo';
import { useUIStore } from '../../stores/uiStore';
import { useLocationStore } from '../../stores/locationStore';
import { useAuthStore } from '../../stores/authStore';
import { useModalStore } from '../../stores/modalStore';

export const Header: React.FC = () => {
  const { 
    appMode, 
    isMobileFrame, 
    setIsMobileFrame, 
    setIsLocationModalOpen,
  } = useUIStore();
  
  const { selectedCity, selectedProvince, customerLocation } = useLocationStore();
  const { user, isAuthenticated } = useAuthStore();
  const { openAuthModal } = useModalStore();

  const hasGpsActive = !!customerLocation.coords;

  return (
    <header className="sticky top-0 z-30 bg-[#F7F3EE]/95 backdrop-blur-md border-b border-[#E7E2DA] transition-all" dir="rtl">
      {/* Main Header Bar - Shown across all panels */}
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Official Brand Identity */}
          <div className="flex items-center gap-2">
            <BoyaLogo variant="header" size="sm" showText={true} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* City & GPS Selector in Customer Mode */}
            {appMode === 'customer' && (
              <button
                onClick={() => setIsLocationModalOpen(true)}
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

            {/* Auth / Login status or User details */}
            {!isAuthenticated ? (
              <button
                onClick={() => openAuthModal()}
                className="text-[11px] font-bold text-[#173B3F] bg-[#D9A2B0]/20 hover:bg-[#D9A2B0]/30 px-3 py-1.5 rounded-full border border-[#D9A2B0]/40 transition-all cursor-pointer"
                title="برای ورود کلیک کنید"
              >
                شما هنوز وارد سامانه نشده اید
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-left">
                  <span className="text-[10px] font-bold text-[#173B3F] block">{user?.fullName}</span>
                  <span className="text-[9px] text-[#6C6C6C] block uppercase">{user?.role?.replace('_', ' ')}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#D9A2B0] flex items-center justify-center text-[#173B3F] font-bold text-xs border border-[#173B3F]/10">
                  {user?.fullName?.charAt(0) || 'ک'}
                </div>
              </div>
            )}

            {/* Viewport Frame Mode Toggle */}
            <button
              onClick={() => setIsMobileFrame(!isMobileFrame)}
              title={isMobileFrame ? 'نمای گسترده مانیتور' : 'نمای استاندارد ۳۹۰ پیکسل'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-[#173B3F] bg-white border border-[#E7E2DA] hover:border-[#173B3F] transition-colors shadow-sm"
            >
              {isMobileFrame ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-[#173B3F]" />
                  <span className="text-[11px] font-medium hidden md:inline">دسکتاپ</span>
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
    </header>
  );
};
