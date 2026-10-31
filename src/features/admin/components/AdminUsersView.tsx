import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useDataStore } from '../../../shared/stores/dataStore';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { PlatformUser } from '../../../shared/data/marketplaceData';

export const AdminUsersView: React.FC = () => {
  const { users, setUsers } = useDataStore();
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'customer' | 'salon_owner' | 'specialist' | 'super_admin'>('customer');

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    return true;
  });

  const onAddUser = (u: PlatformUser) => setUsers([u, ...users]);
  const onToggleUserStatus = (id: string) => setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u));
  const onUpdateUserRole = (id: string, role: any) => setUsers(users.map(u => u.id === id ? { ...u, role } : u));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    onAddUser({ id: `usr-${Date.now()}`, name: newName.trim(), phone: newPhone.trim(), role: newRole, status: 'active', createdAt: 'امروز' });
    setIsAddUserOpen(false);
    setNewName(''); setNewPhone('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border flex justify-between items-center">
        <h2 className="text-base font-bold text-[#1A2942]">مدیریت کاربران و نقش‌ها</h2>
        <div className="flex gap-2">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-xs border rounded-lg p-2">
            <option value="all">همه نقش‌ها</option>
            <option value="super_admin">مدیران کل</option>
            <option value="salon_owner">سالنداران</option>
            <option value="specialist">متخصصین</option>
            <option value="customer">مشتریان</option>
          </select>
          <button onClick={() => setIsAddUserOpen(true)} className="bg-[#C59B27] p-2 rounded-lg text-xs font-bold"><Plus className="w-4 h-4 inline" /> جدید</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden shadow-xs">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#FAF7F2] font-bold">
            <tr>
              <th className="p-3">نام</th>
              <th className="p-3">شماره</th>
              <th className="p-3">نقش</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-[#FAF7F2]/30">
                <td className="p-3 font-bold">{u.name}</td>
                <td className="p-3 font-mono">{toPersianDigits(u.phone)}</td>
                <td className="p-3">
                   <select value={u.role} onChange={(e) => onUpdateUserRole(u.id, e.target.value)} className="text-[10px] border rounded p-1">
                     <option value="customer">مشتری</option>
                     <option value="specialist">متخصص</option>
                     <option value="salon_owner">سالندار</option>
                     <option value="super_admin">مدیر کل</option>
                   </select>
                </td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{u.status === 'active' ? 'فعال' : 'معلق'}</span></td>
                <td className="p-3 text-center"><button onClick={() => onToggleUserStatus(u.id)} className="text-rose-600 font-bold">{u.status === 'active' ? 'تعلیق' : 'فعال'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-5 border max-w-md w-full space-y-4 shadow-2xl">
             <div className="flex justify-between border-b pb-2"><h4 className="text-sm font-bold">تعریف کاربر جدید</h4><button onClick={() => setIsAddUserOpen(false)}>✕</button></div>
             <form onSubmit={handleCreate} className="space-y-3">
               <input type="text" placeholder="نام" value={newName} onChange={e => setNewName(e.target.value)} className="w-full h-10 px-3 rounded-xl border text-xs" required />
               <input type="text" placeholder="شماره همراه" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full h-10 px-3 rounded-xl border text-xs" required />
               <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className="w-full h-10 px-3 rounded-xl border text-xs">
                 <option value="customer">مشتری</option>
                 <option value="specialist">متخصص</option>
                 <option value="salon_owner">سالندار</option>
                 <option value="super_admin">مدیر کل</option>
               </select>
               <button type="submit" className="w-full py-3 bg-[#C59B27] text-[#1A2942] rounded-full font-bold text-xs">افزودن کاربر</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
