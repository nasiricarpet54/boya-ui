import React from 'react';
import { X, CheckCircle2, Star, Calendar, Car, Sparkles, Heart } from 'lucide-react';
import { Specialist, Salon } from '../data/marketplaceData';
import { toPersianDigits } from '../utils/persianUtils';

interface SpecialistPortfolioModalProps {
  specialist: Specialist | null;
  salon: Salon | null;
  isOpen: boolean;
  onClose: () => void;
  onBookWithSpecialist: (specialist: Specialist, salon: Salon) => void;
}

export const SpecialistPortfolioModal: React.FC<SpecialistPortfolioModalProps> = ({
  specialist,
  salon,
  isOpen,
  onClose,
  onBookWithSpecialist,
}) => {
  if (!isOpen || !specialist || !salon) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl border border-[#EEDCC5] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#F2EDE5] flex items-center justify-between bg-white/95 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#E2E8F0] flex items-center justify-center text-[#1A2942] hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-[#1A2942] font-serif">
              پروفایل و پورتفولیو متخصص
            </h3>
          </div>
          {specialist.verified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#D4A574] bg-[#F5F0E8] text-[10px] text-[#10B981] font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>تاییدیه رسمی بویا</span>
            </span>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Specialist Bio Card */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EEDCC5]">
            <img
              src={specialist.avatar}
              alt={specialist.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C59B27] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-[#1A2942]">
                  {specialist.name}
                </h4>
                <div className="flex items-center gap-1 text-[#C59B27]">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-xs font-bold text-[#1A2942]">
                    {toPersianDigits(specialist.rating.toFixed(2))}
                  </span>
                </div>
              </div>
              <p className="text-xs font-medium text-[#775A00] mt-0.5">
                {specialist.role}
              </p>
              <span className="text-[11px] text-[#64748B] block mt-0.5">
                سالن میزبان: {salon.name} ({salon.district})
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-full text-[#1A2942]">
                  {toPersianDigits(specialist.experienceYears)} سال سابقه حرفه‌ای
                </span>
                {specialist.isMobileSpecialist && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <Car className="w-3 h-3" />
                    <span>پذیرش خدمات در محل مشتری</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio text */}
          <div>
            <span className="text-xs font-semibold text-[#1A2942] block mb-1">
              درباره متخصص و تکنیک‌های کاری:
            </span>
            <p className="text-xs text-[#44474D] leading-relaxed text-justify">
              {specialist.bio}
            </p>
          </div>

          {/* Portfolio Gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#1A2942] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
                نمونه‌کارها و ژورنال اختصاصی:
              </span>
              <span className="text-[11px] text-[#64748B]">
                {toPersianDigits(specialist.portfolio.length)} نمونه ثبت شده
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {specialist.portfolio.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-2xl overflow-hidden border border-[#EEDCC5] bg-[#FAF7F2]"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-36 object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-2.5 text-white">
                    <span className="text-[10px] text-amber-200 block">
                      {item.category}
                    </span>
                    <h5 className="text-[11px] font-bold leading-tight truncate">
                      {item.title}
                    </h5>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: Direct Booking CTA */}
        <div className="p-4 bg-white border-t border-[#EEDCC5] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#64748B] block">رزرو بدون واسطه نوبت:</span>
            <span className="text-xs font-bold text-[#1A2942]">{specialist.name}</span>
          </div>

          <button
            onClick={() => {
              onClose();
              onBookWithSpecialist(specialist, salon);
            }}
            className="px-6 py-2.5 rounded-full bg-[#C59B27] hover:bg-[#B8860B] text-[#1A2942] font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Calendar className="w-4 h-4 text-[#1A2942]" />
            <span>انتخاب سانس نوبت</span>
          </button>
        </div>
      </div>
    </div>
  );
};
