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

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, filename: file.name }),
            credentials: 'include',
          });
          const uploadData = await uploadRes.json();
          if (uploadData.url) {
            handleChange('avatarUrl', uploadData.url);
          }
        } catch (err) {
          console.error('Error uploading admin avatar:', err);
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setIsUploading(false);
        console.error('FileReader error');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error in handleAvatarUpload:', err);
      setIsUploading(false);
    }
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
      
      {saveSuccess && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>اطلاعات پروفایل مدیریت ارشد با موفقیت در پایگاه‌داده ذخیره شد.</span>
        </div>
      )}
      
      <div className="bg-white p-8 rounded-[32px] border border-[#E7E2DA] space-y-6">
         {/* Avatar preview and uploader */}
         <div className="flex items-center gap-4 pb-6 border-b border-[#E7E2DA]">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-[#173B3F] text-[#D9A2B0] flex items-center justify-center font-bold text-2xl border-2 border-[#D9A2B0]/40 shadow-sm overflow-hidden">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt={formData.fullName} className="w-full h-full object-cover" />
                ) : (
                  formData.fullName?.charAt(0) || 'م'
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white flex items-center justify-center border-2 border-white shadow-xs cursor-pointer"
                title="تغییر تصویر مدیریت"
              >
                <Camera className="w-3.5 h-3.5 text-[#D9A2B0]" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div>
               <h3 className="text-sm font-bold text-[#173B3F]">{formData.fullName}</h3>
               <p className="text-xs text-[#6C6C6C] mt-0.5">{formData.positionTitle || 'مدیر ارشد پلتفرم بویا'}</p>
               <span className="text-[10px] text-[#6F9A8D] font-bold block mt-1">
                 {isUploading ? 'در حال آپلود و ذخیره تصویر...' : 'برای تغییر تصویر، روی آیکون دوربین کلیک کنید'}
               </span>
            </div>
         </div>

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
            <div className="space-y-2">
               <label className="text-[10px] font-bold text-[#6C6C6C] pr-2">سمت شغلی</label>
               <input 
                 value={formData.positionTitle || ''} 
                 onChange={(e) => handleChange('positionTitle', e.target.value)}
                 className="w-full bg-[#F7F3EE] border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#D9A2B0]/30 outline-none"
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-bold text-[#6C6C6C] pr-2">شماره تماس</label>
               <input 
                 value={formData.phone} 
                 onChange={(e) => handleChange('phone', e.target.value)}
                 className="w-full bg-[#F7F3EE] border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#D9A2B0]/30 outline-none font-mono"
               />
            </div>
         </div>
      </div>
    </div>
  );
};
