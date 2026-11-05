import React from 'react';

export const BOYA_LOGO_URL = '/assets/boya-logo.png';

export type BoyaLogoVariant = 'full' | 'symbol' | 'header' | 'badge' | 'animated';
export type BoyaLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';

interface BoyaLogoProps {
  variant?: BoyaLogoVariant;
  size?: BoyaLogoSize;
  className?: string;
  showText?: boolean;
  animate?: boolean;
  inverted?: boolean;
}

const SIZE_MAP: Record<BoyaLogoSize, { img: string; container: string }> = {
  xs: { img: 'h-6 w-auto', container: 'w-6 h-6' },
  sm: { img: 'h-8 w-auto', container: 'w-8 h-8' },
  md: { img: 'h-10 w-auto', container: 'w-10 h-10' },
  lg: { img: 'h-14 w-auto', container: 'w-14 h-14' },
  xl: { img: 'h-20 w-auto', container: 'w-20 h-20' },
  hero: { img: 'h-28 sm:h-36 w-auto', container: 'w-28 sm:w-36 h-28 sm:h-36' },
};

export const BoyaLogo: React.FC<BoyaLogoProps> = ({
  variant = 'header',
  size = 'md',
  className = '',
  showText = true,
  animate = false,
  inverted = false,
}) => {
  const currentSize = SIZE_MAP[size];

  // 1. Animated Loader / Waiting Time Variant
  if (variant === 'animated' || animate) {
    return (
      <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
        {/* Ambient Pulsating Glow Halos */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#173B3F]/20 via-[#D9A2B0]/25 to-[#6F9A8D]/20 blur-xl animate-pulse scale-125" />
        <div className="absolute -inset-2 rounded-full border border-[#D9A2B0]/30 animate-spin [animation-duration:8s] border-dashed" />
        <div className="absolute -inset-5 rounded-full border border-[#173B3F]/15 animate-ping [animation-duration:3s]" />

        {/* Core Logo Container */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative p-3 rounded-3xl bg-white/95 backdrop-blur-md shadow-2xl border border-white/60 ring-4 ring-[#173B3F]/5">
            <img
              src={BOYA_LOGO_URL}
              alt="لوگوی رسمی بویا BOYA"
              className={`${currentSize.img} object-contain transition-transform duration-700 animate-pulse`}
            />
          </div>

          {showText && (
            <div className="mt-4 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#173B3F] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9A2B0] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#6F9A8D] animate-bounce" />
              </div>
              <span className="text-xs font-bold text-[#173B3F] tracking-wide block font-serif">
                پلتفرم جامع بویا
              </span>
              <span className="text-[10px] tracking-widest text-[#6C6C6C] uppercase font-mono block">
                B Ö Y Λ
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Full Complete Logo (Image with typography)
  if (variant === 'full') {
    return (
      <div className={`inline-flex flex-col items-center justify-center select-none ${className}`}>
        <img
          src={BOYA_LOGO_URL}
          alt="لوگوی بویا BOYA"
          className={`${currentSize.img} object-contain drop-shadow-sm`}
        />
      </div>
    );
  }

  // 3. Emblem / Symbol only (Crop to top B-infinity ribbon emblem)
  if (variant === 'symbol') {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-2xl overflow-hidden bg-white/95 shadow-sm border border-[#E7E2DA] select-none p-1 shrink-0 ${currentSize.container} ${className}`}
      >
        <img
          src={BOYA_LOGO_URL}
          alt="نشان بویا"
          className="w-full h-full object-contain object-top scale-110"
        />
      </div>
    );
  }

  // 4. Luxury Badge (For cards, modal headers, watermarks)
  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[#E7E2DA] shadow-xs select-none ${className}`}
      >
        <div className="w-6 h-6 rounded-lg bg-white overflow-hidden p-0.5 border border-[#173B3F]/10 shrink-0">
          <img src={BOYA_LOGO_URL} alt="BOYA" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-baseline gap-1 text-right">
          <span className="font-serif font-black text-xs text-[#173B3F]">بویا</span>
          <span className="text-[9px] font-mono tracking-widest text-[#6F9A8D] font-bold">BOYA</span>
        </div>
      </div>
    );
  }

  // 5. Default Header Variant (Emblem box + crisp Typography)
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white p-1 border border-[#E7E2DA] shadow-sm flex items-center justify-center shrink-0 hover:shadow-md transition-shadow">
        <img
          src={BOYA_LOGO_URL}
          alt="لوگوی بویا"
          className="w-full h-full object-contain"
        />
      </div>

      {showText && (
        <div className="text-right">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-lg sm:text-xl font-bold tracking-tight font-serif ${
                inverted ? 'text-white' : 'text-[#173B3F]'
              }`}
            >
              بویا
            </span>
            <span
              className={`text-[10px] tracking-widest font-black uppercase font-mono ${
                inverted ? 'text-[#D9A2B0]' : 'text-[#6F9A8D]'
              }`}
            >
              BOYA
            </span>
          </div>
          <p
            className={`text-[9.5px] -mt-1 hidden xs:block font-medium ${
              inverted ? 'text-[#E8F0EF]/80' : 'text-[#6C6C6C]'
            }`}
          >
            پلتفرم خدمات و رزرواسیون زیبایی
          </p>
        </div>
      )}
    </div>
  );
};
