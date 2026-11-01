import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, FileText, Upload, X, Building2, Eye, AlertCircle } from 'lucide-react';
import { useDataStore } from '../../../shared/stores/dataStore';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { ImageFileUploader } from '../../../shared/components/ui/ImageFileUploader';
import { Salon } from '../../../shared/data/marketplaceData';

export const AdminApprovalsView: React.FC = () => {
  const { salons, updateSalon } = useDataStore();
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>('');

  const pendingTenants = salons.filter((s) => !s.isApproved || s.status === 'pending');
  const approvedTenants = salons.filter((s) => s.isApproved && s.status === 'active');

  const onApproveTenant = (id: string, docUrl?: string) => {
    updateSalon(id, {
      isApproved: true,
      status: 'active',
      licenseDocUrl: docUrl || undefined,
    });
    setSelectedSalon(null);
    setDocumentUrl('');
  };

  const onRejectTenant = (id: string) => {
    updateSalon(id, { isApproved: false, status: 'suspended' });
    setSelectedSalon(null);
    setDocumentUrl('');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#E7E2DA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[#173B3F] font-serif">
            کارتابل تایید صلاحیت، استعلام پروانه کسب و مدارک ثبتی سالن‌ها
          </h2>
          <p className="text-xs text-[#6C6C6C] mt-0.5">
            بررسی استعلامات، آپلود اسناد از لوکال یا دوربین و تایید یا رد درخواست انتشار
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3.5 py-1.5 rounded-full font-bold">
            {toPersianDigits(pendingTenants.length)} پرونده در صف
          </span>
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-full font-bold">
            {toPersianDigits(approvedTenants.length)} سالن فعال
          </span>
        </div>
      </div>

      {pendingTenants.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-[#E7E2DA] p-6 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-[#2E5E52] mx-auto" />
          <h3 className="text-sm font-bold text-[#173B3F]">تمام پرونده‌های ثبتی بررسی شده‌اند</h3>
          <p className="text-xs text-[#6C6C6C]">هیچ پرونده بلاتکلیفی در صف تایید سالن جدید وجود ندارد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingTenants.map((t) => (
            <div
              key={t.id}
              className="bg-white p-5 rounded-3xl border border-[#E7E2DA] hover:border-[#173B3F] transition-all space-y-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#173B3F] text-[#D9A2B0] flex items-center justify-center font-bold">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#173B3F]">{t.name}</h4>
                    <span className="text-[11px] text-[#6C6C6C] block">مدیر: {t.ownerName || 'نامشخص'}</span>
                  </div>
                </div>

                <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200">
                  در انتظار استعلام
                </span>
              </div>

              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7E2DA] text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6C6C6C]">موقعیت سالن:</span>
                  <span className="font-bold text-[#173B3F]">{t.province} - {t.city}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#6C6C6C]">تلفن تماس:</span>
                  <span className="font-mono font-bold">{toPersianDigits(t.phone)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#6C6C6C]">آدرس:</span>
                  <span className="font-semibold truncate max-w-[200px]">{t.address}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#E7E2DA] text-xs">
                <button
                  onClick={() => {
                    setSelectedSalon(t);
                    setDocumentUrl(t.licenseDocUrl || '');
                  }}
                  className="flex items-center gap-1 text-[#173B3F] font-bold hover:underline"
                >
                  <FileText className="w-3.5 h-3.5 text-[#C99558]" />
                  <span>بررسی مدارک و پروانه</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRejectTenant(t.id)}
                    className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-bold border border-transparent hover:border-rose-200 transition-all"
                  >
                    رد درخواست
                  </button>

                  <button
                    onClick={() => onApproveTenant(t.id)}
                    className="px-4 py-1.5 bg-[#173B3F] hover:bg-[#0F3232] text-white rounded-xl font-bold shadow-xs transition-all"
                  >
                    تایید و انتشار
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Examine & Upload License Modal */}
      {selectedSalon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-[#E7E2DA] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2E5E52]" />
                <h3 className="font-bold text-[#173B3F] text-sm">
                  بررسی مدارک ثبتی «{selectedSalon.name}»
                </h3>
              </div>
              <button onClick={() => setSelectedSalon(null)} className="p-1 hover:bg-slate-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#1C1C1C]">
              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7E2DA] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6C6C6C]">مدیر سالن:</span>
                  <span className="font-bold">{selectedSalon.ownerName || 'نامشخص'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C6C6C]">شماره تماس:</span>
                  <span className="font-mono font-bold">{toPersianDigits(selectedSalon.phone)}</span>
                </div>
              </div>

              {/* Document Upload component */}
              <ImageFileUploader
                label="بارگذاری یا استعلام تصویر پروانه کسب / کارت ملی (از لوکال / دوربین):"
                subLabel="پشتیبانی از اسناد تصویری و PDF با فشرده‌سازی خودکار سرور"
                value={documentUrl}
                onChange={setDocumentUrl}
                isDocument={true}
              />

              <div className="pt-3 flex items-center justify-between border-t border-[#E7E2DA]">
                <button
                  type="button"
                  onClick={() => onRejectTenant(selectedSalon.id)}
                  className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold"
                >
                  رد پرونده
                </button>

                <button
                  type="button"
                  onClick={() => onApproveTenant(selectedSalon.id, documentUrl)}
                  className="px-6 py-2.5 bg-[#173B3F] text-white hover:bg-[#0F3232] rounded-xl font-bold shadow-md"
                >
                  تایید نهایی و ثبت پروانه
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
