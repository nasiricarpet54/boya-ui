import React from 'react';

export type BeautyActivityId =
  | 'all'
  | 'hair'
  | 'nail'
  | 'eyelash_eyebrow'
  | 'skincare'
  | 'makeup'
  | 'massage_spa'
  | 'mobile_service'
  | string;

interface BeautyActivityIconProps {
  activityId: BeautyActivityId;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'filled' | 'tinted' | 'outline' | 'minimal';
  isActive?: boolean;
  className?: string;
}

export const BeautyActivityIcon: React.FC<BeautyActivityIconProps> = ({
  activityId,
  size = 'md',
  variant = 'tinted',
  isActive = false,
  className = '',
}) => {
  // Dimension tokens
  const dimensions = {
    sm: { container: 'w-8 h-8 rounded-xl', icon: 'w-4 h-4' },
    md: { container: 'w-11 h-11 rounded-2xl', icon: 'w-5 h-5' },
    lg: { container: 'w-14 h-14 rounded-2xl', icon: 'w-7 h-7' },
    xl: { container: 'w-18 h-18 rounded-3xl', icon: 'w-9 h-9' },
  }[size];

  // Activity theme palettes
  const getTheme = () => {
    switch (activityId) {
      case 'hair':
        return {
          title: 'مو و استایلینگ',
          bg: isActive ? 'bg-[#173B3F] text-white shadow-md shadow-[#173B3F]/20' : 'bg-[#E8F0EF] text-[#173B3F] border border-[#173B3F]/15',
          accent: '#D9A2B0',
          fill: '#173B3F',
        };
      case 'nail':
        return {
          title: 'ناخن و اسپا دست',
          bg: isActive ? 'bg-[#D9A2B0] text-[#173B3F] shadow-md shadow-[#D9A2B0]/30' : 'bg-[#F8ECEE] text-[#B35D67] border border-[#D9A2B0]/30',
          accent: '#C99558',
          fill: '#B35D67',
        };
      case 'skincare':
        return {
          title: 'پوست و فیشیال',
          bg: isActive ? 'bg-[#6F9A8D] text-white shadow-md shadow-[#6F9A8D]/25' : 'bg-[#EAF2EF] text-[#2E5E52] border border-[#6F9A8D]/25',
          accent: '#D9A2B0',
          fill: '#2E5E52',
        };
      case 'eyelash_eyebrow':
        return {
          title: 'مژه و ابرو',
          bg: isActive ? 'bg-[#173B3F] text-[#D9A2B0] shadow-md shadow-[#173B3F]/25' : 'bg-[#F2EDE5] text-[#173B3F] border border-[#E7E2DA]',
          accent: '#D9A2B0',
          fill: '#173B3F',
        };
      case 'makeup':
        return {
          title: 'میکاپ و چهره',
          bg: isActive ? 'bg-[#D9A2B0] text-[#1C1C1C] shadow-md shadow-[#D9A2B0]/30' : 'bg-[#F8ECEE] text-[#934354] border border-[#D9A2B0]/30',
          accent: '#C99558',
          fill: '#934354',
        };
      case 'massage_spa':
        return {
          title: 'اسپا و ماساژ',
          bg: isActive ? 'bg-[#5E8B95] text-white shadow-md shadow-[#5E8B95]/25' : 'bg-[#EDF4F5] text-[#24545F] border border-[#5E8B95]/25',
          accent: '#C99558',
          fill: '#24545F',
        };
      case 'mobile_service':
        return {
          title: 'خدمات در محل',
          bg: isActive ? 'bg-[#C99558] text-[#173B3F] shadow-md shadow-[#C99558]/30' : 'bg-[#FBF4EC] text-[#8C5526] border border-[#C99558]/30',
          accent: '#173B3F',
          fill: '#8C5526',
        };
      case 'all':
      default:
        return {
          title: 'همه خدمات',
          bg: isActive ? 'bg-[#173B3F] text-white shadow-md shadow-[#173B3F]/25' : 'bg-white text-[#173B3F] border border-[#E7E2DA]',
          accent: '#C99558',
          fill: '#173B3F',
        };
    }
  };

  const theme = getTheme();

  // Specialized Beauty SVG Artworks
  const renderSvgIcon = () => {
    switch (activityId) {
      case 'hair':
        return (
          // Hair Shears & Fine Hair comb
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={dimensions.icon}>
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" />
            <line x1="14.47" y1="14.48" x2="20" y2="20" />
            <line x1="8.12" y1="8.12" x2="12" y2="12" />
            {/* Sparkle micro-touch */}
            <path d="M19 8l.5 1.5L21 10l-1.5.5L19 12l-.5-1.5L17 10l1.5-.5L19 8z" fill="currentColor" stroke="none" opacity="0.8" />
          </svg>
        );

      case 'nail':
        return (
          // Luxury Nail Polish Bottle with Brush & Diamond Sparkle
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={dimensions.icon}>
            {/* Bottle cap & wand */}
            <rect x="9.5" y="2" width="5" height="5" rx="1.2" />
            <line x1="12" y1="7" x2="12" y2="9.5" />
            {/* Glass body with faceted shoulders */}
            <path d="M7 11c0-1.1.9-1.5 2-1.5h6c1.1 0 2 .4 2 1.5l1 9.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2l1-9.5z" />
            {/* Polish liquid reflection */}
            <path d="M10 14.5c.8-.5 1.8-.5 2.5 0s1.7.5 2.5 0" strokeDasharray="1 1" />
            <path d="M19.5 4l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4.4-1z" fill="currentColor" stroke="none" />
          </svg>
        );

      case 'skincare':
        return (
          // Zen Lotus Petal & Dewdrop
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={dimensions.icon}>
            {/* Central glowing droplet */}
            <path d="M12 2.5c0 0-4.5 5.5-4.5 8.5a4.5 4.5 0 0 0 9 0c0-3-4.5-8.5-4.5-8.5z" />
            {/* Lotus organic side petals */}
            <path d="M4.5 14c1.8 4 5 5.5 7.5 5.5" />
            <path d="M19.5 14c-1.8 4-5 5.5-7.5 5.5" />
            <path d="M3 17.5c2 2.5 5 3.5 9 3.5s7-1 9-3.5" strokeOpacity="0.6" />
            {/* Dew sparkle */}
            <circle cx="12" cy="11.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        );

      case 'eyelash_eyebrow':
        return (
          // Winged Almond Eye & Feathered Lash Art
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={dimensions.icon}>
            {/* Upper sculpted lash line */}
            <path d="M2.5 12.5C5 8 10 5.5 15.5 6.5c3 .5 5 2.5 6 4" strokeWidth="2" />
            {/* Lower soft lid line */}
            <path d="M3.5 12.5C6 16.5 11 18 16 16.5" strokeOpacity="0.7" />
            {/* Iris & pupil beauty highlight */}
            <circle cx="11.5" cy="11.5" r="3.2" />
            <circle cx="12.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
            {/* Individual stylized lashes */}
            <line x1="8" y1="7.5" x2="6.8" y2="4.5" />
            <line x1="12" y1="6.5" x2="12" y2="3.2" />
            <line x1="16" y1="7" x2="17.2" y2="4" />
            <line x1="19.5" y1="9" x2="21.5" y2="7" />
          </svg>
        );

      case 'makeup':
        return (
          // Contour Soft Brush & Compact Shimmer Palette
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={dimensions.icon}>
            {/* Brush handle & ferrule */}
            <path d="M3 21l6.5-6.5" strokeWidth="2" />
            <path d="M8.5 13.5l2 2" />
            {/* Angled brush bristles with soft contour shape */}
            <path d="M10.5 15.5l2.5-2.5c1-1 3.5-2.5 5.5-1.5s2.5 3.5 1.5 5.5l-2.5 2.5-7-4z" />
            {/* Powder dust / glow stars */}
            <circle cx="19" cy="5" r="1" fill="currentColor" stroke="none" />
            <circle cx="21" cy="9" r="0.75" fill="currentColor" stroke="none" />
            <path d="M15 3.5l.3.8.8.3-.8.3-.3.8-.3-.8-.8-.3.8-.3.3-.8z" fill="currentColor" stroke="none" />
          </svg>
        );

      case 'massage_spa':
        return (
          // Balanced Hot Basalt Stones & Candle Flame
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={dimensions.icon}>
            {/* Lower base stone */}
            <ellipse cx="12" cy="19" rx="8" ry="3" />
            {/* Middle stone */}
            <ellipse cx="12" cy="14" rx="6" ry="2.4" />
            {/* Top stone */}
            <ellipse cx="12" cy="9.5" rx="4" ry="1.8" />
            {/* Zen aroma flame/aura on top */}
            <path d="M12 2.5c-.8 1.5-1.5 2.5-1.5 3.5a1.5 1.5 0 0 0 3 0c0-1-.7-2-1.5-3.5z" fill="currentColor" stroke="none" />
            <path d="M19 11c1-1 1-3 0-4s-3 0-3 1.5" strokeDasharray="1 1.5" strokeOpacity="0.8" />
          </svg>
        );

      case 'mobile_service':
        return (
          // Mobile Beauty Concierge / Vanity Travel Case with Route Pin
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={dimensions.icon}>
            {/* Travel Vanity Case Body */}
            <rect x="4" y="8" width="16" height="12" rx="3" />
            {/* Top Handle */}
            <path d="M9 8V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3" />
            {/* Center Lock / clasp */}
            <circle cx="12" cy="13.5" r="1.5" fill="currentColor" stroke="none" />
            <line x1="4" y1="13.5" x2="10.5" y2="13.5" strokeOpacity="0.5" />
            <line x1="13.5" y1="13.5" x2="20" y2="13.5" strokeOpacity="0.5" />
            {/* Quick movement / arrival sparkle */}
            <path d="M21 4.5l.3.8.8.3-.8.3-.3.8-.3-.8-.8-.3.8-.3.3-.8z" fill="currentColor" stroke="none" />
          </svg>
        );

      case 'all':
      default:
        return (
          // Radiant 4-Point Beauty Diamond Star
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={dimensions.icon}>
            <path d="M12 2l2.4 6.8L21 11.2l-6.6 2.4L12 20.4l-2.4-6.8L3 11.2l6.6-2.4L12 2z" />
            <circle cx="12" cy="11.2" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="19.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="4.5" cy="17" r="0.75" fill="currentColor" stroke="none" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center transition-all duration-300 ${dimensions.container} ${theme.bg} ${className}`}
      title={theme.title}
    >
      {renderSvgIcon()}
    </div>
  );
};
