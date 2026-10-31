import React from 'react';
import { Navigate, useLocation } from '@tanstack/react-router';
import { useAuthStore, UserRole } from '../../stores/authStore';
import { useModalStore } from '../../stores/modalStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, setAuth } = useAuthStore();
  const { openAuthModal } = useModalStore();
  const location = useLocation();

  const handleQuickAdminLogin = () => {
    setAuth({
      id: 1,
      uid: 'admin-super-1',
      fullName: 'مهندس حسینی (مدیر ارشد)',
      role: 'super_admin',
      phone: '09123456789',
      email: 'admin@boya.ir'
    }, 'token_super_admin_mock');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-center p-6 bg-white rounded-3xl shadow-sm border border-[#E7E2DA] m-4" dir="rtl">
        <div className="w-16 h-16 bg-[#F7F3EE] rounded-full flex items-center justify-center mb-4 border border-[#E7E2DA]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#173B3F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-xl font-extrabold text-[#173B3F] mb-2">شما هنوز وارد سامانه نشده اید</h3>
        <p className="text-xs text-[#6C6C6C] mb-6">برای دسترسی به پنل مدیریت و امکانات سامانه بویا، لطفاً وارد حساب کاربری خود شوید یا از ورود سریع ادمین استفاده کنید.</p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button 
            onClick={() => openAuthModal()}
            className="flex-1 bg-[#173B3F] text-white px-6 py-3 rounded-2xl font-bold text-xs shadow-sm hover:bg-[#122e31] transition-all cursor-pointer"
          >
            ورود با شماره موبایل
          </button>
          <button 
            onClick={handleQuickAdminLogin}
            className="flex-1 bg-[#D9A2B0]/30 text-[#173B3F] border border-[#D9A2B0] px-6 py-3 rounded-2xl font-bold text-xs hover:bg-[#D9A2B0]/50 transition-all cursor-pointer"
          >
            ورود سریع ادمین کل
          </button>
        </div>
      </div>
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const isSuperAdmin = user.role === 'super_admin';
    const isSpecialist = user.role === 'salon_specialist' || user.role === 'mobile_specialist' || user.role === 'line_manager';
    const isSalonAdmin = user.role === 'salon_admin';

    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-[#E7E2DA] shadow-sm m-4 max-w-md mx-auto" dir="rtl">
        <div className="w-16 h-16 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#173B3F] mb-2">سطح دسترسی ایزوله شده</h2>
        <p className="text-xs text-[#6C6C6C] mb-6 leading-relaxed">
          {isSuperAdmin && 'ادمین اصلی طبق قوانین امنیتی سیستم، فقط در پنل اختصاصی ادمین کل (/admin) به تمامی اطلاعات دسترسی دارد.'}
          {isSpecialist && 'متخصصین محترم فقط به پنل اختصاصی خدمات، نوبت‌ها و تقویم کاری خود در بخش /salon-admin دسترسی دارند.'}
          {isSalonAdmin && 'مدیران سالن فقط به پنل مدیریت سالن و کادر پرسنل خود در بخش /salon-admin دسترسی دارند.'}
          {!isSuperAdmin && !isSpecialist && !isSalonAdmin && 'حساب کاربری مشتریان به پنل‌های مدیریتی دسترسی ندارد.'}
        </p>

        {isSuperAdmin ? (
          <a 
            href="/admin"
            className="inline-block bg-[#173B3F] text-white px-8 py-3 rounded-2xl font-bold text-xs shadow-md hover:bg-[#122e31] transition-all cursor-pointer"
          >
            ورود به پنل اختصاصی ادمین کل
          </a>
        ) : isSpecialist || isSalonAdmin ? (
          <a 
            href="/salon-admin"
            className="inline-block bg-[#173B3F] text-white px-8 py-3 rounded-2xl font-bold text-xs shadow-md hover:bg-[#122e31] transition-all cursor-pointer"
          >
            ورود به پنل اختصاصی
          </a>
        ) : (
          <a 
            href="/"
            className="inline-block bg-[#173B3F] text-white px-8 py-3 rounded-2xl font-bold text-xs shadow-md hover:bg-[#122e31] transition-all cursor-pointer"
          >
            بازگشت به برنامه مشتریان
          </a>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

interface RoleGuardProps {
  children: React.ReactNode;
  roles: UserRole[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, roles, fallback = null }) => {
  const { user } = useAuthStore();

  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
