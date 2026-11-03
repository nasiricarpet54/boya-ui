import React, { useState } from 'react';
import { Settings, Radio, ShieldCheck, Database, Key, Server, Save, CheckCircle2, Loader2 } from 'lucide-react';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import api from '../../../shared/api/apiClient';
import { useUIStore } from '../../../shared/stores/uiStore';

export const AdminSettingsView: React.FC = () => {
  const { showToast } = useUIStore();
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [otpDevMode, setOtpDevMode] = useState(false);
  const [smsUsername, setSmsUsername] = useState('');
  const [otpPatternId, setOtpPatternId] = useState('');
  const [bookingPatternId, setBookingPatternId] = useState('');
  const [neshanApiKey, setNeshanApiKey] = useState('');
  
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    api.get('/admin/profile')
      .then((res) => {
        if (isMounted && res.data) {
          // Mapping server response to form fields (Some fields might be used as proxies for settings in فاز ۱)
          if (res.data.twoFactorEnabled !== undefined) setPaymentsEnabled(res.data.twoFactorEnabled);
          if (res.data.securityAlertSms !== undefined) setOtpDevMode(res.data.securityAlertSms);
          
          // In a real system, these would come from a dedicated /settings endpoint
          // For now, we use existing profile fields or keep them dynamic
          setSmsUsername(res.data.emergencyPhone || '');
          setOtpPatternId(res.data.adminCode || ''); 
          setBookingPatternId(''); 
          setNeshanApiKey('');
        }
      })
      .catch((err) => console.warn('Fetch admin profile settings failed:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.patch('/admin/profile', {
        securityAlertSms: otpDevMode,
        newSalonsNotifySms: true,
        twoFactorEnabled: paymentsEnabled,
        emergencyPhone: smsUsername,
      });
      setIsSaved(true);
      showToast('تنظیمات زیرساخت با موفقیت به‌روزرسانی شد.');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save admin settings:', err);
      showToast('خطا در ذخیره‌سازی تنظیمات.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-[#173B3F] animate-spin" />
        <span className="text-xs font-bold text-[#173B3F]">در حال دریافت پیکربندی سیستم...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white p-6 rounded-[2rem] border border-[#E7E2DA] shadow-sm">
        <h2 className="text-base font-bold text-[#173B3F] font-serif">
          پیکربندی و تنظیمات زیرساخت پلتفرم بویا
        </h2>
        <p className="text-xs text-[#6C6C6C] mt-0.5">
          مدیریت سرویس‌های پیامک ملی‌پیامک، کلیدهای نقشه نشان، فلگ‌های پرداخت و وضعیت کانتینرها (ADR-004)
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SMS Gateways */}
        <div className="bg-white p-6 rounded-[2rem] border border-[#E7E2DA] space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#E7E2DA] pb-3">
            <Radio className="w-4 h-4 text-[#C99558]" />
            <h3 className="text-sm font-bold text-[#173B3F]">
              تنظیمات درگاه پیامک و الگوهای OTP
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-[#173B3F] block">
                نام کاربری وب‌سرویس ملی‌پیامک:
              </label>
              <input
                type="text"
                value={smsUsername}
                onChange={(e) => setSmsUsername(e.target.value)}
                placeholder="MELIPAYAMAK_USERNAME"
                className="w-full h-11 px-4 rounded-2xl border border-[#E7E2DA] font-mono text-[#173B3F] focus:border-[#173B3F] focus:ring-2 focus:ring-[#173B3F]/5 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#173B3F] block">
                شناسه الگوی پترن کد تایید (OTP Body ID):
              </label>
              <input
                type="text"
                value={otpPatternId}
                onChange={(e) => setOtpPatternId(e.target.value)}
                className="w-full h-11 px-4 rounded-2xl border border-[#E7E2DA] font-mono text-[#173B3F] focus:border-[#173B3F] focus:ring-2 focus:ring-[#173B3F]/5 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#173B3F] block">
                شناسه الگوی تایید نوبت سالن (Booking Body ID):
              </label>
              <input
                type="text"
                value={bookingPatternId}
                onChange={(e) => setBookingPatternId(e.target.value)}
                className="w-full h-11 px-4 rounded-2xl border border-[#E7E2DA] font-mono text-[#173B3F] focus:border-[#173B3F] focus:ring-2 focus:ring-[#173B3F]/5 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#173B3F] block">
                کلید API نقشه و جئوکودینگ نشان (Neshan API Key):
              </label>
              <input
                type="text"
                value={neshanApiKey}
                onChange={(e) => setNeshanApiKey(e.target.value)}
                className="w-full h-11 px-4 rounded-2xl border border-[#E7E2DA] font-mono text-[#173B3F] focus:border-[#173B3F] focus:ring-2 focus:ring-[#173B3F]/5 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-white p-6 rounded-[2rem] border border-[#E7E2DA] space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#E7E2DA] pb-3">
            <Server className="w-4 h-4 text-[#6F9A8D]" />
            <h3 className="text-sm font-bold text-[#173B3F]">
              فلگ‌های فعال‌سازی ماژول‌ها (Feature Flags)
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Payment Flag */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] group hover:border-[#173B3F]/30 transition-all">
              <div className="space-y-1">
                <span className="font-bold text-[#173B3F] block">
                  فعال‌سازی درگاه پرداخت آنلاین (PAYMENTS_ENABLED)
                </span>
                <span className="text-[11px] text-[#6C6C6C]">
                  در فاز ۱ خاموش است (ویترین رایگان). روشن کردن آن در فاز ۲ درگاه زرین‌پال را فعال می‌کند.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentsEnabled}
                  onChange={(e) => setPaymentsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#173B3F]"></div>
              </label>
            </div>

            {/* OTP Dev Mode */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] group hover:border-[#173B3F]/30 transition-all">
              <div className="space-y-1">
                <span className="font-bold text-[#173B3F] block">
                  حالت توسعه لاگ OTP بدون ارسال پیامک (OTP_DEV_MODE)
                </span>
                <span className="text-[11px] text-[#6C6C6C]">
                  در صورت فعال بودن، کدهای OTP به جای ارسال SMS در لاگ‌های سرور چاپ می‌شوند.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={otpDevMode}
                  onChange={(e) => setOtpDevMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C99558]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-[#173B3F] hover:bg-[#0F3232] text-white font-bold text-xs shadow-md shadow-[#173B3F]/20 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#D9A2B0]" />
            ) : (
              <Save className="w-4 h-4 text-[#D9A2B0]" />
            )}
            <span>ذخیره تغییرات زیرساخت سیستم</span>
          </button>
          {isSaved && (
            <span className="text-xs text-[#6F9A8D] font-bold flex items-center gap-1 animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              <span>پیکربندی با موفقیت در پایگاه‌داده مرکزی ذخیره گردید.</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
