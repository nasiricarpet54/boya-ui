import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Phone, Lock, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../shared/stores/authStore';
import { useUIStore } from '../../shared/stores/uiStore';

export function LoginScreen() {
  const navigate = useNavigate();
  const { sendOtp, loginWithPhone, isLoading } = useAuthStore();
  const { setAppMode } = useUIStore();
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');

  const handleSendOtp = async () => {
    if (!phone || phone.length < 11) {
      setError('لطفاً شماره تلفن معتبر وارد کنید');
      return;
    }
    if (!phone.startsWith('09')) {
      setError('شماره تلفن باید با ۰۹ شروع شود');
      return;
    }
    
    try {
      setError('');
      const result = await sendOtp(phone);
      if (result.success) {
        if (result.devCode) {
          setDevCode(result.devCode);
        }
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال کد تایید');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      setError('لطفاً کد تایید را وارد کنید');
      return;
    }
    
    try {
      setError('');
      await loginWithPhone(phone, otp);
      
      // بعد از لاگین موفق، نقش کاربر را بررسی کن
      const { user } = useAuthStore.getState();
      
      if (user) {
        // تنظیم appMode بر اساس نقش
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
    } catch (err: any) {
      setError(err.message || 'کد تایید اشتباه است');
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#E7E2DA] flex flex-col selection:bg-[#D9A2B0] selection:text-[#173B3F]">
      <div className="flex justify-center w-full min-h-screen">
        <div className="w-full max-w-[430px] bg-[#F7F3EE] min-h-screen text-[#1C1C1C] relative flex flex-col shadow-[0_0_50px_rgba(23,59,63,0.18)] sm:rounded-[36px] overflow-hidden sm:border-[8px] sm:border-[#173B3F]">
          
          <div className="bg-gradient-to-bl from-[#173B3F] to-[#0B2626] p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/20">
              <span className="text-4xl">💎</span>
            </div>
            <h1 className="text-2xl font-extrabold mb-1">بویا</h1>
            <p className="text-sm text-white/70">پلتفرم جامع خدمات زیبایی</p>
          </div>

          <div className="flex-1 px-6 py-8">
            {step === 'phone' ? (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="text-lg font-bold text-[#173B3F] mb-1">ورود / ثبت‌نام</h2>
                  <p className="text-xs text-[#6C6C6C]">شماره تلفن همراه خود را وارد کنید</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#173B3F] mb-2 block">شماره تلفن همراه</label>
                  <div className="relative">
                    <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6C6C6C]" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="09123456789"
                      className="w-full bg-white border border-[#E7E2DA] rounded-xl py-3 pr-10 pl-4 text-sm placeholder:text-[#6C6C6C]/60 focus:outline-none focus:ring-2 focus:ring-[#173B3F]/20 focus:border-[#173B3F]/30 transition-all text-left"
                      dir="ltr"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-[#B35D67] bg-[#F8ECEE] p-2 rounded-lg">{error}</p>
                )}

                <button
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="w-full bg-[#173B3F] text-white font-bold py-3.5 rounded-xl hover:bg-[#0F3232] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'در حال ارسال...' : 'ارسال کد تایید'}
                </button>

                {devCode && (
                  <div className="p-3 bg-[#FBF4EC] border border-[#C99558]/30 rounded-xl text-center">
                    <p className="text-xs text-[#C99558] font-bold">کد توسعه‌دهنده: {devCode}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <button onClick={handleBack} className="flex items-center gap-1 text-xs text-[#173B3F] font-medium mb-4">
                  <ArrowLeft size={14} />
                  بازگشت
                </button>

                <div className="text-center mb-6">
                  <h2 className="text-lg font-bold text-[#173B3F] mb-1">تایید شماره تلفن</h2>
                  <p className="text-xs text-[#6C6C6C]">کد تایید ارسال شده به <span className="font-mono text-[#173B3F]">{phone}</span> را وارد کنید</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#173B3F] mb-2 block">کد تایید</label>
                  <div className="relative">
                    <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6C6C6C]" />
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="کد ۴ رقمی"
                      className="w-full bg-white border border-[#E7E2DA] rounded-xl py-3 pr-10 pl-4 text-sm placeholder:text-[#6C6C6C]/60 focus:outline-none focus:ring-2 focus:ring-[#173B3F]/20 focus:border-[#173B3F]/30 transition-all text-center text-lg font-bold tracking-widest"
                      maxLength={6}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-[#B35D67] bg-[#F8ECEE] p-2 rounded-lg">{error}</p>
                )}

                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading}
                  className="w-full bg-[#173B3F] text-white font-bold py-3.5 rounded-xl hover:bg-[#0F3232] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'در حال تایید...' : 'تایید و ورود'}
                </button>

                <p className="text-center text-[10px] text-[#6C6C6C]">
                  کد را دریافت نکردید؟ <button onClick={handleSendOtp} className="text-[#173B3F] font-bold">ارسال مجدد</button>
                </p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 text-center border-t border-[#E7E2DA]">
            <p className="text-[10px] text-[#6C6C6C]/60">
              با ورود به بویا، <span className="text-[#173B3F] font-medium">شرایط استفاده</span> و <span className="text-[#173B3F] font-medium">حریم خصوصی</span> را می‌پذیرید
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}