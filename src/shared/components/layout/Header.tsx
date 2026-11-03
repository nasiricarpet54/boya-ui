import React from 'react';
import { Smartphone, Monitor, MapPin, Search } from 'lucide-react';
import { BoyaLogo } from '../ui/BoyaLogo';
import { useUIStore } from '../../stores/uiStore';
import { useLocationStore } from '../../stores/locationStore';
import { useAuthStore } from '../../stores/authStore';
import { useModalStore } from '../../stores/modalStore';
import { useNavigate } from '@tanstack/react-router';
import { UserHeader } from './UserHeader';

export const Header: React.FC = () => {
  const { 
    appMode, 
    isMobileFrame, 
    setIsMobileFrame, 
    setIsLocationModalOpen,
  } = useUIStore();
  
  const { selectedCity, selectedProvince, customerLocation } = useLocationStore();
  const { user, isAuthenticated } = useAuthStore();
  const { openAuthModal, openSearchModal } = useModalStore();
  const navigate = useNavigate();

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
            {/* Global Search Button */}
            <button
              onClick={() => openSearchModal()}
              aria-label="جستجوی سریع سالن، خدمت یا متخصص (Ctrl+K)"
              className="flex items-center gap-1.5 sm:gap-2 bg-white border border-[#E7E2DA] hover:border-[#173B3F] px-2.5 sm:px-3 py-1 rounded-full text-xs text-[#173B3F] hover:bg-[#FAF7F2] transition-all shadow-xs group"
              title="جستجوی سریع (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-[#173B3F] group-hover:scale-110 transition-transform" />
              <span className="font-bold text-[11px] text-[#6C6C6C] group-hover:text-[#173B3F] hidden sm:inline">
                جستجو...
              </span>
              <kbd className="hidden lg:inline-flex items-center text-[10px] font-mono px-1 rounded bg-[#FAF7F2] border border-[#E7E2DA] text-[#6C6C6C]">
                ⌘K
              </kbd>
            </button>

            {/* City & GPS Selector in Customer Mode */}
            {appMode === 'customer' && (
              <button
                onClick={() => setIsLocationModalOpen(true)}
                aria-label="تغییر استان، شهرستان یا تعیین موقعیت با GPS"
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

            {/* Reusable UserHeader Component with dropdown menu */}
            <UserHeader />

            {/* Viewport Frame Mode Toggle */}
            <button
              onClick={() => setIsMobileFrame(!isMobileFrame)}
              aria-label={isMobileFrame ? 'نمای گسترده مانیتور' : 'نمای استاندارد ۳۹۰ پیکسل'}
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
