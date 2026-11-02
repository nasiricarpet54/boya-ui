import React, { useState } from 'react';
import { Scissors, Star, CheckCircle2, Car, Plus, Edit, Trash2, Building2, Phone, X, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuthStore } from '../../../shared/stores/authStore';
import { useUIStore } from '../../../shared/stores/uiStore';
import api from '../../../shared/api/apiClient';
import { useDataStore } from '../../../shared/stores/dataStore';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { Specialist, Salon } from '../../../shared/data/marketplaceData';

export const AdminSpecialistsView: React.FC = () => {
  const { salons, updateSpecialist, createSpecialist, deleteSpecialist } = useDataStore();
  const { user } = useAuthStore(); const { showToast } = useUIStore();
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [mobileOnly, setMobileOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'salon_specialist' | 'independent_specialist' | 'mobile_specialist'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSpecialist, setEditingSpecialist] = useState<Specialist | null>(null);
  const [selectedSalonId, setSelectedSalonId] = useState<string>('');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleTitle, setRoleTitle] = useState('میکاپ آرتیست و متخصص زیبایی');
  const [specialistType, setSpecialistType] = useState<'salon_specialist' | 'independent_specialist' | 'mobile_specialist'>('salon_specialist');
  const [specialtyLine, setSpecialtyLine] = useState('hair');
  const [experienceYears, setExperienceYears] = useState(5);
  const [bio, setBio] = useState('متخصص حرفه‌ای زیبایی با سابقه فعالیت در سالن‌های برتر کشور');
  const [isMobileSpecialist, setIsMobileSpecialist] = useState(false);
  const [workingHours, setWorkingHours] = useState('۱۰:۰۰ الی ۱۹:۰۰');
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80');

  // Extract all specialists across all salons
  const allSpecialists: { specialist: Specialist; salon: Salon }[] = [];
  salons.forEach((sal: any) => {
    (sal.specialists || []).forEach((sp: any) => {
      allSpecialists.push({ specialist: sp, salon: sal });
    });
  });

  const filtered = allSpecialists.filter((item) => {
    if (mobileOnly && !item.specialist.isMobileSpecialist) return false;
    if (typeFilter !== 'all') {
      if (typeFilter === 'mobile_specialist' && !item.specialist.isMobileSpecialist) return false;
      if (typeFilter === 'independent_specialist' && item.specialist.specialistType !== 'independent_specialist') return false;
      if (typeFilter === 'salon_specialist' && item.specialist.specialistType === 'independent_specialist') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.specialist.name.toLowerCase().includes(q);
      const matchSalon = item.salon.name.toLowerCase().includes(q);
      const matchPhone = (item.specialist.phone || '').includes(q);
      if (!matchName && !matchSalon && !matchPhone) return false;
    }
    return true;
  });

  const resetForm = () => {
    setName('');
    setPhone('');
    setRoleTitle('میکاپ آرتیست و متخصص زیبایی');
    setSpecialistType('salon_specialist');
    setSpecialtyLine('hair');
    setExperienceYears(5);
    setBio('متخصص حرفه‌ای زیبایی با سابقه فعالیت در سالن‌های برتر کشور');
    setIsMobileSpecialist(false);
    setWorkingHours('۱۰:۰۰ الی ۱۹:۰۰');
    setEditingSpecialist(null);
  };

  const handleOpenEdit = (sp: Specialist, salon: Salon) => {
    setEditingSpecialist(sp);
    setSelectedSalonId(salon.id);
    setName(sp.name);
    setPhone(sp.phone || '');
    setRoleTitle(sp.role);
    setSpecialistType(sp.specialistType || (sp.isMobileSpecialist ? 'mobile_specialist' : 'salon_specialist'));
    setSpecialtyLine(sp.specialtyLine || 'hair');
    setExperienceYears(sp.experienceYears || 5);
    setBio(sp.bio || '');
    setIsMobileSpecialist(sp.isMobileSpecialist);
    setWorkingHours(sp.workingHours || '۱۰:۰۰ الی ۱۹:۰۰');
    setAvatar(sp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80');
    setIsAddModalOpen(true);
  };

  const handleSaveSpecialist = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name.trim() || !phone.trim() || !selectedSalonId) return;
    setBusy(true); setError('');
    try {
      const payload = { specialtyLine, bio: bio.trim(), experienceYears: Number(experienceYears), isMobileActive: isMobileSpecialist || specialistType === 'mobile_specialist', avatarUrl: avatar };
      if (editingSpecialist) {
        await updateSpecialist(editingSpecialist.id, payload);
      } else {
        const { data: users = [] } = await api.get('/users');
        let candidate = users.find((u: any) => String(u.phone) === phone.trim() && String(u.salonId) === String(selectedSalonId) && ['salon_specialist', 'mobile_specialist'].includes(u.role));
        if (!candidate) {
          const role = specialistType === 'mobile_specialist' ? 'mobile_specialist' : 'salon_specialist';
          const { data: createdUser } = await api.post('/users', { fullName: name.trim(), phone: phone.trim(), role, ...(user?.role === 'super_admin' ? { salonId: Number(selectedSalonId) } : {}) });
          candidate = createdUser;
        }
        await createSpecialist({ ...payload, userId: candidate.id, salonId: Number(selectedSalonId) });
      }
      showToast('اطلاعات متخصص با موفقیت در سرور ذخیره شد.'); setIsAddModalOpen(false); resetForm();
    } catch (err: any) { setError(err?.response?.data?.error || err?.message || 'خطا در ذخیره متخصص.'); }
    finally { setBusy(false); }
  };

  const handleDeleteSpecialist = async (spId: string, _salonId: string, spName: string) => {
    if (!window.confirm(`آیا از حذف متخصص «${spName}» اطمینان دارید؟`)) return;
    try { await deleteSpecialist(spId); showToast('متخصص از سرور حذف شد.'); }
    catch (err: any) { setError(err?.response?.data?.error || err?.message || 'خطا در حذف متخصص.'); }
  };

  const onToggleSpecialistVerified = async (id: string) => {
    if (user?.role !== 'super_admin') { setError('تأیید نهایی متخصص فقط توسط مدیر کل انجام می‌شود.'); return; }
    const specialist = allSpecialists.find((item) => String(item.specialist.id) === String(id))?.specialist;
    if (!specialist) return;
    try { await updateSpecialist(id, { isVerified: !specialist.verified, publicationStatus: specialist.verified ? 'pending' : 'active' }); showToast('وضعیت تایید در سرور ذخیره شد.'); }
    catch (err: any) { setError(err?.response?.data?.error || err?.message || 'خطا در تغییر وضعیت تایید.'); }
  };

  if (!['super_admin', 'salon_admin'].includes(user?.role || '')) return <div role="alert" className="p-6 text-rose-700">دسترسی مجاز نیست.</div>;

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="p-3 bg-rose-50 text-rose-700 rounded-xl">{error}</div>}
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#E7E2DA] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[#173B3F] font-serif">
            مدیریت بیوتیشن‌ها، متخصصین سالن و متخصصین مستقل (مدیر لاین)
          </h2>
          <p className="text-xs text-[#6C6C6C] mt-0.5">
            تعریف متخصص جدید، تخصیص به سالن، ویرایش پروانه صلاحیت و مدیریت خدمات سیار
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            placeholder="جستجوی متخصص یا سالن..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 px-3 text-xs rounded-xl border border-[#E7E2DA] outline-none focus:border-[#173B3F]"
          />

          <select
            value={typeFilter}
            onChange={(e: any) => setTypeFilter(e.target.value)}
            className="text-xs border border-[#E7E2DA] rounded-xl p-2 bg-[#FAF7F2] font-semibold text-[#173B3F] outline-none"
          >
            <option value="all">همه دسته‌بندی‌ها</option>
            <option value="salon_specialist">متخصصین شاغل در سالن</option>
            <option value="independent_specialist">متخصصین مستقل (مدیر لاین)</option>
            <option value="mobile_specialist">متخصصین خدمات سیار در محل</option>
          </select>

          <button
            onClick={() => {
              resetForm();
              if (salons.length > 0) setSelectedSalonId(salons[0].id);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#173B3F] hover:bg-[#0F3232] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-[#D9A2B0]" />
            <span>تعریف متخصص جدید</span>
          </button>
        </div>
      </div>

      {/* Specialists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(({ specialist, salon }) => (
          <div
            key={specialist.id}
            className="bg-white rounded-3xl p-5 border border-[#E7E2DA] shadow-xs hover:border-[#173B3F] transition-all space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={specialist.avatar}
                  alt={specialist.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-[#D9A2B0]"
                />
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="text-sm font-bold text-[#173B3F]">{specialist.name}</h3>
                    {specialist.verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2E5E52]" />
                    )}
                  </div>
                  <span className="text-[11px] text-[#6C6C6C] block">{specialist.role}</span>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  specialist.specialistType === 'independent_specialist'
                    ? 'bg-[#C99558]/15 text-[#8A5A20] border-[#C99558]/30'
                    : specialist.isMobileSpecialist
                    ? 'bg-[#173B3F]/10 text-[#173B3F] border-[#173B3F]/20'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {specialist.specialistType === 'independent_specialist'
                  ? 'مدیر لاین / مستقل'
                  : specialist.isMobileSpecialist
                  ? 'خدمات سیار'
                  : 'متخصص سالن'}
              </span>
            </div>

            <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7E2DA] text-xs space-y-1.5 text-[#1C1C1C]">
              <div className="flex justify-between">
                <span className="text-[#6C6C6C]">سالن متبوع:</span>
                <span className="font-bold text-[#173B3F]">{salon.name} ({salon.city})</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#6C6C6C]">شماره همراه:</span>
                <span className="font-mono font-bold">{toPersianDigits(specialist.phone || salon.phone)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#6C6C6C]">سابقه فعالیت:</span>
                <span className="font-bold">{toPersianDigits(specialist.experienceYears || 5)} سال</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#6C6C6C]">ساعات کاری:</span>
                <span className="font-bold">{specialist.workingHours || '۱۰:۰۰ الی ۱۹:۰۰'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-[#E7E2DA] flex items-center justify-between text-xs">
              <button
                disabled={user?.role !== 'super_admin'}
                onClick={() => onToggleSpecialistVerified(specialist.id)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all ${
                  specialist.verified
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                {specialist.verified ? 'پروانه تایید شده' : 'تایید صلاحیت'}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(specialist, salon)}
                  className="p-1.5 bg-[#EAF2EF] hover:bg-[#173B3F] hover:text-white text-[#173B3F] rounded-xl transition-colors border border-[#6F9A8D]/30"
                  title="ویرایش کامل متخصص"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteSpecialist(specialist.id, salon.id, specialist.name)}
                  className="p-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-xl transition-colors border border-red-200"
                  title="حذف کامل متخصص"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-[#E7E2DA] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-[#173B3F] text-sm flex items-center gap-2 font-serif">
                <Scissors className="w-4 h-4 text-[#C99558]" />
                <span>{editingSpecialist ? `ویرایش اطلاعات «${editingSpecialist.name}»` : 'تعریف متخصص / بیوتیشن جدید'}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
                <X className="w-4 h-4 text-[#6C6C6C]" />
              </button>
            </div>

            <form onSubmit={handleSaveSpecialist} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">سالن یا مجموعه متبوع:</label>
                <select
                  value={selectedSalonId}
                  onChange={(e) => setSelectedSalonId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] font-semibold text-[#173B3F] outline-none"
                >
                  {salons.map((sal: any) => (
                    <option key={sal.id} value={sal.id}>
                      {sal.name} ({sal.province} - {sal.city})
                    </option>
                  ))}
                </select>
              </div>

              {error && <div role="alert" className="text-rose-700 bg-rose-50 p-2 rounded">{error}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">نام و نام خانوادگی متخصص:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: سارا راد"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">شماره تلفن همراه:</label>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">نقش و نوع همکاری:</label>
                  <select
                    value={specialistType}
                    onChange={(e: any) => setSpecialistType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] font-semibold text-[#173B3F] outline-none"
                  >
                    <option value="salon_specialist">متخصص شاغل در سالن</option>
                    <option value="independent_specialist">متخصص مستقل (مدیر لاین)</option>
                    <option value="mobile_specialist">متخصص خدمات سیار در محل</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">عنوان تخصصی:</label>
                  <input
                    type="text"
                    required
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="مثال: استاد تخصصی شینیون و رنگ مو"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">سابقه فعالیت (سال):</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] font-mono focus:border-[#173B3F] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">ساعات حضور کاری:</label>
                  <input
                    type="text"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="۱۰:۰۰ الی ۱۹:۰۰"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">بیوگرافی و سوابق کاری:</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="شرح کوتاه از مدارک، تجارب و سبک کاری..."
                  className="w-full p-2.5 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none leading-relaxed"
                />
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMobileSpecialist}
                  onChange={(e) => setIsMobileSpecialist(e.target.checked)}
                  className="accent-[#173B3F] w-4 h-4"
                />
                <div>
                  <span className="font-bold text-[#173B3F] block">مجوز ارائه خدمات سیار در محل آدرس مشتریان</span>
                  <span className="text-[10px] text-[#6C6C6C]">اعزام مستقیم با پشتیبانی سیستم</span>
                </div>
              </label>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E7E2DA] text-[#6C6C6C]"
                >
                  انصراف
                </button>

                <button
                  type="submit" disabled={busy}
                  className="px-6 py-2.5 bg-[#173B3F] hover:bg-[#0F3232] text-white rounded-xl font-bold text-xs shadow-md"
                >
                  {editingSpecialist ? 'ذخیره تغییرات متخصص' : 'افزودن قطعی متخصص'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
