import React, { useState } from 'react';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminApprovalsView } from './AdminApprovalsView';
import { AdminTenantsView } from './AdminTenantsView';
import { AdminUsersView } from './AdminUsersView';
import { AdminSpecialistsView } from './AdminSpecialistsView';
import { AdminSupportView } from './AdminSupportView';
import { AdminAuditLogsView } from './AdminAuditLogsView';
import { AdminSettingsView } from './AdminSettingsView';
import { AdminSearchRankingView } from './AdminSearchRankingView';
import { AdminNotificationsView } from './AdminNotificationsView';
import { AdminProfileView } from './AdminProfileView';
import { useDataStore } from '../../../shared/stores/dataStore';
import { useUIStore } from '../../../shared/stores/uiStore';

export const AdminPanel: React.FC = () => {
  const { salons, bookings, users, tickets, auditLogs, notifications, updateSalon, updateBookingStatus } = useDataStore();
  const { setAppMode, setShowSplashScreen, setSplashAppName } = useUIStore();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const pendingApprovalsCount = (salons || []).filter((s: any) => !s.isApproved).length;
  const openTicketsCount = (tickets || []).filter((t: any) => t.status === 'open' || t.status === 'in_progress').length;
  const vipSalonsCount = (salons || []).filter((s: any) => s.isVip).length;
  const activeNotificationsCount = (notifications || []).filter((n) => n.isActive).length;

  const onSwitchToCustomerApp = () => {
    setSplashAppName('ورود به اپلیکیشن هوشمند مشتریان بویا');
    setShowSplashScreen(true);
    setAppMode('customer');
  };

  const onSwitchToSalonApp = () => {
    setSplashAppName('ورود به پنل جامع سالندار و متخصصین بویا');
    setShowSplashScreen(true);
    setAppMode('salon_panel');
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'پیشخوان و آمار کلی پلتفرم';
      case 'notifications': return 'مدیریت نوتیفیکیشن‌ها و پیام‌های تبلیغاتی';
      case 'approvals': return 'کارتابل تایید سالن‌ها و مدارک';
      case 'tenants': return 'مدیریت سالن‌ها و شعب (Tenants)';
      case 'search_ranking': return 'مدیریت چیدمان نتایج جستجو و سالن‌های VIP';
      case 'users': return 'کاربران، پرسنل و دسترسی‌ها';
      case 'specialists': return 'متخصصین زیبایی و خدمات سیار';
      case 'support': return 'میز مرکزی پشتیبانی و تیکتینگ';
      case 'audit_logs': return 'لاگ‌های امنیتی و حسابرسی چندمستأجری';
      case 'settings': return 'تنظیمات زیرساخت، پیامک و نقشه‌ها';
      case 'admin_profile': return 'ویرایش تمامی اطلاعات ادمین اصلی';
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'نمای ۳۶۰ درجه از شاخص‌های کلیدی عملکرد، رشد نوبت‌ها و شعب فعال';
      case 'notifications': return 'ارسال و مدیریت بنرهای درون‌برنامه‌ای، پیامک‌های انبوه و آفرهای تبلیغاتی به کاربران اپ مشتری و اپ سالن';
      case 'approvals': return 'بررسی اصالت پروانه کسب و استعلام جهت انتشار در اپلیکیشن بویا';
      case 'tenants': return 'فهرست کامل سالن‌های ثبتی به تفکیک استان و مدیریت تفکیک مستاجران';
      case 'search_ranking': return 'پیکربندی هوشمند سالن‌های ویژه VIP، پین کردن در صدر نتایج و تغییر ترتیب نمایش در جستجوی مشتری';
      case 'users': return 'فهرست کاربران احراز هویت شده با پیامک OTP و نقش‌های سازمانی';
      case 'specialists': return 'نظارت بر بیوتیشن‌ها و متخصصین خدمات در منزل (Mobile Service)';
      case 'support': return 'رسیدگی بلادرنگ به تیکت‌های ورودی از مشتریان و سالندارها';
      case 'audit_logs': return 'لاگ‌های امنیتی و حسابرسی چندمستأجری';
      case 'settings': return 'پیکربندی اتصال به ملی‌پیامک، کلیدهای نشان و فلگ‌های فاز ۲';
      case 'admin_profile': return 'مدیریت مشخصات هویتی، اطلاعات تماس اضطراری، بیوگرافی و اعلانات امنیتی مدیر ارشد پلتفرم';
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F5F0E8] overflow-hidden text-[#1D1C17] antialiased">
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        openTicketsCount={openTicketsCount}
        vipSalonsCount={vipSalonsCount}
        activeNotificationsCount={activeNotificationsCount}
        onSwitchToCustomerApp={onSwitchToCustomerApp}
        onSwitchToSalonApp={onSwitchToSalonApp}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader
          title={getTabTitle()}
          subtitle={getTabSubtitle()}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          pendingApprovalsCount={pendingApprovalsCount}
          onNavigateToProfile={() => setActiveTab('admin_profile')}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'dashboard' && (
            <AdminDashboardView
              onNavigateToTab={setActiveTab}
            />
          )}

          {activeTab === 'notifications' && (
            <AdminNotificationsView />
          )}

          {activeTab === 'approvals' && (
            <AdminApprovalsView />
          )}

          {activeTab === 'tenants' && (
            <AdminTenantsView />
          )}

          {activeTab === 'search_ranking' && (
            <AdminSearchRankingView />
          )}

          {activeTab === 'users' && (
            <AdminUsersView />
          )}

          {activeTab === 'specialists' && (
            <AdminSpecialistsView />
          )}

          {activeTab === 'support' && (
            <AdminSupportView />
          )}

          {activeTab === 'audit_logs' && (
            <AdminAuditLogsView />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsView />
          )}

          {activeTab === 'admin_profile' && (
            <AdminProfileView />
          )}
        </main>
      </div>
    </div>
  );
};
