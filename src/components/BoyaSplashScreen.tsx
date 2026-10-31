import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, ChevronLeft, ArrowLeft } from 'lucide-react';
import { BoyaLogo } from './BoyaLogo';
import { toPersianDigits } from '../utils/persianUtils';

interface BoyaSplashScreenProps {
  isOpen: boolean;
  onFinish: () => void;
  appName?: string;
}

export const BoyaSplashScreen: React.FC<BoyaSplashScreenProps> = ({
  isOpen,
  onFinish,
  appName = 'اپلیکیشن مشتریان بویا',
}) => {
  const [progress, setProgress] = useState<number>(15);
  const [loadingText, setLoadingText] = useState<string>('در حال اتصال امن به سرور و راه‌اندازی...');

  useEffect(() => {
    if (!isOpen) return;

    setProgress(20);
    const t1 = setTimeout(() => {
      setProgress(55);
      setLoadingText('بارگذاری سالن‌های تایید شده و داده‌های مکانی...');
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(85);
      setLoadingText('آماده‌سازی دسترسی‌های رزرواسیون و GPS...');
    }, 850);

    const t3 = setTimeout(() => {
      setProgress(100);
      setLoadingText('ورود به بویا خوش آمدید');
    }, 1250);

    const t4 = setTimeout(() => {
      onFinish();
    }, 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isOpen, onFinish]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F3232] text-white overflow-hidden selection:bg-[#D9A2B0]">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#173B3F] via-[#0B2626] to-[#07191A]" />

      {/* Decorative Ambient Halos */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-[#D9A2B0]/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full bg-[#6F9A8D]/15 blur-3xl animate-pulse [animation-delay:1s]" />

      {/* Central Content */}
      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center text-center space-y-6">
        {/* Animated Brand Logo */}
        <div className="relative">
          {/* Outer Ripple Rings */}
          <div className="absolute -inset-6 rounded-full border border-[#D9A2B0]/20 animate-ping [animation-duration:3s]" />
          <div className="absolute -inset-3 rounded-full border border-white/10 animate-spin [animation-duration:10s] border-dashed" />

          {/* Logo Card with Soft Glow */}
          <div className="p-4 rounded-3xl bg-white shadow-[0_0_50px_rgba(217,162,176,0.25)] border border-white/80 ring-8 ring-white/10">
            <BoyaLogo variant="full" size="lg" showText={false} />
          </div>
        </div>

        {/* Persian & English Brand Identity */}
        <div className="space-y-1.5 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-[#D9A2B0]/40 text-[#D9A2B0] text-[11px] font-bold">
            <Sparkles className="w-3 h-3" />
            <span>پلتفرم جامع خدمات و رزرواسیون زیبایی</span>
          </div>

          <h1 className="text-3xl font-extrabold font-serif text-white tracking-tight">
            بویا <span className="text-xl font-mono text-[#D9A2B0]">BOYA</span>
          </h1>

          <p className="text-xs text-[#E8F0EF]/80 max-w-xs mx-auto leading-relaxed">
            {appName}
          </p>
        </div>

        {/* Progress Bar & Status */}
        <div className="w-full max-w-xs space-y-2 pt-4">
          <div className="flex items-center justify-between text-[11px] text-[#E8F0EF]/80 px-1 font-semibold">
            <span>{loadingText}</span>
            <span>{toPersianDigits(progress)}٪</span>
          </div>

          <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D9A2B0] via-[#6F9A8D] to-[#C99558] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Quick Skip Button */}
        <button
          onClick={onFinish}
          className="pt-4 text-xs text-[#E8F0EF]/60 hover:text-white transition-colors flex items-center gap-1 group font-medium"
        >
          <span>ورود مستقیم به سامانه</span>
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Bottom Version Tag */}
      <div className="absolute bottom-6 text-[10px] text-[#E8F0EF]/40 font-mono tracking-widest uppercase">
        BOYA PLATFORM • V2.4.0 • 2026
      </div>
    </div>
  );
};

/**
 * Reusable animated waiting modal for in-app loading (booking submission, app switching, server calls)
 */
export const BoyaWaitingModal: React.FC<{
  isOpen: boolean;
  title?: string;
  subtitle?: string;
}> = ({ isOpen, title = 'در حال پردازش و ثبت نوبت...', subtitle = 'لطفاً چند لحظه شکیبا باشید' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] rounded-3xl p-6 max-w-xs w-full text-center border border-[#E7E2DA] shadow-2xl space-y-4">
        <BoyaLogo variant="animated" size="md" showText={false} />

        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#173B3F] font-serif">{title}</h3>
          <p className="text-xs text-[#6C6C6C] leading-relaxed">{subtitle}</p>
        </div>

        <div className="w-full h-1.5 rounded-full bg-[#E7E2DA] overflow-hidden">
          <div className="h-full w-2/3 bg-[#173B3F] rounded-full animate-[pulse_1.5s_infinite]" />
        </div>
      </div>
    </div>
  );
};
