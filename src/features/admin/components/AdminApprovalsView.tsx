import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useDataStore } from '../../../shared/stores/dataStore';
import { toPersianDigits } from '../../../shared/utils/persianUtils';

export const AdminApprovalsView: React.FC = () => {
  const { salons, updateSalon } = useDataStore();
  
  const pendingTenants = salons.filter((s) => !s.isApproved || s.status === 'pending');
  const approvedTenants = salons.filter((s) => s.isApproved && s.status === 'active');

  const onApproveTenant = (id: string) => updateSalon(id, { isApproved: true, status: 'active' });
  const onRejectTenant = (id: string) => updateSalon(id, { isApproved: false, status: 'suspended' });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-[#EEDCC5] flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#1A2942]">تایید صلاحیت و مدارک</h2>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full font-bold">{toPersianDigits(pendingTenants.length)} در صف</span>
          <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full font-bold">{toPersianDigits(approvedTenants.length)} تایید شده</span>
        </div>
      </div>

      {pendingTenants.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border p-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold">تمام پرونده‌ها بررسی شده‌اند</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingTenants.map((t) => (
            <div key={t.id} className="bg-white p-5 rounded-2xl border border-amber-200 space-y-3 shadow-xs">
              <h4 className="text-sm font-bold">{t.name}</h4>
              <div className="text-xs space-y-1">
                <div>مدیر: {t.ownerName}</div>
                <div>آدرس: {t.address}</div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button onClick={() => onRejectTenant(t.id)} className="px-3 py-1 text-rose-600 text-xs font-bold">رد</button>
                <button onClick={() => onApproveTenant(t.id)} className="px-4 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg">تایید</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
