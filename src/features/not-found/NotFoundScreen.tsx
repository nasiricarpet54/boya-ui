import React from 'react';
import { HelpCircle, Home, ArrowRight } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { SEO } from '../../shared/components/SEO';

export const NotFoundScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="صفحه پیدا نشد" 
        description="متاسفیم، صفحه‌ای که به دنبال آن بودید در پلتفرم بویا پیدا نشد." 
      />
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="bg-white p-8 rounded-3xl border border-[#E7E2DA] shadow-lg max-w-md w-full space-y-5">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
            <HelpCircle className="w-10 h-10" />
          </div>
          
          <div>
            <h1 className="text-4xl font-extrabold text-[#173B3F] font-serif mb-1">۴۰۴</h1>
            <h2 className="text-base font-bold text-[#173B3F] font-serif">صفحه مورد نظر پیدا نشد</h2>
            <p className="text-xs text-[#6C6C6C] mt-2 leading-relaxed">
              آدرسی که وارد کرده‌اید وجود ندارد یا منتقل شده است.
            </p>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => navigate({ to: '/' })}
              className="bg-[#173B3F] text-white px-6 py-2.5 rounded-2xl text-xs font-bold hover:bg-[#122e31] transition-all cursor-pointer flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              بازگشت به صفحه اصلی
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
