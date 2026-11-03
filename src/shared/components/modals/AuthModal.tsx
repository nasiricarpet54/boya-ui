import React, { useState, useEffect } from 'react';
import { X, Loader2, ShieldCheck, Smartphone, KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { toPersianDigits, normalizePhone } from '../../utils/persianUtils';
import { useNavigate } from '@tanstack/react-router';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const navigate = useNavigate();
  const { setAppMode } = useUIStore();
  const { sendOtp, loginWithPhone, isLoading } = useAuthStore();

  useEffect(() => {
    let timer: any;
    if (isTimerActive && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(timer);
  }, [isTimerActive, countdown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = normalizePhone(phoneNumber);
    if (!/^09\d{9}$/.test(cleanPhone)) {
      setError('لطفاً شماره همراه ۱۱ رقمی معتبر با پیش‌شماره ۰۹ وارد کنید (مانند ۰۹۱۲۳۴۵۶۷۸۹).');
      return;
    }

    try {
      await sendOtp(cleanPhone);
      setStep('otp');
      setCountdown(60);
      setIsTimerActive(true);
    } catch (err: any) {
      setError(err.message || 'خطایی در ارسال کد تایید پیامکی رخ داد.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otpCode.trim()) {
      setError('لطفاً کد تایید ۵ رقمی دریافتی را وارد کنید.');
      return;
    }

    try {
      await loginWithPhone(phoneNumber.trim(), otpCode.trim());
      
      // ✅ Redirect based on role
      const { user } = useAuthStore.getState();
      if (user) {
        if (user.role === 'super_admin') {
          setAppMode('admin_panel');
          navigate({ to: '/admin' });
        } else if (
          user.role === 'salon_admin' || 
          user.role === 'salon_specialist' || 
          user.role === 'mobile_specialist' || 
          user.role === 'line_manager'
        ) {
          setAppMode('salon_panel');
          navigate({ to: '/salon-admin' });
        } else {
          setAppMode('customer');
          navigate({ to: '/' });
        }
      }
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'کد تایید وارد شده نادرست می‌باشد.');
    }
  };

  const handleResendCode = async () => {
    if (isTimerActive) return;
    setError(null);
    try {
      await sendOtp(phoneNumber.trim());
      setCountdown(60);
      setIsTimerActive(true);
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال مجدد کد.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0F3232]/60 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="bg-[#FAF7F2] w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-[#D9A2B0]/30 relative animate-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button 
          onClick={onClose}
          aria-label="بستن پنجره"
          className="absolute top-5 left-5 p-2 rounded-full bg-white/80 text-[#173B3F] hover:bg-white transition-colors z-10 border border-[#E7E2DA] shadow-xs"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-7 pt-10">
          <div className="w-14 h-14 bg-[#173B3F] rounded-2xl flex items-center justify-center mb-5 mx-auto shadow-md border-2 border-[#D9A2B0]/30 text-[#D9A2B0]">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-[#173B3F] text-center mb-1 font-serif">
            ورود به بویا
          </h2>
          <p className="text-center text-[#6C6C6C] text-xs mb-6">
            ورود سریع سالن‌داران، متخصصین و مشتریان با شماره همراه
          </p>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-2xl text-xs text-center mb-5 border border-red-200/80 leading-relaxed font-semibold">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#1C1C1C] block mb-1.5 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#173B3F]" />
                  <span>شماره تلفن همراه شما:</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  dir="ltr"
                  className="w-full h-12 px-4 rounded-2xl bg-white border border-[#E7E2DA] text-sm text-[#1C1C1C] font-mono tracking-wider focus:border-[#173B3F] focus:ring-2 focus:ring-[#173B3F]/20 outline-none text-left transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#173B3F] hover:bg-[#0F3232] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#173B3F]/20 transition-all disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#D9A2B0]" />
                ) : (
                  <>
                    <span>دریافت کد تایید SMS</span>
                    <ArrowRight className="w-4 h-4 text-[#D9A2B0] rotate-180" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-[#EAF2EF] p-3 rounded-2xl border border-[#6F9A8D]/40 text-xs text-[#2E5E52] flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-[#6C6C6C]">کد تایید به شماره زیر ارسال گردید:</span>
                  <span className="font-mono font-bold text-sm text-[#173B3F]">{toPersianDigits(phoneNumber)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-[11px] text-[#173B3F] underline font-bold"
                >
                  ویرایش شماره
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1C1C1C] block mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#173B3F]" />
                  <span>کد ۵ رقمی تایید پیامکی:</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  placeholder="۱۲۳۴۵"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  dir="ltr"
                  className="w-full h-12 px-4 rounded-2xl bg-white border border-[#E7E2DA] text-lg text-center font-mono font-bold text-[#173B3F] tracking-widest focus:border-[#173B3F] focus:ring-2 focus:ring-[#173B3F]/20 outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[#6C6C6C]">
                {isTimerActive ? (
                  <span>ارسال مجدد کد تا {toPersianDigits(countdown)} ثانیه دیگر</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-[#173B3F] font-bold underline hover:text-[#0F3232]"
                  >
                    ارسال مجدد کد پیامکی
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#173B3F] hover:bg-[#0F3232] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#173B3F]/20 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#D9A2B0]" />
                ) : (
                  <span>ورود قطعی به حساب</span>
                )}
              </button>
            </form>
          )}

          <p className="mt-6 text-[10px] text-[#6C6C6C] text-center leading-relaxed border-t border-[#E7E2DA] pt-4">
            با ورود به پلتفرم بویا، شما <span className="text-[#173B3F] font-bold">شرایط و قوانین</span> حریم خصوصی را می‌پذیرید.
          </p>
        </div>
      </div>
    </div>
  );
};
