import React, { useState } from 'react';
import { Crown, Pin } from 'lucide-react';
import { useDataStore } from '../../../shared/stores/dataStore';
import { useSalons } from '../../../shared/api/queries';
import { IRAN_PROVINCES } from '../../../shared/data/iranLocations';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { sortSalonsForSearchResults } from '../../../shared/utils/salonRanking';

export const AdminSearchRankingView: React.FC = () => {
  const { salons, updateSalon } = useDataStore();
  const { data: querySalons } = useSalons();
  const [cityFilter, setCityFilter] = useState<string>('all');
  
  const allSalons = (salons && salons.length > 0) ? salons : (querySalons || []);
  const sortedSalons = sortSalonsForSearchResults(allSalons);
  const filteredSalons = sortedSalons.filter(s => {
    if (!s) return false;
    if (cityFilter === 'all') return true;
    const prov = s.province || '';
    const ct = s.city || '';
    return prov.includes(cityFilter) || ct.includes(cityFilter);
  });

  const onUpdateSalonPriority = (id: string, updates: any) => updateSalon(id, updates);

  const handleToggleVip = (salon: any) => {
    const nextVip = !salon.isVip;
    onUpdateSalonPriority(salon.id, { isVip: nextVip, displayPriority: nextVip ? 1 : 99 });
  };

  const handlePinToTop = (id: string) => {
    onUpdateSalonPriority(id, { isVip: true, displayPriority: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border flex justify-between items-center">
        <h2 className="text-base font-bold text-[#173B3F]">مدیریت رتبه‌بندی و VIP</h2>
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="text-xs border rounded-lg p-2">
          <option value="all">همه استان‌ها</option>
          {IRAN_PROVINCES.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden shadow-xs">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#FAF7F2] font-bold">
            <tr>
              <th className="p-3">رتبه</th>
              <th className="p-3">نام سالن</th>
              <th className="p-3">وضعیت VIP</th>
              <th className="p-3 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredSalons.map((salon, index) => (
              <tr key={salon.id} className={salon.isVip ? 'bg-amber-50/30' : ''}>
                <td className="p-3 font-bold text-center">{toPersianDigits(index + 1)}</td>
                <td className="p-3">
                  <div className="font-bold">{salon.name}</div>
                  <div className="text-[10px] opacity-60">{salon.city}</div>
                </td>
                <td className="p-3">
                  <button onClick={() => handleToggleVip(salon)} className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${salon.isVip ? 'bg-amber-100 text-amber-800' : 'bg-gray-100'}`}>
                    <Crown className="w-3 h-3" /> {salon.isVip ? 'VIP' : 'عادی'}
                  </button>
                </td>
                <td className="p-3 text-center">
                   <button onClick={() => handlePinToTop(salon.id)} className="text-[#173B3F] font-bold flex items-center gap-1 mx-auto"><Pin className="w-3 h-3" /> پین در صدر</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
