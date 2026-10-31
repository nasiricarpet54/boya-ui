import React, { useState } from 'react';
import { Users, Plus, ShieldCheck, UserCheck, Phone, CheckCircle2, Ban } from 'lucide-react';
import { PlatformUser } from '../../data/marketplaceData';
import { toPersianDigits } from '../../utils/persianUtils';

interface AdminUsersViewProps {
  users: PlatformUser[];
  onUpdateUserRole: (userId: string, newRole: any) => void;
  onToggleUserStatus: (userId: string) => void;
  onAddUser: (user: PlatformUser) => void;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({
  users,
  onUpdateUserRole,
  onToggleUserStatus,
  onAddUser,
}) => {
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'customer' | 'salon_owner' | 'specialist' | 'super_admin'>('customer');

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const newUser: PlatformUser = {
      id: `usr-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      role: newRole,
      status: 'active',
      createdAt: 'امروز',
    };

    onAddUser(newUser);
    setIsAddUserOpen(false);
    setNewName('');
    setNewPhone('');
  };

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'super_admin':
        return 'مدیر کل (Super Admin)';
      case 'salon_owner':
        return 'سالندار (Owner)';
      case 'specialist':
        return 'متخصص (Specialist)';
      case 'customer':
      default:
        return 'مشتری (Customer)';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#EEDCC5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1A2942]">
            کاربران پلتفرم و مدیریت نقش‌ها (RBAC)
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            تعیین سطح دسترسی کاربران، نظارت بر شماره‌های احراز شده با OTP و سالندارها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs font-semibold focus:border-[#C59B27] outline-none"
          >
            <option value="all">همه نقش‌ها</option>
            <option value="super_admin">مدیران کل</option>
            <option value="salon_owner">سالنداران</option>
            <option value="specialist">متخصصین زیبایی</option>
            <option value="customer">مشتریان</option>
          </select>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="flex items-center gap-1 h-9 px-4 rounded-xl bg-[#C59B27] hover:bg-[#B8860B] text-[#1A2942] text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت کاربر جدید</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-[#EEDCC5] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] text-[#1A2942] border-b border-[#EEDCC5] font-bold">
              <tr>
                <th className="p-3.5">نام و مشخصات کاربر</th>
                <th className="p-3.5">شماره همراه</th>
                <th className="p-3.5">نقش سیستمی</th>
                <th className="p-3.5">شعبه مربوطه</th>
                <th className="p-3.5">وضعیت</th>
                <th className="p-3.5 text-center">تغییر نقش</th>
                <th className="p-3.5 text-center">دسترسی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EDE5]">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                  <td className="p-3.5 font-bold text-[#1A2942]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-[#775A00] font-bold">
                        {u.name.slice(0, 2)}
                      </div>
                      <span>{u.name}</span>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-[#64748B]">
                    {toPersianDigits(u.phone)}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        u.role === 'super_admin'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : u.role === 'salon_owner'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : u.role === 'specialist'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="p-3.5 text-[11px] text-[#64748B]">
                    {u.tenantName || '— (کاربر سراسری)'}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {u.status === 'active' ? 'فعال' : 'معلق'}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <select
                      value={u.role}
                      onChange={(e) => onUpdateUserRole(u.id, e.target.value)}
                      className="h-8 px-2 rounded-lg border border-[#E2E8F0] text-[11px] bg-white font-medium focus:border-[#C59B27] outline-none"
                    >
                      <option value="customer">مشتری</option>
                      <option value="specialist">متخصص</option>
                      <option value="salon_owner">سالندار</option>
                      <option value="super_admin">مدیر کل</option>
                    </select>
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => onToggleUserStatus(u.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        u.status === 'active'
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {u.status === 'active' ? 'مسدودسازی' : 'رفع مسدودی'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 border border-[#EEDCC5] max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#F2EDE5] pb-2.5">
              <h4 className="text-sm font-bold text-[#1A2942]">
                تعریف کاربر جدید در سامانه بویا
              </h4>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[#64748B]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#1A2942] block mb-1">
                  نام و نام خانوادگی:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلا: سارا تهرانی"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:border-[#C59B27] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A2942] block mb-1">
                  شماره همراه (جهت احراز هویت پیامکی):
                </label>
                <input
                  type="text"
                  required
                  placeholder="۰۹۱۲..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:border-[#C59B27] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A2942] block mb-1">
                  نقش کاربری:
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:border-[#C59B27] outline-none"
                >
                  <option value="customer">مشتری</option>
                  <option value="specialist">متخصص زیبایی</option>
                  <option value="salon_owner">سالندار (مدیر شعبه)</option>
                  <option value="super_admin">مدیر ارشد پلتفرم</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-[#C59B27] hover:bg-[#B8860B] text-[#1A2942] font-bold text-xs"
                >
                  افزودن و فعال‌سازی کاربر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
