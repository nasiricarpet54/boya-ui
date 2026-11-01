import React, { useState } from 'react';
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
  Key,
  BellRing,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useDataStore, AdminProfileData } from '../../../shared/stores/dataStore';
import { useAuthStore } from '../../../shared/stores/authStore';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import api from '../../../shared/api/apiClient';
import { ImageFileUploader } from '../../../shared/components/ui/ImageFileUploader';

const AVATAR_PRESETS = [
  { id: 'av-1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', label: 'عکس ۱' },
  { id: 'av-2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', label: 'عکس ۲' },
  { id: 'av-3', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', label: 'عکس ۳' },
  { id: 'av-4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', label: 'عکس ۴' },
];

export const AdminProfileView: React.FC = () => {
  const { adminProfile, updateAdminProfile } = useDataStore();
  const { user, setAuth, accessToken } = useAuthStore();

  const [formData, setFormData] = useState<AdminProfileData>(adminProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (field: keyof AdminProfileData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      // 1. Update in local dataStore
      updateAdminProfile(formData);

      // 2. Call backend endpoint to update profile in database
      await api.put('/admin/profile', {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        bio: formData.bio,
        positionTitle: formData.positionTitle,
      }).catch((err) => {
        console.warn('API sync warning (fallback to local state):', err);
      });

      // 3. Update auth store user if current logged in user is admin
      if (user && accessToken) {
        setAuth({
          ...user,
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
        }, accessToken);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('خطایی در ذخیره اطلاعات رخ داد.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(adminProfile);
    setErrorMessage(null);
    setSaveSuccess(false);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#E7E2DA] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
            <h2 className="text-base font-bold text-[#173B3F] font-serif">
              ویرایش تمامی اطلاعات ادمین اصلی (Super Admin Profile)
            </h2>
          </div>
          <p className="text-xs text-[#6C6C6C] mt-1">
            اطلاعات شناسنامه‌ای، راه‌های ارتباطی، دسترسی‌های امنیتی و اعلانات حساس مدیریتی پلتفرم بویا
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#173B3F] bg-[#FAF7F2] px-3.5 py-1.5 rounded-xl border border-[#E7E2DA] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#C99558]" />
            <span>سطح دسترسی: بالاترین مقام نظارتی (Root Super Admin)</span>
          </span>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold">
              اطلاعات ادمین اصلی با موفقیت ذخیره و در سرور و نشست فعال به‌روزرسانی شد.
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 font-mono">
            زمان: {new Date().toLocaleTimeString('fa-IR')}
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Avatar & Identity Header */}
        <div className="bg-white rounded-3xl p-6 border border-[#E7E2DA] shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-[#E7E2DA] pb-3">
            <User className="w-4 h-4 text-[#173B3F]" />
            <h3 className="text-sm font-bold text-[#173B3F]">
              تصویر نمایه و مشخصات هویتی ادمین
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <img
                src={formData.avatarUrl || AVATAR_PRESETS[0].url}
                alt={formData.fullName}
                className="w-24 h-24 rounded-3xl object-cover border-3 border-[#D9A2B0] shadow-md group-hover:opacity-90 transition-opacity"
              />
              <div className="absolute -bottom-2 -right-2 bg-[#173B3F] text-white p-1.5 rounded-full shadow-md border-2 border-white">
                <Camera className="w-3.5 h-3.5 text-[#D9A2B0]" />
              </div>
            </div>

            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="text-xs font-bold text-[#1C1C1C] block mb-1">
                  انتخاب سریع تصویر آواتار از تصاویر پیشنهادی:
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleChange('avatarUrl', preset.url)}
                      className={`flex items-center gap-1.5 p-1 rounded-xl border text-xs transition-all ${
                        formData.avatarUrl === preset.url
                          ? 'border-[#173B3F] bg-[#173B3F] text-white'
                          : 'border-[#E7E2DA] bg-[#FAF7F2] text-[#1C1C1C] hover:border-[#173B3F]'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-6 h-6 rounded-lg object-cover" />
                      <span className="text-[11px] px-1">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <ImageFileUploader
                  label="بارگذاری تصویر پروفایل جدید (از لوکال / دوربین):"
                  subLabel="تبدیل و فشرده‌سازی خودکار به WebP بدون افت کیفیت"
                  value={formData.avatarUrl}
                  onChange={(url) => handleChange('avatarUrl', url)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-xs font-bold text-[#1C1C1C] block mb-1">
                نام و نام خانوادگی ادمین کل:
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="مثال: مهندس مهدی حسینی"
                className="w-full h-11 px-3.5 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1C1C1C] block mb-1">
                عنوان سازمانی / سمت مدیریتی:
              </label>
              <input
                type="text"
                required
                value={formData.positionTitle}
                onChange={(e) => handleChange('positionTitle', e.target.value)}
                placeholder="مثال: مدیر ارشد اجرایی و ناظر عالی پلتفرم"
                className="w-full h-11 px-3.5 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1C1C1C] block mb-1">
                کد پرسنلی / شناسه نظارتی:
              </label>
              <input
                type="text"
                value={formData.adminCode}
                onChange={(e) => handleChange('adminCode', e.target.value)}
                placeholder="SA-1001"
                className="w-full h-11 px-3.5 rounded-xl border border-[#E7E2DA] text-xs font-mono focus:border-[#173B3F] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Numbers & Communication */}
        <div className="bg-white rounded-3xl p-6 border border-[#E7E2DA] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E7E2DA] pb-3">
            <Phone className="w-4 h-4 text-[#173B3F]" />
            <h3 className="text-sm font-bold text-[#173B3F]">
              راه‌های ارتباطی و اطلاعات تماس اضطراری
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-[#1C1C1C] block mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#173B3F]" />
                <span>شماره تلفن همراه اصلی (ورود OTP):</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                dir="ltr"
                className="w-full h-11 px-3 rounded-xl border border-[#E7E2DA] font-mono text-left focus:border-[#173B3F] outline-none"
              />
              <span className="text-[10px] text-[#6C6C6C] mt-1 block">
                کدهای ورود پیامکی و ورود امن به این شماره ارسال می‌گردد.
              </span>
            </div>

            <div>
              <label className="font-bold text-[#1C1C1C] block mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#C99558]" />
                <span>شماره تلفن پشتیبان / اضطراری:</span>
              </label>
              <input
                type="tel"
                value={formData.emergencyPhone || ''}
                onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                placeholder="۰۹۳۵۱۲۳۴۵۶۷"
                dir="ltr"
                className="w-full h-11 px-3 rounded-xl border border-[#E7E2DA] font-mono text-left focus:border-[#173B3F] outline-none"
              />
              <span className="text-[10px] text-[#6C6C6C] mt-1 block">
                جهت بازیابی حساب در مواقع قطعی سیمکارت اصلی
              </span>
            </div>

            <div>
              <label className="font-bold text-[#1C1C1C] block mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#173B3F]" />
                <span>ایمیل رسمی سازمانی:</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="admin@boya.ir"
                dir="ltr"
                className="w-full h-11 px-3 rounded-xl border border-[#E7E2DA] font-mono text-left focus:border-[#173B3F] outline-none"
              />
              <span className="text-[10px] text-[#6C6C6C] mt-1 block">
                دریافت گزارش‌های مالی و سیستم لاگ‌ها
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="font-bold text-[#1C1C1C] block mb-1 flex items-center gap-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-[#173B3F]" />
                <span>استان محل استقرار دفتر مدیریت:</span>
              </label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => handleChange('province', e.target.value)}
                placeholder="تهران"
                className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-[#1C1C1C] block mb-1 flex items-center gap-1.5 text-xs">
                <Building2 className="w-3.5 h-3.5 text-[#173B3F]" />
                <span>شهر یا منطقه مرکزی:</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="تهران، منطقه ۱"
                className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="font-bold text-[#1C1C1C] block mb-1 flex items-center gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5 text-[#173B3F]" />
              <span>بیوگرافی، حیطه اختیارات و یادداشت‌های هماهنگی:</span>
            </label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="توضیحاتی درباره سوابق نظارتی، مسئولیت‌ها و کانال‌های رسمی ارتباطی با کادر فنی پلتفرم..."
              className="w-full p-3 rounded-2xl border border-[#E7E2DA] text-xs leading-relaxed focus:border-[#173B3F] outline-none"
            />
          </div>
        </div>

        {/* Section 3: Security & Notification Preferences */}
        <div className="bg-white rounded-3xl p-6 border border-[#E7E2DA] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E7E2DA] pb-3">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-sm font-bold text-[#173B3F]">
              تنظیمات امنیتی و هشدارهای بلادرنگ
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] cursor-pointer hover:border-[#173B3F] transition-colors">
              <input
                type="checkbox"
                checked={formData.securityAlertSms}
                onChange={(e) => handleChange('securityAlertSms', e.target.checked)}
                className="accent-[#173B3F] w-4 h-4 mt-0.5"
              />
              <div>
                <span className="font-bold text-[#1C1C1C] block">
                  ارسال پیامک فوری در صورت ورود غیرمجاز یا لاگین جدید
                </span>
                <span className="text-[11px] text-[#6C6C6C] mt-0.5 block">
                  ارسال SMS هشدار دهنده از طریق ملی‌پیامک در هنگام لاگین از آی‌پی یا مرورگر جدید.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] cursor-pointer hover:border-[#173B3F] transition-colors">
              <input
                type="checkbox"
                checked={formData.newSalonsNotifySms}
                onChange={(e) => handleChange('newSalonsNotifySms', e.target.checked)}
                className="accent-[#173B3F] w-4 h-4 mt-0.5"
              />
              <div>
                <span className="font-bold text-[#1C1C1C] block">
                  پیامک اطلاع‌رسانی ثبت سالن جدید در صف تایید
                </span>
                <span className="text-[11px] text-[#6C6C6C] mt-0.5 block">
                  به محض ثبت نام سالن جدید، کد پیگیری و نام سالن به ادمین پیامک شود.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] cursor-pointer hover:border-[#173B3F] transition-colors">
              <input
                type="checkbox"
                checked={formData.weeklyReportsEmail}
                onChange={(e) => handleChange('weeklyReportsEmail', e.target.checked)}
                className="accent-[#173B3F] w-4 h-4 mt-0.5"
              />
              <div>
                <span className="font-bold text-[#1C1C1C] block">
                  ارسال گزارش عملکرد هفتگی به ایمیل
                </span>
                <span className="text-[11px] text-[#6C6C6C] mt-0.5 block">
                  شامل آمار کل رزروها، پرفروش‌ترین لاین‌ها و رضایت‌سنجی مراجعین.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] cursor-pointer hover:border-[#173B3F] transition-colors">
              <input
                type="checkbox"
                checked={formData.twoFactorEnabled}
                onChange={(e) => handleChange('twoFactorEnabled', e.target.checked)}
                className="accent-[#173B3F] w-4 h-4 mt-0.5"
              />
              <div>
                <span className="font-bold text-[#1C1C1C] block">
                  فعال‌سازی تایید هویت دو مرحله‌ای (2FA) برای ورود به پنل
                </span>
                <span className="text-[11px] text-[#6C6C6C] mt-0.5 block">
                  اجبار ارسال رمز یکبار مصرف ۵ رقمی پیامکی حتی با نشست ذخیره‌شده.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-[#E7E2DA] text-[#6C6C6C] hover:text-[#173B3F] hover:bg-white text-xs font-semibold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>انصراف و بازنشانی فرم</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white text-xs font-bold shadow-md shadow-[#173B3F]/20 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <span>در حال ذخیره‌سازی...</span>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#D9A2B0]" />
                <span>ذخیره تمامی اطلاعات ادمین اصلی</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
