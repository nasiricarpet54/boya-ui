import React, { useEffect, useState } from 'react';
import { X, Lock, Plus, Pencil } from 'lucide-react';
import { SERVICE_LINES } from '../../../shared/data/marketplaceData';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { ImageFileUploader } from '../../../shared/components/ui/ImageFileUploader';

// Same preset photographs the salon dashboard offers, kept local to avoid a
// circular import back into SalonAdminDashboard.
const PRESET_SERVICE_PHOTOS = [
  { id: 'p-hair', label: 'مو و بالیاژ', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-keratin', label: 'کراتین و احیا', url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-facial', label: 'فیشیال پوست', url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-nail', label: 'کاشت ناخن', url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-lash', label: 'اکستنشن مژه', url: 'https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-bridal', label: 'شینیون عروس', url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-spa', label: 'اسپا و ماساژ', url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80' },
];

export interface ServiceFormValue {
  id?: number;
  name: string;
  serviceLineId: string;
  price: number;
  durationMinutes: number;
  isMobileAvailable: boolean;
  imageUrl: string | null;
  specialistIds: number[];
}

interface ServiceFormModalProps {
  isOpen: boolean;
  initial: ServiceFormValue | null;
  busy: boolean;
  error: string;
  // Independent/mobile specialists: line and provider locked to their own.
  lockToOwnLine: boolean;
  ownSpecialistId?: number | null;
  ownLineName?: string;
  // Salon mode: candidate providers filtered by the selected line.
  selectableSpecialists: Array<{ id: number | string; name: string; specialtyLine: string }>;
  onSubmit: (value: ServiceFormValue) => void;
  onClose: () => void;
}

/**
 * Service create/edit form shared by the salon-admin, independent and mobile
 * panels. Covers every required field: line, provider(s), duration and price
 * ("لاین خدمات با متخصص آن لاین") plus edit-in-place of any of them.
 */
