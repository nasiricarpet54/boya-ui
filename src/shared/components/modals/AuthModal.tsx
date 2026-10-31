import { X, Loader2, Shield } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import React, { useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuthStore();

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await login();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError('ورود با گوگل ناموفق بود.');
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
            ورود به بویا
          </h2>
          <p className="text-center text-gray-600 text-sm mb-8">
            برای رزرو نوبت و دسترسی به پروفایل، با حساب گوگل خود وارد شوید.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs text-center mb-6 border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-14 bg-white border border-[#E7E2DA] text-[#173B3F] rounded-2xl font-bold text-base flex items-center justify-center gap-3 hover:bg-[#FAF7F2] transition-all disabled:opacity-50 shadow-sm"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                <span>ورود با حساب گوگل</span>
              </>
            )}
          </button>

          <p className="mt-8 text-[10px] text-[#6C6C6C] text-center leading-relaxed">
            با ورود به بویا، شما <span className="text-[#173B3F] font-bold">شرایط و قوانین</span> استفاده از پلتفرم را می‌پذیرید.
          </p>
        </div>
      </div>
    </div>
  );
};
