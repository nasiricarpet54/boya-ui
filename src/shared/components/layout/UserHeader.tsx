import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useModalStore } from '../../stores/modalStore';

export const UserHeader: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { setAppMode } = useUIStore();
  const { openAuthModal } = useModalStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={() => openAuthModal()}
        className="text-xs font-bold text-[#173B3F] bg-[#D9A2B0]/20 hover:bg-[#D9A2B0]/30 px-4 py-2 rounded-full border border-[#D9A2B0]/40 transition-all cursor-pointer shadow-xs"
      >
        ورود / ثبت‌نام
      </button>
    );
  }

  const roleFa = 
    user.role === 'super_admin' ? 'مدیر کل سیستم' :
    user.role === 'salon_admin' ? 'مدیر سالن' :
    user.role === 'salon_specialist' ? 'متخصص سالن' :
    user.role === 'mobile_specialist' ? 'متخصص سیار' :
    user.role === 'line_manager' ? 'مدیر لاین' : 'مشتری';

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    setAppMode('customer');
    navigate({ to: '/' });
  };

  const handleNavigateProfile = () => {
    setIsOpen(false);
    navigate({ to: '/profile' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-white hover:bg-[#FAF7F2] border border-[#E7E2DA] px-3 py-1.5 rounded-2xl transition-all cursor-pointer shadow-xs group"
        title="منوی کاربری"
      >
        <div className="w-8 h-8 rounded-xl bg-[#173B3F] text-[#D9A2B0] flex items-center justify-center font-bold text-xs border border-[#D9A2B0]/40 overflow-hidden shadow-xs">
          {user.fullName?.charAt(0) || 'ک'}
        </div>
        <div className="hidden sm:block text-right">
          <span className="text-xs font-bold text-[#173B3F] block group-hover:text-[#0F3232]">{user.fullName}</span>
          <span className="text-[10px] text-[#6F9A8D] font-bold block">{roleFa}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#6C6C6C] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#E7E2DA] py-2 z-50 animate-fadeIn" dir="rtl">
          <div className="px-4 py-2.5 border-b border-[#E7E2DA] mb-1">
            <span className="text-xs font-bold text-[#173B3F] block truncate">{user.fullName}</span>
            <span className="text-[10px] text-[#6C6C6C] block truncate">{user.phone}</span>
          </div>

          <button
            onClick={handleNavigateProfile}
            className="w-full px-4 py-2 text-right text-xs font-bold text-[#173B3F] hover:bg-[#FAF7F2] flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <User className="w-4 h-4 text-[#6F9A8D]" />
            <span>پروفایل من</span>
          </button>

          {user.role === 'super_admin' && (
            <button
              onClick={() => { setIsOpen(false); navigate({ to: '/admin' }); }}
              className="w-full px-4 py-2 text-right text-xs font-bold text-[#173B3F] hover:bg-[#FAF7F2] flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#C99558]" />
              <span>پنل مدیریت کل</span>
            </button>
          )}

          <div className="border-t border-[#E7E2DA] my-1" />

          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-right text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>خروج از حساب</span>
          </button>
        </div>
      )}
    </div>
  );
};
