import React, { useState, useEffect } from 'react';
import { Crown, Plus, Edit, Trash2, Building2, MapPin, Phone, User, CheckCircle2, X, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../shared/stores/authStore';
import { useDataStore } from '../../../shared/stores/dataStore';
import { useSalons } from '../../../shared/api/queries';
import { useUIStore } from '../../../shared/stores/uiStore';
import { useQueryClient } from '@tanstack/react-query';
import { IRAN_PROVINCES } from '../../../shared/data/iranLocations';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { Salon } from '../../../shared/data/marketplaceData';
import { ImageFileUploader } from '../../../shared/components/ui/ImageFileUploader';

export const AdminTenantsView: React.FC = () => {
  const { user } = useAuthStore();
  const { salons, addSalon, updateSalon, deleteSalon, fetchServerData } = useDataStore();
  const { data: querySalons, isLoading: isLoadingSalons } = useSalons();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  if (user?.role !== 'super_admin') return <div role="alert" className="p-6 text-rose-700">دسترسی فقط برای مدیر کل مجاز است.</div>;

  const [cityFilter, setCityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<Salon | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('تهران');
  const [city, setCity] = useState('تهران');
  const [district, setDistrict] = useState('منطقه ۱');
  const [address, setAddress] = useState('');
  const [isVip, setIsVip] = useState(false);
  const [isMobileServiceActive, setIsMobileServiceActive] = useState(false);
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80');

  useEffect(() => {
    fetchServerData();
  }, [fetchServerData]);

  const activeSalons = (salons && salons.length > 0) ? salons : (querySalons || []);

  const filtered = activeSalons.filter((s) => {
    if (!s) return false;
    const prov = s.province || '';
    const ct = s.city || '';
    if (cityFilter !== 'all' && !prov.includes(cityFilter) && !ct.includes(cityFilter)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchOwner = (s.ownerName || '').toLowerCase().includes(q);
      const matchPhone = (s.phone || '').includes(q);
      if (!matchName && !matchOwner && !matchPhone) return false;
    }
    return true;
  });

  const resetForm = () => {
    setName('');
    setOwnerName('');
    setPhone('');
    setProvince('تهران');
    setCity('تهران');
    setDistrict('منطقه ۱');
    setAddress('');
    setIsVip(false);
    setIsMobileServiceActive(false);
    setCoverImage('https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80');
    setEditingSalon(null);
    setFormError(null);
  };

  const handleOpenEdit = (s: Salon) => {
    setEditingSalon(s);
    setName(s.name || '');
    setOwnerName(s.ownerName || '');
    setPhone(s.phone || '');
    setProvince(s.province || 'تهران');
    setCity(s.city || 'تهران');
    setDistrict(s.district || '');
    setAddress(s.address || '');
    setIsVip(!!s.isVip);
    setIsMobileServiceActive(!!s.isMobileServiceActive);
    setCoverImage(s.coverImage || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('نام سالن الزامی است.');
      return;
    }
    if (!phone.trim()) {
      setFormError('شماره تماس سالن الزامی است.');
      return;
    }
    if (!address.trim()) {
      setFormError('آدرس دقیق سالن الزامی است.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSalon) {
        // Edit existing salon
        await updateSalon(editingSalon.id, {
          name: name.trim(),
          ownerName: ownerName.trim() || 'مدیر سالن',
          phone: phone.trim(),
          province,
          city,
          district: district.trim(),
          address: address.trim(),
          isVip,
          isMobileServiceActive,
          coverImage,
        });
        showToast('تغییرات سالن با موفقیت ذخیره شد.');
      } else {
        // Create new salon
        await addSalon({
          name: name.trim(),
          phone: phone.trim(),
          province,
          city,
          district: district.trim(),
          address: address.trim(),
          isVip,
          isMobileServiceActive,
          coverImage,
        });
        showToast('سالن جدید با موفقیت ایجاد و ذخیره شد.');
      }

      await queryClient.invalidateQueries({ queryKey: ['salons'] });
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Failed to save salon:', err);
      const errMsg = err?.response?.data?.error || err?.message || 'خطا در ثبت اطلاعات سالن. لطفاً ورودی‌ها را بررسی کنید.';
      setFormError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSalon = async (id: string | number, nameStr: string) => {
    if (window.confirm(`آیا از حذف کامل سالن «${nameStr}» اطمینان دارید؟ تمامی نوبت‌ها و اطلاعات آن حذف خواهد شد.`)) {
      try {
        await deleteSalon(id);
        await queryClient.invalidateQueries({ queryKey: ['salons'] });
        showToast(`سالن «${nameStr}» با موفقیت حذف گردید.`);
      } catch (err) {
        console.error('Failed to delete salon:', err);
      }
    }
  };

  const onToggleTenantStatus = async (id: string | number) => {
    const s = activeSalons.find((x) => String(x.id) === String(id));
    if (!s) return;
    try { await updateSalon(id, { isApproved: !s.isApproved }); await queryClient.invalidateQueries({ queryKey: ['salons'] }); showToast('وضعیت سالن ذخیره شد.'); } catch (e: any) { showToast(e?.response?.data?.error || e?.message || 'خطا در تغییر وضعیت سالن.'); }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#E7E2DA] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[#173B3F] font-serif">
            مدیریت کامل سالن‌ها و مجموعه‌های زیبایی (Tenants)
          </h2>
          <p className="text-xs text-[#6C6C6C] mt-0.5">
            ایجاد سالن جدید، ویرایش اطلاعات، تعیین وضعیت VIP، معلق‌سازی یا حذف کامل
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            placeholder="جستجوی سالن یا مدیر..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 px-3 text-xs rounded-xl border border-[#E7E2DA] outline-none focus:border-[#173B3F]"
          />

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="text-xs border border-[#E7E2DA] rounded-xl p-2 bg-[#FAF7F2] font-semibold text-[#173B3F] outline-none"
          >
            <option value="all">همه استان‌ها</option>
            {IRAN_PROVINCES.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#173B3F] hover:bg-[#0F3232] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-[#D9A2B0]" />
            <span>ایجاد سالن جدید</span>
          </button>
        </div>
      </div>

      {/* Salons Table */}
      <div className="bg-white rounded-3xl border border-[#E7E2DA] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] font-bold text-[#173B3F] border-b border-[#E7E2DA]">
              <tr>
                <th className="p-3.5">نام سالن و تصویر</th>
                <th className="p-3.5">مدیر سالن</th>
                <th className="p-3.5">موقعیت و تلفن</th>
                <th className="p-3.5">ویژگی‌ها</th>
                <th className="p-3.5">وضعیت</th>
                <th className="p-3.5 text-center">عملیات ادمین کل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2DA]">
              {isLoadingSalons && activeSalons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#6C6C6C]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#173B3F]" />
                      <span className="text-xs font-bold text-[#173B3F]">در حال دریافت لیست سالن‌ها از سرور...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#6C6C6C]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="w-8 h-8 text-[#173B3F]/30" />
                      <span className="text-xs font-bold text-[#173B3F]">هیچ سالنی مطابق فیلترهای انتخابی یافت نشد.</span>
                      <p className="text-[11px] text-[#6C6C6C]">می‌توانید با دکمه «ایجاد سالن جدید» اولین سالن را ثبت کنید.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[#FAF7F2]/40 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={s.coverImage || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80'}
                        alt={s.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[#E7E2DA]"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[#173B3F]">{s.name}</span>
                          {s.isVip && <Crown className="w-3.5 h-3.5 text-[#C99558]" />}
                        </div>
                        <span className="text-[10px] text-[#6C6C6C] block font-mono">شناسه: {s.tenantId}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5 font-bold text-[#1C1C1C]">
                    {s.ownerName || 'مدیر سالن'}
                  </td>

                  <td className="p-3.5">
                    <span className="block font-semibold text-[#173B3F]">{s.province} - {s.city}</span>
                    <span className="block font-mono text-[11px] text-[#6C6C6C]">{toPersianDigits(s.phone)}</span>
                  </td>

                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {s.isVip && (
                        <span className="bg-[#C99558]/20 text-[#8A5A20] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#C99558]/30">
                          VIP
                        </span>
                      )}
                      {s.isMobileServiceActive && (
                        <span className="bg-[#173B3F]/10 text-[#173B3F] text-[10px] font-bold px-2 py-0.5 rounded-full">
                          خدمات سیار
                        </span>
                      )}
                      {s.isApproved && (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          تایید شده
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        !s.isApproved
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {s.isApproved ? 'منتشرشده' : 'در انتظار تأیید'}
                    </span>
                  </td>

                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedDetails(s)}
                        className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-[#E8F0EF] text-[#173B3F] rounded-lg font-bold text-[11px] border border-[#E7E2DA]"
                      >
                        جزییات
                      </button>

                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 bg-[#EAF2EF] hover:bg-[#173B3F] hover:text-white text-[#173B3F] rounded-lg transition-colors border border-[#6F9A8D]/30"
                        title="ویرایش کامل سالن"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onToggleTenantStatus(s.id)}
                        className={`px-2 py-1 rounded-lg font-bold text-[10px] border transition-colors ${
                          !s.isApproved
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {s.isApproved ? 'لغو انتشار' : 'تأیید و انتشار'}
                      </button>

                      <button
                        onClick={() => handleDeleteSalon(s.id, s.name)}
                        className="p-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg transition-colors border border-red-200"
                        title="حذف کامل سالن"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl border border-[#E7E2DA] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-[#173B3F] text-sm flex items-center gap-2 font-serif">
                <Building2 className="w-4 h-4 text-[#C99558]" />
                <span>{editingSalon ? `ویرایش کامل سالن «${editingSalon.name}»` : 'ایجاد سالن جدید در پلتفرم'}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
                <X className="w-4 h-4 text-[#6C6C6C]" />
              </button>
            </div>

            <form onSubmit={handleSaveSalon} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">نام سالن / مجموعه زیبایی:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: سالن زیبایی رویال"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">نام و نام خانوادگی مدیر سالن:</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="مثال: مریم محمدی"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">شماره همراه تماس سالن:</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    dir="ltr"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] font-mono text-left focus:border-[#173B3F] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">استان:</label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] font-semibold text-[#173B3F] outline-none"
                  >
                    {IRAN_PROVINCES.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">شهر / منطقه:</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="تهران"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">آدرس دقیق سالن:</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="تهران، خیابان ولیعصر..."
                  className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                />
              </div>

              <div>
                <ImageFileUploader
                  label="تصویر کاور سالن (لوکال / دوربین):"
                  subLabel="فشرده‌سازی خودکار به فرمت کم‌حجم WebP بدون افت کیفیت"
                  value={coverImage}
                  onChange={setCoverImage}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVip}
                    onChange={(e) => setIsVip(e.target.checked)}
                    className="accent-[#173B3F] w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-[#173B3F] block">تعیین به عنوان سالن VIP</span>
                    <span className="text-[10px] text-[#6C6C6C]">نمایش در صدر نتایج و نشان برتر</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMobileServiceActive}
                    onChange={(e) => setIsMobileServiceActive(e.target.checked)}
                    className="accent-[#173B3F] w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-[#173B3F] block">فعال بودن خدمات سیار در محل مشتری</span>
                    <span className="text-[10px] text-[#6C6C6C]">اعزام متخصص به آدرس مراجعین</span>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E7E2DA] text-[#6C6C6C]"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#173B3F] hover:bg-[#0F3232] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingSalon ? 'ذخیره تغییرات سالن' : 'افزودن قطعی سالن'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-[#E7E2DA]">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#173B3F]" />
                <h3 className="font-bold text-[#173B3F] text-sm">{selectedDetails.name}</h3>
              </div>
              <button onClick={() => setSelectedDetails(null)} className="p-1 hover:bg-slate-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[#1C1C1C]">
              <div className="flex justify-between py-1 border-b">
                <span className="text-[#6C6C6C]">شناسه مستاجر (Tenant ID):</span>
                <span className="font-mono font-bold text-[#173B3F]">{selectedDetails.tenantId}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-[#6C6C6C]">نام مدیر مجموعه:</span>
                <span className="font-bold">{selectedDetails.ownerName || 'مدیر سالن'}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-[#6C6C6C]">تلفن تماس:</span>
                <span className="font-mono font-bold">{toPersianDigits(selectedDetails.phone)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-[#6C6C6C]">استان و شهر:</span>
                <span className="font-bold">{selectedDetails.province} - {selectedDetails.city}</span>
              </div>
              <div className="py-1 border-b">
                <span className="text-[#6C6C6C] block mb-1">آدرس کامل:</span>
                <span className="font-semibold block">{selectedDetails.address}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-[#6C6C6C]">تعداد خدمات فعال:</span>
                <span className="font-bold">{toPersianDigits(selectedDetails.services?.length || 0)} خدمت</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#6C6C6C]">تعداد متخصصین فعال:</span>
                <span className="font-bold">{toPersianDigits(selectedDetails.specialists?.length || 0)} نفر</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedDetails(null)}
              className="w-full py-2.5 bg-[#173B3F] text-white rounded-xl text-xs font-bold"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
