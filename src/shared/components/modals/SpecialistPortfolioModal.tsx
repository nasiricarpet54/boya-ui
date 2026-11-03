import React, { useState } from 'react';
import { X, CheckCircle2, Star, Calendar, Car, Heart, Layers, ChevronLeft } from 'lucide-react';
import { Specialist, Salon, SalonService, SERVICE_LINES } from '../../data/marketplaceData';
import { toPersianDigits } from '../../utils/persianUtils';
import { SafeHtml } from '../ui/SafeHtml';

interface SpecialistPortfolioModalProps {
  specialist: Specialist | null;
  salon: Salon | null;
  isOpen: boolean;
  onClose: () => void;
  onBookWithSpecialist: (specialist: Specialist, salon: Salon, service?: SalonService) => void;
}

export const SpecialistPortfolioModal: React.FC<SpecialistPortfolioModalProps> = ({
  specialist,
  salon,
  isOpen,
  onClose,
  onBookWithSpecialist,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen || !specialist || !salon) return null;

  const portfolio = specialist.portfolio || [];
  const categories = Array.from(new Set(portfolio.map(p => p.category))).filter(Boolean);

  const filteredPortfolio = selectedCategory === 'all'
    ? portfolio
    : portfolio.filter(p => p.category === selectedCategory);

  const specialtyLineMeta = SERVICE_LINES.find(l => l.id === specialist.specialtyLine);

  // Helper to find service matching portfolio category
  const findMatchingService = (categoryName: string): SalonService | undefined => {
    return salon.services.find(s => 
      s.name.includes(categoryName) || 
      categoryName.includes(s.name) ||
      s.serviceLineId === specialist.specialtyLine
    ) || salon.services[0];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm animate-fadeIn text-right" dir="rtl">
      <div className="relative w-full max-w-xl max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl border border-[#E7E2DA] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#E7E2DA] flex items-center justify-between bg-white/95 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#E8F0EF] border border-[#173B3F]/20 flex items-center justify-center text-[#173B3F] hover:bg-[#173B3F] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-sm font-bold text-[#173B3F] font-serif">
                نمونه‌کارها و سابقه متخصص
              </h3>
              <p className="text-[10.5px] text-[#6C6C6C]">تفکیک نمونه‌کارها بر اساس لاین و نوع خدمت</p>
            </div>
          </div>
          {specialist.verified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#6F9A8D]/40 bg-[#EAF2EF] text-[10px] text-[#2E5E52] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6F9A8D]" />
              <span>تاییدیه رسمی بویا</span>
            </span>
          )}
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {/* Specialist Bio Header Card */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] shadow-xs">
            <img
              src={specialist.avatar || 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=150&q=80'}
              alt={specialist.name}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-[#D9A2B0] shrink-0 shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-base font-extrabold text-[#173B3F] truncate">
                  {specialist.name}
                </h4>
                <div className="flex items-center gap-1 text-[#C99558] shrink-0 bg-white px-2 py-0.5 rounded-full border border-[#E7E2DA]">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-xs font-black text-[#1C1C1C]">
                    {toPersianDigits(Number(specialist?.rating || 5).toFixed(2))}
                  </span>
                </div>
              </div>

              <p className="text-xs font-bold text-[#173B3F] mt-0.5">
                {specialist.role} {specialtyLineMeta ? `(${specialtyLineMeta.name})` : ''}
              </p>

              <span className="text-[11px] text-[#6C6C6C] block mt-0.5">
                سالن میزبان: <strong className="text-[#173B3F]">{salon.name}</strong> ({salon.district})
              </span>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] bg-white border border-[#E7E2DA] px-2.5 py-0.5 rounded-full text-[#1C1C1C] font-semibold">
                  {toPersianDigits(specialist.experienceYears)} سال سابقه تخصصی
                </span>
                {specialist.isMobileSpecialist && (
                  <span className="text-[10px] bg-[#E8F0EF] text-[#173B3F] border border-[#173B3F]/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                    <Car className="w-3 h-3 text-[#D9A2B0]" />
                    <span>پذیرش خدمات در محل</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio text */}
          {specialist.bio && (
            <div className="bg-white p-3 rounded-2xl border border-[#E7E2DA]">
              <span className="text-xs font-bold text-[#173B3F] block mb-1">
                درباره متخصص و سبک کاری:
              </span>
              <SafeHtml 
                html={specialist.bio} 
                className="text-xs text-[#6C6C6C] leading-relaxed text-justify"
                tag="p"
              />
            </div>
          )}

          {/* Portfolio Category Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#173B3F]" />
                نمونه‌کارها بر اساس لاین و خدمت:
              </span>
              <span className="text-[11px] text-[#6C6C6C]">
                {toPersianDigits(filteredPortfolio.length)} اثر ثبت شده
              </span>
            </div>

            {categories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none mb-3">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    selectedCategory === 'all'
                      ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-xs'
                      : 'bg-[#FAF7F2] text-[#6C6C6C] border-[#E7E2DA]'
                  }`}
                >
                  همه ({toPersianDigits(portfolio.length)})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                      selectedCategory === cat
                        ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-xs'
                        : 'bg-[#FAF7F2] text-[#1C1C1C] border-[#E7E2DA]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Portfolio Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredPortfolio.map((item) => {
                const matchedService = findMatchingService(item.category);

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl overflow-hidden border border-[#E7E2DA] bg-white group shadow-xs hover:border-[#173B3F] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-36 w-full overflow-hidden bg-slate-100">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] text-white font-bold flex items-center gap-1 shadow-xs">
                          <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                          <span>{toPersianDigits(item.likesCount)} پسند</span>
                        </div>
                        <div className="absolute top-2 right-2 bg-[#173B3F]/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] text-white font-bold border border-white/20">
                          {item.category}
                        </div>
                      </div>

                      <div className="p-3">
                        <h5 className="text-xs font-extrabold text-[#1C1C1C] leading-snug">
                          {item.title}
                        </h5>
                        {matchedService && (
                          <span className="text-[10.5px] text-[#2E5E52] font-semibold block mt-1">
                            خدمت مرتبط: {matchedService.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Direct CTA on Portfolio Item */}
                    <div className="p-3 pt-0">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onBookWithSpecialist(specialist, salon, matchedService);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-[#EAF2EF] hover:bg-[#173B3F] text-[#173B3F] hover:text-white border border-[#6F9A8D]/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#D9A2B0]" />
                        <span>رزرو این خدمت با {specialist.name}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E7E2DA] bg-white flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#6C6C6C] block">رزرو نوبت مستقیم:</span>
            <span className="text-xs font-bold text-[#173B3F]">{specialist.name}</span>
          </div>

          <button
            onClick={() => {
              onClose();
              onBookWithSpecialist(specialist, salon);
            }}
            className="px-6 py-2.5 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white font-bold text-xs shadow-md shadow-[#173B3F]/20 transition-all flex items-center gap-1.5"
          >
            <span>تعیین وقت نوبت</span>
            <ChevronLeft className="w-4 h-4 text-[#D9A2B0]" />
          </button>
        </div>
      </div>
    </div>
  );
};

