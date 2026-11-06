import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, FileText, Upload, X, Building2, Eye, AlertCircle } from 'lucide-react';
import api from '../../../shared/api/apiClient';
import { useAuthStore } from '../../../shared/stores/authStore';
import { useUIStore } from '../../../shared/stores/uiStore';
import { useDataStore } from '../../../shared/stores/dataStore';
import { useAdminSalons } from '../../../shared/api/queries';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { ImageFileUploader } from '../../../shared/components/ui/ImageFileUploader';
import { Salon, SalonService } from '../../../shared/data/marketplaceData';

export const AdminApprovalsView: React.FC = () => {
  const { salons, updateSalon, updateService } = useDataStore();
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [serviceBusyId, setServiceBusyId] = useState<string | number | null>(null);
  if (user?.role !== 'super_admin') return <div role="alert" className="p-6 text-rose-700">دسترسی فقط برای مدیر کل مجاز است.</div>;
  const { data: querySalons } = useAdminSalons();
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>('');

  const allSalons = (salons && salons.length > 0) ? salons : (querySalons || []);
  const pendingTenants = allSalons.filter((s) => !s.isApproved || s.status === 'pending');
  const approvedTenants = allSalons.filter((s) => s.isApproved);
  const pendingServices = allSalons.flatMap((salon: Salon) => (salon.services || [])
    .filter((service: SalonService) => service.publicationStatus === 'pending')
    .map((service: SalonService) => ({ ...service, salonName: salon.name })));
  const publishService = async (service: SalonService & { salonName: string }) => {
    setServiceBusyId(service.id); setError('');
    try { await updateService(service.id, { publicationStatus: 'active' }); showToast('خدمت پس از بررسی منتشر شد.'); }
    catch (e: any) { setError(e?.response?.data?.error || e?.message || 'خطا در انتشار خدمت.'); }
    finally { setServiceBusyId(null); }
  };

  const onApproveTenant = async (id: string, docUrl?: string) => {
    setBusy(true); setError('');
    try { await updateSalon(id, { isApproved: true, licenseDocUrl: docUrl || undefined }); showToast('پرونده با موفقیت تایید شد.'); setSelectedSalon(null); setDocumentUrl(''); } catch (e: any) { setError(e?.response?.data?.error || e?.message || 'خطا در ثبت تایید.'); } finally { setBusy(false); }
  };

  const onRejectTenant = async (id: string) => {
    setBusy(true); setError(''); try { await updateSalon(id, { isApproved: false }); showToast('درخواست رد شد.'); setSelectedSalon(null); setDocumentUrl(''); } catch (e: any) { setError(e?.response?.data?.error || e?.message || 'خطا در رد درخواست.'); } finally { setBusy(false); }
  };

  // Salon-admin feature: pending specialists awaiting document approval.
  const [pendingSpecialists, setPendingSpecialists] = useState<any[]>([]);
  const [specBusyId, setSpecBusyId] = useState<number | null>(null);
  const loadPendingSpecialists = async () => {
    try {
      const { data } = await api.get('/specialists');
      const all = Array.isArray(data) ? data : [];
      setPendingSpecialists(all.filter((sp: any) => sp.publicationStatus === 'pending'));
    } catch { setPendingSpecialists([]); }
  };

  // Independent/mobile specialist services pending approval (owner-rooted, so
  // they never appear embedded under any salon and need their own fetch).
  const [pendingMyServices, setPendingMyServices] = useState<any[]>([]);
  const loadPendingIndependentServices = async () => {
    try {
      const { data } = await api.get('/services/independent');
      setPendingMyServices(Array.isArray(data) ? data : []);
    } catch { setPendingMyServices([]); }
  };
  React.useEffect(() => { loadPendingSpecialists(); loadPendingIndependentServices(); }, []);
  const onApproveSpecialist = async (id: number) => {
    setSpecBusyId(id); setError('');
    try { await api.patch(`/specialists/${id}/approve`); showToast('متخصص تایید و منتشر شد.'); loadPendingSpecialists(); }
    catch (e: any) { setError(e?.response?.data?.error || e?.message || 'خطا در تایید متخصص.'); }
    finally { setSpecBusyId(null); }
  };
  const onRejectSpecialist = async (id: number) => {
    setSpecBusyId(id); setError('');
    try { await api.patch(`/specialists/${id}/reject`); showToast('درخواست متخصص رد شد.'); loadPendingSpecialists(); }
    catch (e: any) { setError(e?.response?.data?.error || e?.message || 'خطا در رد متخصص.'); }
    finally { setSpecBusyId(null); }
  };

  // `documents` is stored as a JSON string; a malformed value must not crash the panel.
  const parseDocs = (raw: unknown): string[] => {
    if (typeof raw !== 'string') return [];
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string') : []; }
    catch { return []; }
  };

  // Approve an independent specialist's pending service.
  const onApproveIndependentService = async (id: number) => {
    setServiceBusyId(id); setError('');
    try { await api.patch(`/services/${id}/approve`); showToast('خدمت مستقل تایید و منتشر شد.'); loadPendingIndependentServices(); }
    catch (e: any) { setError(e?.response?.data?.error || e?.message || 'خطا در تایید خدمت.'); }
    finally { setServiceBusyId(null); }
  };

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="p-3 bg-rose-50 text-rose-700 rounded-xl">{error}</div>}
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
                    disabled={busy} onClick={() => onRejectTenant(t.id)}
                    className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-bold border border-transparent hover:border-rose-200 transition-all"
                  >
                    رد درخواست
                  </button>

                  <button
                    disabled={busy} onClick={() => onApproveTenant(t.id)}
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

      <section className="bg-white rounded-3xl border border-[#E7E2DA] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#173B3F]">بررسی و انتشار خدمات</h3>
            <p className="text-xs text-[#6C6C6C] mt-1">خدمات تازه پس از ثبت در صف بررسی مدیر کل قرار می‌گیرند.</p>
          </div>
          <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">{toPersianDigits(pendingServices.length)} خدمت در انتظار</span>
        </div>
        {pendingServices.length === 0 ? <p className="text-sm text-[#6C6C6C]">خدمت در انتظار بررسی وجود ندارد.</p> : <div className="space-y-2">
          {pendingServices.map((service) => <div key={service.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-xl p-3">
            <div><strong className="text-sm">{service.name}</strong><div className="text-xs text-[#6C6C6C]">{service.salonName} · {toPersianDigits(service.durationMinutes)} دقیقه · {toPersianDigits(service.price)} تومان</div></div>
            <button disabled={serviceBusyId === service.id} onClick={() => publishService(service)} className="px-3 py-2 rounded-lg bg-[#173B3F] text-white text-xs font-bold disabled:opacity-50">تأیید و انتشار</button>
          </div>)}
        </div>}
      </section>

      {/* Pending specialists — documents awaiting review */}
      <section className="bg-white p-5 rounded-3xl border border-[#E7E2DA] space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#173B3F]">بررسی مدارک متخصصین</h3>
            <p className="text-xs text-[#6C6C6C] mt-1">متخصصینی که مدیر سالن ثبت کرده و منتظر تایید مدارک شما هستند.</p>
          </div>
          <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">{toPersianDigits(pendingSpecialists.length)} متخصص در انتظار</span>
        </div>
        {pendingSpecialists.length === 0 ? <p className="text-sm text-[#6C6C6C]">متخصص در انتظار تایید وجود ندارد.</p> : <div className="space-y-2">
          {pendingSpecialists.map((sp) => {
            const docs: string[] = Array.isArray(sp.documents) ? sp.documents : parseDocs(sp.documents);
            return (
              <div key={sp.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-xl p-3">
                <div className="space-y-1">
                  <strong className="text-sm">متخصص جدید (لاین: {toPersianDigits(sp.specialtyLine || '-')})</strong>
                  <div className="text-xs text-[#6C6C6C]">سالن: {toPersianDigits(sp.salonId)}</div>
                  {docs.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {docs.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-block">
                          <img src={url} alt={`document-${i}`} className="w-14 h-14 rounded-lg object-cover border border-[#E7E2DA] hover:border-[#173B3F]" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button disabled={specBusyId === sp.id} onClick={() => onApproveSpecialist(sp.id)} className="px-3 py-2 rounded-lg bg-[#173B3F] text-white text-xs font-bold disabled:opacity-50">تایید و انتشار</button>
                  <button disabled={specBusyId === sp.id} onClick={() => onRejectSpecialist(sp.id)} className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-bold disabled:opacity-50">رد درخواست</button>
                </div>
              </div>
            );
          })}
        </div>}
      </section>

      {/* Independent specialist services awaiting approval */}
      <section className="bg-white p-5 rounded-3xl border border-[#E7E2DA] space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#173B3F]">خدمات متخصصین مستقل</h3>
            <p className="text-xs text-[#6C6C6C] mt-1">خدماتی که متخصصین مستقل یا سیار ثبت کرده‌اند و منتظر تایید شما هستند.</p>
          </div>
          <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">{toPersianDigits(pendingMyServices.length)} خدمت در انتظار</span>
        </div>
        {pendingMyServices.length === 0 ? <p className="text-sm text-[#6C6C6C]">خدمت مستلط در انتظار تایید وجود ندارد.</p> : <div className="space-y-2">
          {pendingMyServices.map((svc) => (
            <div key={svc.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-xl p-3">
              <div>
                <strong className="text-sm">{svc.name}</strong>
                <div className="text-xs text-[#6C6C6C]">
                  {svc.ownerName || 'متخصص مستقل'}{svc.ownerPhone ? ` · ${toPersianDigits(svc.ownerPhone)}` : ''} · {toPersianDigits(svc.durationMinutes)} دقیقه · {toPersianDigits(Number(svc.price))} تومان
                </div>
              </div>
              <button
                disabled={serviceBusyId === svc.id}
                onClick={() => onApproveIndependentService(svc.id)}
                className="px-3 py-2 rounded-lg bg-[#173B3F] text-white text-xs font-bold disabled:opacity-50"
              >تایید و انتشار</button>
            </div>
          ))}
        </div>}
      </section>

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
                  disabled={busy} onClick={() => onRejectTenant(selectedSalon.id)}
                  className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold"
                >
                  رد پرونده
                </button>

                <button
                  type="button"
                  disabled={busy} onClick={() => onApproveTenant(selectedSalon.id, documentUrl)}
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
