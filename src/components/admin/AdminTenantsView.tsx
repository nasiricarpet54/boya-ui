import React, { useState } from 'react';
import { Building2, MapPin, Phone, CheckCircle2, AlertCircle, Ban, Car, Eye, Crown } from 'lucide-react';
import { Salon } from '../../data/marketplaceData';
import { toPersianDigits } from '../../utils/persianUtils';

interface AdminTenantsViewProps {
  salons: Salon[];
  onToggleTenantStatus: (tenantId: string) => void;
}

export const AdminTenantsView: React.FC<AdminTenantsViewProps> = ({
  salons,
  onToggleTenantStatus,
}) => {
  const [cityFilter, setCityFilter] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState<Salon | null>(null);

  const filtered = salons.filter((s) => {
    if (cityFilter !== 'all' && !s.province.includes(cityFilter) && !s.city.includes(cityFilter)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="bg-white p-5 rounded-2xl border border-[#EEDCC5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1A2942]">
            بانک اطلاعاتی سالن‌ها و شعب (Tenants)
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            نظارت بر سالن‌های زیبایی دارای RLS اختصاصی و مدیریت وضعیت فعالیت شعب
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B]">فیلتر استان:</span>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs font-semibold focus:border-[#C59B27] outline-none"
          >
            <option value="all">همه استان‌ها</option>
            <option value="تهران">تهران</option>
            <option value="شیراز">فارس (شیراز)</option>
            <option value="اصفهان">اصفهان</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-[#EEDCC5] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] text-[#1A2942] border-b border-[#EEDCC5] font-bold">
              <tr>
                <th className="p-3.5">نام سالن و شناسه چندمستأجری</th>
                <th className="p-3.5">موقعیت و آدرس</th>
                <th className="p-3.5">مدیر سالن</th>
                <th className="p-3.5">کادر و خدمات</th>
                <th className="p-3.5">خدمات سیار</th>
                <th className="p-3.5">وضعیت</th>
                <th className="p-3.5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EDE5]">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#1A2942] block">{s.name}</span>
                      {s.isVip && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#FECE57] text-[#1A2942] text-[9px] font-black shadow-xs">
                          <Crown className="w-2.5 h-2.5 fill-[#1A2942]" />
                          <span>VIP</span>
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-[#8290AE]">{s.tenantId}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="text-[#1A2942] block">{s.city}، {s.district}</span>
                    <span className="text-[10px] text-[#8290AE] truncate max-w-[160px] block">{s.address}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-medium text-[#1A2942] block">{s.ownerName}</span>
                    <span className="font-mono text-[10px] text-[#8290AE]">{toPersianDigits(s.ownerPhone)}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="text-[#775A00] font-semibold block">
                      {toPersianDigits(s.specialists.length)} متخصص
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      {toPersianDigits(s.services.length)} لاین خدمت
                    </span>
                  </td>
                  <td className="p-3.5">
                    {s.isMobileServiceActive ? (
                      <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        فعال
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">غیرفعال</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        s.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : s.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {s.status === 'active' ? 'تایید شده و فعال' : s.status === 'pending' ? 'در صف تایید' : 'معلق'}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedTenant(s)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#1A2942] text-[11px] font-medium"
                      >
                        جزییات
                      </button>
                      <button
                        onClick={() => onToggleTenantStatus(s.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                          s.status === 'active'
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {s.status === 'active' ? 'تعلیق شعب' : 'فعال‌سازی'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant Detail Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 border border-[#EEDCC5] max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#F2EDE5] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1A2942] font-serif">
                  {selectedTenant.name}
                </h3>
                <span className="text-[11px] font-mono text-[#8290AE]">{selectedTenant.tenantId}</span>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#64748B]"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#EEDCC5] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#64748B]">ساعات کاری:</span>
                <span className="font-semibold text-[#1A2942]">{selectedTenant.workingHours}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">تلفن تماس:</span>
                <span className="font-mono text-[#1A2942]">{toPersianDigits(selectedTenant.phone)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">اینستاگرام رسمی:</span>
                <span className="font-mono text-purple-700">{selectedTenant.instagram}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">امتیاز رضایت:</span>
                <span className="font-bold text-[#C59B27]">{toPersianDigits(selectedTenant.rating.toFixed(2))} ★</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-[#1A2942] block mb-2">
                خدمات ثبتی در این سالن:
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedTenant.services.map((serv) => (
                  <div key={serv.id} className="p-2 bg-slate-50 rounded-xl flex justify-between text-xs">
                    <span>{serv.name}</span>
                    <span className="font-bold text-[#775A00]">{toPersianDigits(serv.price)} تومان</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 text-left">
              <button
                onClick={() => setSelectedTenant(null)}
                className="px-5 py-2 rounded-full bg-[#1A2942] text-white text-xs font-semibold"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
