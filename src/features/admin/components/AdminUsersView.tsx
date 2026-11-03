import React, { useState } from 'react';
import { Users, Plus, Edit, Trash2, Phone, Mail, Shield, ShieldCheck, CheckCircle2, X, Building2, User } from 'lucide-react';
import { useDataStore } from '../../../shared/stores/dataStore';
import { toPersianDigits, normalizePhone } from '../../../shared/utils/persianUtils';
import { PlatformUser } from '../../../shared/data/marketplaceData';
import { ROLE_LABELS, ROLES, UserRole } from '../../../shared/constants/roles';

export const AdminUsersView: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, salons } = useDataStore();
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(ROLES.CUSTOMER);
  const [selectedSalonId, setSelectedSalonId] = useState<string>('');

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (u.name || u.fullName || '').toLowerCase().includes(q);
      const matchPhone = (u.phone || '').includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchEmail) return false;
    }
    return true;
  });

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setRole(ROLES.CUSTOMER);
    setSelectedSalonId('');
    setEditingUser(null);
  };

  const handleOpenEdit = (u: PlatformUser) => {
    setEditingUser(u);
    setFullName(u.fullName || u.name || '');
    setPhone(u.phone || '');
    setEmail(u.email || '');
    setRole((u.role as UserRole) || ROLES.CUSTOMER);
    setSelectedSalonId(u.salonId || '');
    setIsModalOpen(true);
  };

  const [formError, setFormError] = useState<string | null>(null);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;
    setFormError(null);

    const cleanPhone = normalizePhone(phone.trim());

    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          fullName: fullName.trim(),
          phone: cleanPhone,
          email: email.trim() || `${cleanPhone}@boya.ir`,
          role,
          salonId: selectedSalonId || undefined,
        });
      } else {
        await addUser({
          fullName: fullName.trim(),
          phone: cleanPhone,
          email: email.trim() || `${cleanPhone}@boya.ir`,
          role: role as any,
          salonId: selectedSalonId || undefined,
        });
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Error saving user:', err);
      const errMsg = err?.response?.data?.error || err?.message || 'خطا در افزودن یا به‌روزرسانی کاربر.';
      setFormError(errMsg);
    }
  };

  const handleDeleteUser = (id: string | number, nameStr: string) => {
    if (window.confirm(`آیا از حذف کامل حساب کاربر «${nameStr}» اطمینان دارید؟`)) {
      deleteUser(id);
    }
  };

  const onToggleUserStatus = (id: string | number) => {
    const u = users.find((x) => String(x.id) === String(id));
    if (!u) return;
    updateUser(id, { status: u.status === 'active' ? 'suspended' : 'active' });
  };

  const getRoleBadge = (uRole: string) => {
    const label = ROLE_LABELS[uRole as UserRole] || 'مشتری';
    switch (uRole) {
      case ROLES.SUPER_ADMIN:
        return { label, color: 'bg-[#173B3F] text-white border-[#173B3F]' };
      case ROLES.SALON_ADMIN:
        return { label, color: 'bg-[#C99558]/20 text-[#8A5A20] border-[#C99558]/40' };
      case ROLES.LINE_MANAGER:
        return { label, color: 'bg-[#D9A2B0]/30 text-[#173B3F] border-[#D9A2B0]/50' };
      case ROLES.SALON_SPECIALIST:
        return { label, color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case ROLES.MOBILE_SPECIALIST:
        return { label, color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#E7E2DA] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[#173B3F] font-serif">
            مدیریت کامل کاربران، مشتریان و سطوح دسترسی
          </h2>
          <p className="text-xs text-[#6C6C6C] mt-0.5">
            ایجاد کاربر جدید، ویرایش اطلاعات، تعیین نقش‌های سازمانی و تعلیق یا حذف حساب‌ها
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            placeholder="جستجوی نام، تلفن یا ایمیل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 px-3 text-xs rounded-xl border border-[#E7E2DA] outline-none focus:border-[#173B3F]"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs border border-[#E7E2DA] rounded-xl p-2 bg-[#FAF7F2] font-semibold text-[#173B3F] outline-none"
          >
            <option value="all">همه نقش‌ها</option>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#173B3F] hover:bg-[#0F3232] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-[#D9A2B0]" />
            <span>تعریف کاربر جدید</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-[#E7E2DA] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] font-bold text-[#173B3F] border-b border-[#E7E2DA]">
              <tr>
                <th className="p-3.5">نام و نام خانوادگی</th>
                <th className="p-3.5">شماره همراه و ایمیل</th>
                <th className="p-3.5">نقش سازمانی</th>
                <th className="p-3.5">تاریخ عضویت</th>
                <th className="p-3.5">وضعیت</th>
                <th className="p-3.5 text-center">عملیات ادمین کل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2DA]">
              {filtered.map((u) => {
                const roleInfo = getRoleBadge(u.role);
                return (
                  <tr key={u.id} className="hover:bg-[#FAF7F2]/40 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#173B3F] text-[#D9A2B0] flex items-center justify-center font-bold text-xs border border-[#D9A2B0]/30">
                          {(u.fullName || u.name || 'ک').charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-[#173B3F] block">{u.fullName || u.name}</span>
                          {u.salonId && (
                            <span className="text-[10px] text-[#6C6C6C] block">
                              سالن: {salons.find((s: any) => s.id === u.salonId)?.name || u.salonId}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono">
                      <span className="font-bold block text-[#1C1C1C]">
                        {u.phone ? toPersianDigits(u.phone) : <span className="text-[#B35D67] text-[10px]">شماره مخفی شده</span>}
                      </span>
                      <span className="text-[10px] text-[#6C6C6C] block">
                        {u.email || (u.phone ? 'ایمیل ثبت نشده' : <span className="text-[#B35D67]">ایمیل مخفی شده</span>)}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </td>

                    <td className="p-3.5 text-[#6C6C6C]">
                      {u.createdAt || 'امروز'}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          u.status === 'suspended'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {u.status === 'suspended' ? 'معلق‌شده' : 'فعال'}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 bg-[#EAF2EF] hover:bg-[#173B3F] hover:text-white text-[#173B3F] rounded-lg transition-colors border border-[#6F9A8D]/30"
                          title="ویرایش اطلاعات کاربر"
                          aria-label="ویرایش اطلاعات کاربر"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onToggleUserStatus(u.id)}
                          className={`px-2 py-1 rounded-lg font-bold text-[10px] border transition-colors ${
                            u.status === 'suspended'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {u.status === 'suspended' ? 'فعال‌سازی' : 'تعلیق'}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u.id, u.fullName || u.name)}
                          className="p-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg transition-colors border border-red-200"
                          title="حذف کامل کاربر"
                          aria-label="حذف کامل کاربر"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-[#E7E2DA] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-[#173B3F] text-sm flex items-center gap-2 font-serif">
                <User className="w-4 h-4 text-[#C99558]" />
                <span>{editingUser ? `ویرایش کاربر «${editingUser.fullName || editingUser.name}»` : 'تعریف کاربر جدید'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full" aria-label="بستن">
                <X className="w-4 h-4 text-[#6C6C6C]" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                  {formError}
                </div>
              )}
              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: نرگس باقری"
                  className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">شماره همراه (تلفن اصلی):</label>
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
                  <label className="font-bold text-[#1C1C1C] block mb-1">ایمیل (اختیاری):</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@boya.ir"
                    dir="ltr"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] font-mono text-left focus:border-[#173B3F] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">نقش و سطح دسترسی کاربر در پلتفرم:</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] font-semibold text-[#173B3F] outline-none"
                >
                  <option value={ROLES.CUSTOMER}>👥 {ROLE_LABELS.customer} (Customer)</option>
                  <option value={ROLES.SALON_ADMIN}>🏢 {ROLE_LABELS.salon_admin} (Salon Admin)</option>
                  <option value={ROLES.LINE_MANAGER}>✂️ {ROLE_LABELS.line_manager} (Line Manager)</option>
                  <option value={ROLES.SALON_SPECIALIST}>💄 {ROLE_LABELS.salon_specialist} (Specialist)</option>
                  <option value={ROLES.MOBILE_SPECIALIST}>🚗 {ROLE_LABELS.mobile_specialist} (Mobile Specialist)</option>
                  <option value={ROLES.SUPER_ADMIN}>👑 {ROLE_LABELS.super_admin} (Super Admin)</option>
                </select>
              </div>

              {role !== 'customer' && role !== 'super_admin' && (
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">تخصیص به سالن متبوع:</label>
                  <select
                    value={selectedSalonId}
                    onChange={(e) => setSelectedSalonId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] font-semibold text-[#173B3F] outline-none"
                  >
                    <option value="">بدون سالن (مستقل / عمومی)</option>
                    {salons.map((sal: any) => (
                      <option key={sal.id} value={sal.id}>
                        {sal.name} ({sal.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E7E2DA] text-[#6C6C6C]"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#173B3F] hover:bg-[#0F3232] text-white rounded-xl font-bold text-xs shadow-md"
                >
                  {editingUser ? 'ذخیره تغییرات کاربر' : 'افزودن قطعی کاربر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
