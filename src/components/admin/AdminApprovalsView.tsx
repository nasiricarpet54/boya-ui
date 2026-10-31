import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Building2, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { Salon } from '../../data/marketplaceData';
import { toPersianDigits } from '../../utils/persianUtils';

interface AdminApprovalsViewProps {
  salons: Salon[];
  onApproveTenant: (tenantId: string) => void;
  onRejectTenant: (tenantId: string) => void;
}

export const AdminApprovalsView: React.FC<AdminApprovalsViewProps> = ({
  salons,
  onApproveTenant,
  onRejectTenant,
}) => {
  const pendingTenants = salons.filter((s) => !s.isApproved || s.status === 'pending');
  const approvedTenants = salons.filter((s) => s.isApproved && s.status === 'active');

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-[#EEDCC5] flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#1A2942]">
            کارتابل تایید صلاحیت و مدارک سالن‌ها
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            بررسی مجوز فعالیت، استعلام پروانه کسب و فعال‌سازی ویترین در اپلیکیشن مشتریان
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full font-bold">
            {toPersianDigits(pendingTenants.length)} در صف بررسی
          </span>
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-bold">
            {toPersianDigits(approvedTenants.length)} تایید شده
          </span>
        </div>
      </div>

      {/* Pending Items */}
      {pendingTenants.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#EEDCC5] p-6 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-[#1A2942]">
            تمام پرونده‌ها بررسی شده‌اند
          </h3>
          <p className="text-xs text-[#64748B]">
            در حال حاضر هیچ سالنی در صف تایید مدارک وجود ندارد.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[#1A2942] px-1">
            سالن‌های منتظر تایید:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingTenants.map((t) => (
              <div
                key={t.id}
                className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      ثبت پرونده جدید
                    </span>
                    <h4 className="text-sm font-bold text-[#1A2942] mt-1 font-serif">
                      {t.name}
                    </h4>
                  </div>
                  <span className="text-xs text-[#8290AE]">{t.city}، {t.district}</span>
                </div>

                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#F2EDE5] text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">نام مدیر / متقاضی:</span>
                    <span className="font-bold text-[#1A2942]">{t.ownerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">شماره تماس مدیر:</span>
                    <span className="font-mono text-[#1A2942]">{toPersianDigits(t.ownerPhone)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">آدرس دقیق:</span>
                    <span className="text-[#1A2942] truncate max-w-[200px]">{t.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">خدمات در محل (Mobile):</span>
                    <span className="font-bold text-blue-700">{t.isMobileServiceActive ? 'فعال' : 'غیرفعال'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onRejectTenant(t.id)}
                    className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50"
                  >
                    رد و درخواست مدارک تکمیلی
                  </button>
                  <button
                    onClick={() => onApproveTenant(t.id)}
                    className="px-5 py-2 rounded-xl bg-[#10B981] text-white text-xs font-bold hover:bg-emerald-600 shadow-sm"
                  >
                    تایید رسمی و انتشار در بویا
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Salons Summary */}
      <div className="bg-white p-5 rounded-2xl border border-[#EEDCC5] space-y-3">
        <h3 className="text-xs font-bold text-[#1A2942]">
          سالن‌های تایید شده و فعال در پلتفرم:
        </h3>
        <div className="space-y-2">
          {approvedTenants.map((t) => (
            <div
              key={t.id}
              className="p-3 bg-[#FAF7F2] rounded-xl border border-[#F2EDE5] flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span className="font-bold text-[#1A2942]">{t.name}</span>
                <span className="text-[#8290AE]">({t.city}، {t.district})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#64748B]">
                  {toPersianDigits(t.specialists.length)} متخصص • {toPersianDigits(t.services.length)} خدمت
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                  Approved
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
