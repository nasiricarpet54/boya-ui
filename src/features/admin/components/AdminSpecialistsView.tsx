import React, { useState } from 'react';
import { Star, CheckCircle2, Car } from 'lucide-react';
import { useDataStore } from '../../../shared/stores/dataStore';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { Specialist, Salon } from '../../../shared/data/marketplaceData';

export const AdminSpecialistsView: React.FC = () => {
  const { salons, setSalons } = useDataStore();
  const [mobileOnly, setMobileOnly] = useState(false);

  const allSpecialists: { specialist: Specialist; salon: Salon }[] = [];
  salons.forEach((sal: any) => {
    sal.specialists.forEach((sp: any) => {
      allSpecialists.push({ specialist: sp, salon: sal });
    });
  });

  const filtered = allSpecialists.filter(item => !mobileOnly || item.specialist.isMobileSpecialist);

  const onToggleSpecialistVerified = (id: string) => {
    setSalons(salons.map((sal: any) => ({
      ...sal,
      specialists: sal.specialists.map((sp: any) => sp.id === id ? { ...sp, verified: !sp.verified } : sp)
    })));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border flex justify-between items-center">
        <h2 className="text-base font-bold text-[#1A2942]">مدیریت متخصصین</h2>
        <button onClick={() => setMobileOnly(!mobileOnly)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${mobileOnly ? 'bg-[#1A2942] text-white' : 'bg-white text-[#64748B]'}`}>
          <Car className="w-3.5 h-3.5" />
          <span>فقط سیار ({toPersianDigits(allSpecialists.filter(s => s.specialist.isMobileSpecialist).length)})</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(({ specialist: sp, salon: sal }) => (
          <div key={sp.id} className="bg-white rounded-2xl p-4 border space-y-3 shadow-xs">
            <div className="flex gap-3">
              <img src={sp.avatar} className="w-12 h-12 rounded-xl object-cover" />
              <div className="min-w-0">
                <div className="flex items-center justify-between"><h3 className="text-xs font-bold truncate">{sp.name}</h3><div className="flex items-center gap-1 text-[#C59B27]"><Star className="w-3 h-3 fill-current" /><span className="text-[10px]">{toPersianDigits(sp.rating.toFixed(1))}</span></div></div>
                <div className="text-[10px] text-[#775A00]">{sp.role}</div>
                <div className="text-[9px] opacity-60">سالن: {sal.name}</div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
               <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${sp.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{sp.verified ? 'تایید شده' : 'در انتظار'}</span>
               <button onClick={() => onToggleSpecialistVerified(sp.id)} className="text-[10px] font-bold text-[#1A2942] underline">{sp.verified ? 'لغو تایید' : 'تایید متخصص'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
