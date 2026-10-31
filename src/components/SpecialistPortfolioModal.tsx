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
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl border border-[#E7E2DA] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#E7E2DA] flex items-center justify-between bg-white/95 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#E8F0EF] border border-[#173B3F]/20 flex items-center justify-center text-[#173B3F] hover:bg-[#173B3F] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-[#173B3F] font-serif">
              پروفایل و پورتفولیو متخصص
            </h3>
          </div>
          {specialist.verified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#6F9A8D]/40 bg-[#EAF2EF] text-[10px] text-[#2E5E52] font-bold">
              <CheckCircle2 className="w-3 h-3 text-[#6F9A8D]" />
              <span>تاییدیه رسمی بویا</span>
            </span>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Specialist Bio Card */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA]">
            <img
              src={specialist.avatar}
              alt={specialist.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D9A2B0] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-[#173B3F]">
                  {specialist.name}
                </h4>
                <div className="flex items-center gap-1 text-[#C99558]">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-xs font-bold text-[#1C1C1C]">
                    {toPersianDigits(specialist.rating.toFixed(2))}
                  </span>
                </div>
              </div>
              <p className="text-xs font-bold text-[#173B3F] mt-0.5">
                {specialist.role}
              </p>
              <span className="text-[11px] text-[#6C6C6C] block mt-0.5">
                سالن میزبان: {salon.name} ({salon.district})
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] bg-white border border-[#E7E2DA] px-2 py-0.5 rounded-full text-[#1C1C1C]">
                  {toPersianDigits(specialist.experienceYears)} سال سابقه حرفه‌ای
                </span>
                {specialist.isMobileSpecialist && (
                  <span className="text-[10px] bg-[#E8F0EF] text-[#173B3F] border border-[#173B3F]/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                    <Car className="w-3 h-3" />
                    <span>پذیرش خدمات در محل مشتری</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio text */}
          <div>
            <span className="text-xs font-bold text-[#173B3F] block mb-1">
              درباره متخصص و تکنیک‌های کاری:
            </span>
            <p className="text-xs text-[#1C1C1C] leading-relaxed text-justify">
              {specialist.bio}
            </p>
          </div>

          {/* Portfolio Gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#173B3F]">
                گالری آثار و نمونه‌کارها ({toPersianDigits(specialist.portfolio.length)} نمونه):
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {specialist.portfolio.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl overflow-hidden border border-[#E7E2DA] bg-white group shadow-xs"
                >
                  <div className="relative h-32 w-full overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-white flex items-center gap-1">
                      <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                      <span>{toPersianDigits(item.likesCount)}</span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <h5 className="text-xs font-bold text-[#1C1C1C] truncate">
                      {item.title}
                    </h5>
                    <span className="text-[10px] text-[#6C6C6C] block mt-0.5">
                      لاین: {item.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-[#E7E2DA] bg-white flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#6C6C6C] block">رزرو اختصاصی با این متخصص:</span>
            <span className="text-xs font-bold text-[#173B3F]">{specialist.name}</span>
          </div>

          <button
            onClick={() => onBookWithSpecialist(specialist, salon)}
            className="px-6 py-2.5 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white font-bold text-xs shadow-md shadow-[#173B3F]/20 transition-all flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4 text-[#D9A2B0]" />
            <span>رزرو نوبت مستقیم</span>
          </button>
        </div>
      </div>
    </div>
  );
};
