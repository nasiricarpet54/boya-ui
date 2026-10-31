import React, { useState } from 'react';
import { X, Phone, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, otpSchema } from '../../utils/validation';
import { useAuthStore } from '../../stores/authStore';
import api from '../../api/apiClient';
import { toPersianDigits } from '../../utils/persianUtils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();

  const phoneForm = useForm<{ phone: string }>({
    resolver: zodResolver(loginSchema),
  });

  const otpForm = useForm<{ otp: string }>({
    resolver: zodResolver(otpSchema),
  });

  if (!isOpen) return null;

  const handlePhoneSubmit = async (data: { phone: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      // Mock API call to send OTP
      // In a real app: await api.post('/auth/send-otp', { phone: data.phone });
      setPhoneNumber(data.phone);
      setStep('otp');
    } catch (err) {
      setError('خطایی در ارسال کد تایید رخ داد.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (data: { otp: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { phone: phoneNumber, otp: data.otp });
      const { user, accessToken } = response.data;
      setAuth(user, accessToken);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'کد تایید اشتباه است.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0F3232]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#F7F3EE] w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-[#D9A2B0]/30 relative animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 p-2 rounded-full bg-white/50 text-[#173B3F] hover:bg-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pt-12">
          <div className="w-16 h-16 bg-[#173B3F] rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg border-2 border-[#D9A2B0]/20">
            <Shield className="w-8 h-8 text-[#D9A2B0]" />
          </div>

          <h2 className="text-2xl font-black text-[#173B3F] text-center mb-2 font-serif">
            {step === 'phone' ? 'ورود به بویا' : 'تایید شماره موبایل'}
          </h2>
          <p className="text-center text-gray-600 text-sm mb-8">
            {step === 'phone' 
              ? 'برای رزرو نوبت و دسترسی به پروفایل، وارد شوید.' 
              : `کد ۵ رقمی به شماره ${toPersianDigits(phoneNumber)} ارسال شد.`}
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs text-center mb-6 border border-red-100">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4">
              <div className="relative">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6C6C6C]" />
                <input
                  {...phoneForm.register('phone')}
                  type="tel"
                  placeholder="شماره موبایل (مثلا 09123456789)"
                  className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white border border-[#E7E2DA] focus:border-[#173B3F] focus:ring-1 focus:ring-[#173B3F] outline-none transition-all text-sm font-medium"
                  dir="ltr"
                />
              </div>
              {phoneForm.formState.errors.phone && (
                <p className="text-red-500 text-[10px] pr-2">{phoneForm.formState.errors.phone.message}</p>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-[#173B3F] text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-[#0F3232] transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <span>دریافت کد تایید</span>
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
              <div className="relative">
                <Shield className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6C6C6C]" />
                <input
                  {...otpForm.register('otp')}
                  type="text"
                  maxLength={5}
                  placeholder="کد ۵ رقمی"
                  className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white border border-[#E7E2DA] focus:border-[#173B3F] focus:ring-1 focus:ring-[#173B3F] outline-none transition-all text-center text-lg font-bold tracking-[0.5em]"
                  dir="ltr"
                />
              </div>
              {otpForm.formState.errors.otp && (
                <p className="text-red-500 text-[10px] pr-2">{otpForm.formState.errors.otp.message}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-[#173B3F] text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-[#0F3232] transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <span>تایید و ورود</span>
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-[#173B3F] text-xs font-bold py-2 hover:underline"
              >
                ویرایش شماره موبایل
              </button>
            </form>
          )}

          <p className="mt-8 text-[10px] text-[#6C6C6C] text-center leading-relaxed">
            با ورود به بویا، شما <span className="text-[#173B3F] font-bold">شرایط و قوانین</span> استفاده از پلتفرم را می‌پذیرید.
          </p>
        </div>
      </div>
    </div>
  );
};
