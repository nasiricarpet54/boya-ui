import React from 'react';
import { Navigate, useLocation } from '@tanstack/react-router';
import { useAuthStore, UserRole } from '../../stores/authStore';
import { useModalStore } from '../../stores/modalStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const { openAuthModal } = useModalStore();
  const location = useLocation();

  React.useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal();
    }
  }, [isAuthenticated, openAuthModal]);

  if (!isAuthenticated) {
    // Show a blank state or a "please login" message while modal is open
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6" dir="rtl">
        <div className="w-16 h-16 bg-[#F7F3EE] rounded-full flex items-center justify-center mb-4 border border-[#E7E2DA]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#173B3F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[#173B3F] mb-2">نیاز به ورود</h3>
        <p className="text-sm text-[#6C6C6C] mb-6">برای مشاهده این بخش باید ابتدا وارد حساب کاربری خود شوید.</p>
        <button 
          onClick={() => openAuthModal()}
          className="bg-[#173B3F] text-white px-8 py-2.5 rounded-full font-bold text-xs"
        >
          ورود به حساب
        </button>
      </div>
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Role not authorized
    return (
      <div className="p-8 text-center bg-red-50 text-red-700 rounded-lg border border-red-200 m-4">
        <h2 className="text-xl font-bold mb-2">عدم دسترسی</h2>
        <p>شما اجازه دسترسی به این بخش را ندارید.</p>
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
