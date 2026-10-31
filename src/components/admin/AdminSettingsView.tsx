import React, { useState } from 'react';
import { Settings, Radio, ShieldCheck, Database, Key, Server, Save, CheckCircle2 } from 'lucide-react';
import { toPersianDigits } from '../../utils/persianUtils';

export const AdminSettingsView: React.FC = () => {
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [otpDevMode, setOtpDevMode] = useState(false);
  const [smsUsername, setSmsUsername] = useState('boya_admin');
  const [otpPatternId, setOtpPatternId] = useState('229410');
  const [bookingPatternId, setBookingPatternId] = useState('229411');
  const [neshanApiKey, setNeshanApiKey] = useState('service.f9910d8a43...');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-[#EEDCC5]">
        <h2 className="text-base font-bold text-[#1A2942]">
          پیکربندی و تنظیمات زیرساخت پلتفرم بویا
        </h2>
        <p className="text-xs text-[#64748B] mt-0.5">
          مدیریت سرویس‌های پیامک ملی‌پیامک، کلیدهای نقشه نشان، فلگ‌های پرداخت و وضعیت کانتینرها
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SMS Gateways */}
        <div className="bg-white p-5 rounded-2xl border border-[#EEDCC5] space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F2EDE5] pb-2.5">
            <Radio className="w-4 h-4 text-[#C59B27]" />
            <h3 className="text-sm font-bold text-[#1A2942]">
              تنظیمات درگاه پیامک و الگوهای OTP (Melipayamak / Kavenegar)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[#1A2942] block mb-1">
                نام کاربری وب‌سرویس ملی‌پیامک (MELIPAYAMAK_USERNAME):
              </label>
              <input
                type="text"
                value={smsUsername}
                onChange={(e) => setSmsUsername(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] font-mono focus:border-[#C59B27] outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-[#1A2942] block mb-1">
                شناسه الگوی پترن کد تایید (OTP Body ID):
              </label>
              <input
                type="text"
                value={otpPatternId}
                onChange={(e) => setOtpPatternId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] font-mono focus:border-[#C59B27] outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-[#1A2942] block mb-1">
                شناسه الگوی تایید نوبت سالن (Booking Body ID):
              </label>
              <input
                type="text"
                value={bookingPatternId}
                onChange={(e) => setBookingPatternId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] font-mono focus:border-[#C59B27] outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-[#1A2942] block mb-1">
                کلید API نقشه و جئوکودینگ نشان (Neshan API Key):
              </label>
              <input
                type="text"
                value={neshanApiKey}
                onChange={(e) => setNeshanApiKey(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] font-mono focus:border-[#C59B27] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-white p-5 rounded-2xl border border-[#EEDCC5] space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F2EDE5] pb-2.5">
            <Server className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-sm font-bold text-[#1A2942]">
              فلگ‌های فعال‌سازی ماژول‌ها (Feature Flags - ADR-004)
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Payment Flag */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#EEDCC5]">
              <div>
                <span className="font-bold text-[#1A2942] block">
                  فعال‌سازی درگاه پرداخت آنلاین (PAYMENTS_ENABLED)
                </span>
                <span className="text-[11px] text-[#64748B]">
                  در فاز ۱ خاموش است (ویترین رایگان و پرداخت مستقیم در سالن). روشن کردن آن در فاز ۲ درگاه زرین‌پال را فعال می‌کند.
                </span>
              </div>
              <input
                type="checkbox"
                checked={paymentsEnabled}
                onChange={(e) => setPaymentsEnabled(e.target.checked)}
                className="accent-[#C59B27] w-5 h-5 cursor-pointer"
              />
            </div>

            {/* OTP Dev Mode */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#EEDCC5]">
              <div>
                <span className="font-bold text-[#1A2942] block">
                  حالت توسعه لاگ OTP بدون ارسال پیامک (OTP_DEV_MODE)
                </span>
                <span className="text-[11px] text-[#64748B]">
                  در صورت فعال بودن، کدهای OTP به جای ارسال SMS در لاگ‌های سرور چاپ می‌شوند.
                </span>
              </div>
              <input
                type="checkbox"
                checked={otpDevMode}
                onChange={(e) => setOtpDevMode(e.target.checked)}
                className="accent-[#C59B27] w-5 h-5 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#C59B27] hover:bg-[#B8860B] text-[#1A2942] font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره تغییرات زیرساخت</span>
          </button>
          {isSaved && (
            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>پیکربندی با موفقیت ذخیره گردید.</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
