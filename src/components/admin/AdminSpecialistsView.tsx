import React, { useState } from 'react';
import { Scissors, Star, CheckCircle2, Car, Phone, ShieldCheck, Eye } from 'lucide-react';
import { Salon, Specialist } from '../../data/marketplaceData';
import { toPersianDigits } from '../../utils/persianUtils';

interface AdminSpecialistsViewProps {
  salons: Salon[];
  onToggleSpecialistVerified: (specialistId: string) => void;
}

export const AdminSpecialistsView: React.FC<AdminSpecialistsViewProps> = ({
  salons,
  onToggleSpecialistVerified,
}) => {
  const [mobileOnly, setMobileOnly] = useState(false);

  // Flatten specialists with their salon
  const allSpecialists: { specialist: Specialist; salon: Salon }[] = [];
  salons.forEach((sal) => {
    sal.specialists.forEach((sp) => {
      allSpecialists.push({ specialist: sp, salon: sal });
    });
  });

  const filtered = allSpecialists.filter((item) => {
    if (mobileOnly && !item.specialist.isMobileSpecialist) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-[#EEDCC5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1A2942]">
            بانک متخصصین و بیوتیشن‌های پلتفرم بویا
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            نظارت بر صلاحیت حرفه‌ای، اعطای نشان تاییدیه رسمی و مدیریت متخصصین خدمات در محل (Mobile)
          </p>
        </div>

        <button
          onClick={() => setMobileOnly(!mobileOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
            mobileOnly
              ? 'bg-[#1A2942] text-white border-[#1A2942]'
              : 'bg-white text-[#64748B] border-[#E2E8F0]'
          }`}
        >
          <Car className="w-3.5 h-3.5 text-[#C59B27]" />
          <span>فقط متخصصین دارای خدمات سیار ({toPersianDigits(allSpecialists.filter((s) => s.specialist.isMobileSpecialist).length)})</span>
        </button>
      </div>

      {/* Grid of Specialists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(({ specialist: sp, salon: sal }) => (
          <div
            key={sp.id}
            className="bg-white rounded-2xl p-4 border border-[#EEDCC5] shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start gap-3">
                <img
                  src={sp.avatar}
                  alt={sp.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-[#C59B27] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#1A2942] truncate">
                      {sp.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[#C59B27]">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-[11px] font-bold text-[#1A2942]">
                        {toPersianDigits(sp.rating.toFixed(2))}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] text-[#775A00] font-medium block mt-0.5 truncate">
                    {sp.role}
                  </span>

                  <span className="text-[10px] text-[#8290AE] block truncate">
                    سالن: {sal.name} ({sal.district})
                  </span>
                </div>
              </div>

              {/* Badges & Stats */}
              <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-100">
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                  {toPersianDigits(sp.experienceYears)} سال سابقه
                </span>
                {sp.isMobileSpecialist && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Car className="w-3 h-3" />
                    <span>سیار در محل</span>
                  </span>
                )}
                {sp.verified ? (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>دارای تاییدیه بویا</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                    در انتظار بررسی تاییدیه
                  </span>
                )}
              </div>

              {/* Bio summary */}
              <p className="text-[11px] text-[#64748B] line-clamp-2 mt-2 leading-relaxed">
                {sp.bio}
              </p>
            </div>

            {/* Action toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#8290AE]">{toPersianDigits(sp.phone)}</span>
              <button
                onClick={() => onToggleSpecialistVerified(sp.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                  sp.verified
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {sp.verified ? 'لغو نشان تایید' : 'اعطای نشان تاییدیه رسمی'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