export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  isOpen,
  initial,
  busy,
  error,
  lockToOwnLine,
  ownSpecialistId,
  ownLineName,
  selectableSpecialists,
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [serviceLineId, setServiceLineId] = useState('hair');
  const [price, setPrice] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isMobileAvailable, setIsMobileAvailable] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.name ?? '');
    setServiceLineId(initial?.serviceLineId ?? (lockToOwnLine ? String(ownLineName ?? 'hair') : 'hair'));
    setPrice(Number(initial?.price) || 0);
    setDurationMinutes(Number(initial?.durationMinutes) || 60);
    setIsMobileAvailable(Boolean(initial?.isMobileAvailable));
    setImageUrl(initial?.imageUrl ?? null);
    if (lockToOwnLine && ownSpecialistId != null) {
      setPicked([Number(ownSpecialistId)]);
    } else {
      setPicked((initial?.specialistIds ?? []).map(Number));
    }
  }, [isOpen, initial, lockToOwnLine, ownSpecialistId, ownLineName]);

  if (!isOpen) return null;

  const lineOptions = SERVICE_LINES.filter((l) => l.id !== 'all');
  const candidates = (selectableSpecialists || []).filter((s) => s.specialtyLine === serviceLineId);

  const togglePick = (id: number) => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ id: initial?.id, name: name.trim(), serviceLineId, price, durationMinutes, isMobileAvailable, imageUrl, specialistIds: picked });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-lg max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl border border-[#E7E2DA] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#E7E2DA] flex items-center justify-between bg-white/95 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#E8F0EF] border border-[#173B3F]/20 flex items-center justify-center text-[#173B3F] hover:bg-[#173B3F] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-sm font-bold text-[#173B3F] font-serif flex items-center gap-1.5">
                {initial ? <><Pencil className="w-4 h-4" /> ویرایش خدمت</> : <><Plus className="w-4 h-4" /> تعریف خدمت جدید</>}
              </h3>
              <p className="text-[10.5px] text-[#6C6C6C]">لاین خدمات، متخصص ارائه‌دهنده، مدت زمان و هزینه</p>
            </div>
          </div>
        </div>

        <form id="service-form" onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {error && <div role="alert" className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold">{error}</div>}

          {/* لاین خدمات */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#173B3F]">لاین خدمات:</label>
            {lockToOwnLine ? (
              <div className="h-11 px-3 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] text-xs text-[#173B3F] font-bold flex items-center justify-between">
                <span>لاین {lineOptions.find((l) => l.id === serviceLineId)?.name || serviceLineId}</span>
                <Lock className="w-3.5 h-3.5 text-[#6C6C6C]" />
              </div>
            ) : (
              <select
                value={serviceLineId}
                onChange={(e) => { setServiceLineId(e.target.value); setPicked([]); }}
                className="w-full h-11 px-3 rounded-xl border border-[#E7E2DA] text-xs font-semibold focus:border-[#173B3F] outline-none"
              >
                {lineOptions.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* متخصص ارائه‌دهنده */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#173B3F]">
              متخصص ارائه‌دهنده خدمت:{' '}
              <span className="text-[10px] font-normal text-[#6C6C6C]">
                {lockToOwnLine ? '(شما)' : `(فقط متخصصان لاین ${lineOptions.find((l) => l.id === serviceLineId)?.name || serviceLineId})`}
              </span>
            </label>
            {lockToOwnLine ? (
              <div className="h-11 px-3 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] text-xs text-[#173B3F] font-bold flex items-center justify-between">
                <span>ثبت به نام شما</span>
                <Lock className="w-3.5 h-3.5 text-[#6C6C6C]" />
              </div>
            ) : candidates.length === 0 ? (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                هیچ متخصسی برای لاین {lineOptions.find((l) => l.id === serviceLineId)?.name || serviceLineId} ثبت نشده است.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {candidates.map((s) => {
                  const id = Number(s.id);
                  const active = picked.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => togglePick(id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        active ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-xs' : 'bg-[#FAF7F2] text-[#173B3F] border-[#E7E2DA] hover:border-[#173B3F]'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}{s.name}
                    </button>
                  );
                })}
              </div>
            )}
            {picked.length > 0 && (
              <p className="text-[10px] text-[#2E5E52] font-bold">{toPersianDigits(picked.length)} متخصص انتخاب شده</p>
            )}
          </div>

          {/* نام + هزینه + مدت زمان */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-bold text-[#173B3F]">نام خدمت:</label>
              <input
                type="text"
                required
                placeholder="مثال: شینیون خطی ژورنالی"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#173B3F]">هزینه ارائه خدمت (تومان):</label>
              <input
                type="number"
                required
                min={1}
                placeholder="مثال: ۱۸۰۰۰۰۰"
                value={price || ''}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#173B3F]">مدت زمان ارائه (دقیقه):</label>
              <input
                type="number"
                required
                min={1}
                placeholder="مثال: ۶۰"
                value={durationMinutes || ''}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
              />
            </div>
          </div>

          {/* تصویر */}
          <div className="space-y-2">
            <ImageFileUploader
              label="تصویر کاور یا نتیجه خدمت"
              subLabel="بارگذاری عکس از لوکال یا دوربین عکاسی"
              value={imageUrl || ''}
              onChange={(url) => setImageUrl(url)}
              allowCamera={true}
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {PRESET_SERVICE_PHOTOS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setImageUrl(preset.url)}
                  className={`flex items-center gap-1.5 p-1 rounded-xl border text-xs shrink-0 transition-all ${
                    imageUrl === preset.url ? 'border-[#173B3F] bg-[#173B3F]/5 font-bold' : 'border-[#E7E2DA] bg-white'
                  }`}
                >
                  <img src={preset.url} alt={preset.label} className="w-8 h-8 rounded-lg object-cover" />
                  <span className="text-[11px] px-1">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#1C1C1C]">
            <input
              type="checkbox"
              id="svcMobileCheck"
              checked={isMobileAvailable}
              onChange={(e) => setIsMobileAvailable(e.target.checked)}
              className="accent-[#173B3F] w-4 h-4"
            />
            <label htmlFor="svcMobileCheck">قابل ارائه در محل مشتری (Mobile Service)</label>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[#E7E2DA] bg-white flex items-center justify-between gap-2">
          <span className="text-[10px] text-[#6C6C6C]">خدمت بلافاصله پس از ثبت فعال می‌شود.</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#E7E2DA] text-xs font-bold text-[#6C6C6C]"
            >
              انصراف
            </button>
            <button
              type="submit"
              form="service-form"
              disabled={busy}
              className="px-5 py-2 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] disabled:opacity-50"
            >
              {busy ? 'در حال ذخیره…' : initial ? 'ذخیره ویرایش' : 'ثبت و انتشار'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
