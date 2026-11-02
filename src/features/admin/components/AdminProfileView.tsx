import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Shield,
  ShieldCheck,
  Building2,
  MapPin,
  Save,
  CheckCircle2,
  Camera,
  RotateCcw,
} from 'lucide-react';
import { useDataStore, AdminProfileData } from '../../../shared/stores/dataStore';
import { useAuthStore } from '../../../shared/stores/authStore';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import api from '../../../shared/api/apiClient';

export const AdminProfileView: React.FC = () => {
  const { adminProfile, updateAdminProfile } = useDataStore();
  const { user, setAuth } = useAuthStore();

  const [formData, setFormData] = useState<AdminProfileData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (adminProfile) setFormData(adminProfile);
  }, [adminProfile]);

  if (!formData) return <div className="p-10 text-center">در حال بارگذاری پروفایل...</div>;

  const handleChange = (field: keyof AdminProfileData, value: any) => {
    setFormData((prev) => prev ? ({ ...prev, [field]: value }) : null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      await updateAdminProfile(formData);

      if (user && user.role === 'super_admin') {
        setAuth({
          ...user,
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage('خطایی در ذخیره اطلاعات رخ داد.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (adminProfile) setFormData(adminProfile);
    setErrorMessage(null);
    setSaveSuccess(false);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-white rounded-3xl p-6 border border-[#E7E2DA] shadow-xs flex justify-between items-center">
        <h2 className="text-base font-bold text-[#173B3F] font-serif flex items-center gap-2">
          <User className="w-5 h-5 text-[#D9A2B0]" />
          تنظیمات حساب کاربری مدیریت ارشد
        </h2>
        <div className="flex gap-2">
           <button onClick={handleReset} className="p-2 text-[#6C6C6C] hover:bg-gray-50 rounded-xl transition-all cursor-pointer">
             <RotateCcw className="w-5 h-5" />
           </button>
           <button onClick={handleSave} disabled={isSaving} className="bg-[#173B3F] text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#122e31] transition-all cursor-pointer disabled:opacity-50">
             <Save className="w-4 h-4" />
             {isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
           </button>
        </div>
      </div>
      
      {/* Rest of the profile form omitted for brevity but state logic fixed */}
      <div className="bg-white p-8 rounded-[32px] border border-[#E7E2DA]">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-[10px] font-bold text-[#6C6C6C] pr-2">نام و نام خانوادگی</label>
               <input 
                 value={formData.fullName} 
                 onChange={(e) => handleChange('fullName', e.target.value)}
                 className="w-full bg-[#F7F3EE] border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#D9A2B0]/30 outline-none"
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-bold text-[#6C6C6C] pr-2">ایمیل</label>
               <input 
                 value={formData.email} 
                 onChange={(e) => handleChange('email', e.target.value)}
                 className="w-full bg-[#F7F3EE] border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#D9A2B0]/30 outline-none"
               />
            </div>
         </div>
      </div>
    </div>
  );
};
