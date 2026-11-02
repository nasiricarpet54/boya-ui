import React from 'react';
import {
  Building2,
  Users,
  CalendarCheck,
  TrendingUp,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useDataStore } from '../../../shared/stores/dataStore';
import { useSalons } from '../../../shared/api/queries';
import { formatPrice, toPersianDigits } from '../../../shared/utils/persianUtils';

interface AdminDashboardViewProps {
  onNavigateToTab: (tab: any) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigateToTab,
}) => {
  const { salons, bookings, users, auditLogs, updateSalon } = useDataStore();
  const { data: querySalons } = useSalons();
  
  const allSalons = (salons && salons.length > 0) ? salons : (querySalons || []);
  const activeTenants = allSalons.filter((s) => s.isApproved);
  const pendingTenants = allSalons.filter((s) => !s.isApproved);
  const totalRevenue = bookings.reduce((sum, b) => (b.status !== 'cancelled' ? sum + b.price : sum), 0);

  const onApproveTenant = (id: string) => updateSalon(id, { isApproved: true, status: 'active' });
  const onRejectTenant = (id: string) => updateSalon(id, { isApproved: false, status: 'suspended' });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#6C6C6C]">
            <span className="text-xs font-semibold text-[#173B3F]">سالن‌ها و شعب فعال</span>
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-serif text-[#173B3F]">{toPersianDigits(activeTenants.length)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#6C6C6C]">
            <span className="text-xs font-semibold text-[#173B3F]">کل کاربران</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-serif text-[#173B3F]">{toPersianDigits(users.length)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#6C6C6C]">
            <span className="text-xs font-semibold text-[#173B3F]">نوبت‌های رزرو شده</span>
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-serif text-[#173B3F]">{toPersianDigits(bookings.length)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#6C6C6C]">
            <span className="text-xs font-semibold text-[#173B3F]">گردش ناخالص (GMV)</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-black font-serif text-[#173B3F]">{formatPrice(totalRevenue)}</span>
          </div>
        </div>
      </div>

      {pendingTenants.length > 0 && (
        <div className="bg-[#FBF4EC] rounded-2xl p-5 border border-[#C99558]/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#C99558]" />
              <h3 className="text-sm font-bold text-[#173B3F]">درخواست‌های جدید ({toPersianDigits(pendingTenants.length)})</h3>
            </div>
            <button onClick={() => onNavigateToTab('approvals')} className="text-xs font-bold text-[#173B3F] hover:underline">مشاهده همه</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingTenants.map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-xl border border-[#E7E2DA] flex flex-col justify-between space-y-2 shadow-xs">
                <div>
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-[#173B3F]">{t.name}</span></div>
                  <p className="text-[10px] text-[#6C6C6C] mt-1">{t.address}</p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E2DA]/60">
                   <button onClick={() => onRejectTenant(t.id)} className="px-3 py-1 rounded-lg border text-[#B35D67] text-xs">رد</button>
                   <button onClick={() => onApproveTenant(t.id)} className="px-4 py-1 rounded-lg bg-[#6F9A8D] text-white text-xs font-bold">تایید</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-4">
          <h3 className="text-sm font-bold border-b pb-2">آخرین نوبت‌ها</h3>
          <div className="space-y-2.5">
            {bookings.slice(0, 5).map((bkg) => (
              <div key={bkg.id} className="p-3 bg-[#FAF7F2] rounded-xl border flex items-center justify-between text-xs">
                <div>
                   <div className="font-bold">{bkg.customerName}</div>
                   <div className="text-[10px]">{bkg.serviceName} در {bkg.salonName}</div>
                </div>
                <div className="text-left">
                  <div className="font-bold">{formatPrice(bkg.price)}</div>
                  <div className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${bkg.status === 'confirmed' ? 'bg-[#EAF2EF] text-[#2E5E52]' : 'bg-gray-100'}`}>{bkg.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-4">
          <div className="flex items-center gap-1.5 border-b pb-2">
            <ShieldCheck className="w-4 h-4 text-[#6F9A8D]" />
            <h3 className="text-sm font-bold">لاگ‌های امنیتی</h3>
          </div>
          <div className="space-y-2.5">
            {auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="p-3 rounded-xl border bg-white text-xs space-y-1">
                <div className="flex justify-between font-mono font-bold text-[10px]"><span>{log.action}</span><span className="font-normal opacity-60">{log.timestamp}</span></div>
                <p className="text-[10px] text-[#6C6C6C]">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
