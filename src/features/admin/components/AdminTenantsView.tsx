import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import { useDataStore } from '../../../shared/stores/dataStore';
import { IRAN_PROVINCES } from '../../../shared/data/iranLocations';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { Salon } from '../../../shared/data/marketplaceData';

export const AdminTenantsView: React.FC = () => {
  const { salons, updateSalon } = useDataStore();
  const [cityFilter, setCityFilter] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState<Salon | null>(null);

  const filtered = salons.filter((s) => {
    if (cityFilter !== 'all' && !s.province.includes(cityFilter) && !s.city.includes(cityFilter)) return false;
    return true;
  });

  const onToggleTenantStatus = (id: string) => {
    const s = salons.find(x => x.id === id);
    if (!s) return;
    updateSalon(id, { status: s.status === 'active' ? 'suspended' : 'active' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-[#EEDCC5] flex justify-between items-center">
        <h2 className="text-base font-bold text-[#1A2942]">مدیریت سالن‌ها (Tenants)</h2>
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="text-xs border rounded-lg p-2">
          <option value="all">همه استان‌ها</option>
          {IRAN_PROVINCES.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden shadow-xs">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#FAF7F2] font-bold">
            <tr>
              <th className="p-3">نام سالن</th>
              <th className="p-3">مدیر</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-[#FAF7F2]/30">
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{s.name}</span>
                    {s.isVip && <Crown className="w-3 h-3 text-[#D4AF37]" />}
                  </div>
                </td>
                <td className="p-3">{s.ownerName}</td>
                <td className="p-3">
                   <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                     {s.status === 'active' ? 'فعال' : 'معلق'}
                   </span>
                </td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => setSelectedTenant(s)} className="text-[#1A2942] font-bold">جزییات</button>
                    <button onClick={() => onToggleTenantStatus(s.id)} className="text-rose-600 font-bold">{s.status === 'active' ? 'تعلیق' : 'فعال'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
             <div className="flex justify-between border-b pb-2"><h3 className="font-bold">{selectedTenant.name}</h3><button onClick={() => setSelectedTenant(null)}>✕</button></div>
             <div className="text-xs space-y-1">
               <div>تلفن: {toPersianDigits(selectedTenant.phone)}</div>
               <div>آدرس: {selectedTenant.address}</div>
             </div>
             <button onClick={() => setSelectedTenant(null)} className="w-full py-2 bg-[#1A2942] text-white rounded-xl text-xs">بستن</button>
          </div>
        </div>
      )}
    </div>
  );
};
