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
import { Salon, Booking, PlatformUser, SupportTicket, AuditLogItem } from '../../data/marketplaceData';

interface AdminPanelProps {
  salons: Salon[];
  bookings: Booking[];
  users: PlatformUser[];
  tickets: SupportTicket[];
  auditLogs: AuditLogItem[];
  onApproveTenant: (tenantId: string) => void;
  onRejectTenant: (tenantId: string) => void;
  onToggleTenantStatus: (tenantId: string) => void;
  onUpdateSalonPriority: (salonId: string, updates: Partial<Salon>) => void;
  onUpdateUserRole: (userId: string, newRole: any) => void;
  onToggleUserStatus: (userId: string) => void;
  onAddUser: (user: PlatformUser) => void;
  onToggleSpecialistVerified: (specialistId: string) => void;
  onReplyTicket: (ticketId: string, replyText: string, newStatus?: 'in_progress' | 'resolved') => void;
  onSwitchToCustomerApp: () => void;
  onSwitchToSalonApp: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  salons,
  bookings,
  users,
  tickets,
  auditLogs,
  onApproveTenant,
  onRejectTenant,
  onToggleTenantStatus,
  onUpdateSalonPriority,
  onUpdateUserRole,
  onToggleUserStatus,
  onAddUser,
  onToggleSpecialistVerified,
  onReplyTicket,
  onSwitchToCustomerApp,
  onSwitchToSalonApp,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const pendingApprovalsCount = salons.filter((s) => !s.isApproved).length;
  const openTicketsCount = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const vipSalonsCount = salons.filter((s) => s.isVip).length;

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'پیشخوان و آمار کلی پلتفرم';
      case 'approvals':
        return 'کارتابل تایید سالن‌ها و مدارک';
      case 'tenants':
        return 'مدیریت سالن‌ها و شعب (Tenants)';
      case 'search_ranking':
        return 'مدیریت چیدمان نتایج جستجو و سالن‌های VIP';
      case 'users':
        return 'کاربران، پرسنل و دسترسی‌ها';
      case 'specialists':
        return 'متخصصین زیبایی و خدمات سیار';
      case 'support':
        return 'میز مرکزی پشتیبانی و تیکتینگ';
      case 'audit_logs':
        return 'لاگ‌های امنیتی و حسابرسی چندمستأجری';
      case 'settings':
        return 'تنظیمات زیرساخت، پیامک و نقشه‌ها';
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'نمای ۳۶۰ درجه از شاخص‌های کلیدی عملکرد، رشد نوبت‌ها و شعب فعال';
      case 'approvals':
        return 'بررسی اصالت پروانه کسب و استعلام جهت انتشار در اپلیکیشن بویا';
      case 'tenants':
        return 'فهرست کامل سالن‌های ثبتی به تفکیک استان و مدیریت تفکیک مستاجران';
      case 'search_ranking':
        return 'پیکربندی هوشمند سالن‌های ویژه VIP، پین کردن در صدر نتایج و تغییر ترتیب نمایش در جستجوی مشتری';
      case 'users':
        return 'فهرست کاربران احراز هویت شده با پیامک OTP و نقش‌های سازمانی';
      case 'specialists':
        return 'نظارت بر بیوتیشن‌ها و متخصصین خدمات در منزل (Mobile Service)';
      case 'support':
        return 'رسیدگی بلادرنگ به تیکت‌های ورودی از مشتریان و سالندارها';
      case 'audit_logs':
        return 'ردپای غیرقابل تغییر کلیه تراکنش‌ها، لاگین‌ها و بررسی امنیت RLS';
      case 'settings':
        return 'پیکربندی اتصال به ملی‌پیامک، کلیدهای نشان و فلگ‌های فاز ۲';
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F5F0E8] overflow-hidden text-[#1D1C17] antialiased">
      {/* Admin Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        openTicketsCount={openTicketsCount}
        vipSalonsCount={vipSalonsCount}
        onSwitchToCustomerApp={onSwitchToCustomerApp}
        onSwitchToSalonApp={onSwitchToSalonApp}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Admin Header */}
        <AdminHeader
          title={getTabTitle()}
          subtitle={getTabSubtitle()}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        {/* Tab Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'dashboard' && (
            <AdminDashboardView
              salons={salons}
              bookings={bookings}
              users={users}
              auditLogs={auditLogs}
              onApproveTenant={onApproveTenant}
              onRejectTenant={onRejectTenant}
              onNavigateToTab={setActiveTab}
            />
          )}

          {activeTab === 'approvals' && (
            <AdminApprovalsView
              salons={salons}
              onApproveTenant={onApproveTenant}
              onRejectTenant={onRejectTenant}
            />
          )}

          {activeTab === 'tenants' && (
            <AdminTenantsView
              salons={salons}
              onToggleTenantStatus={onToggleTenantStatus}
            />
          )}

          {activeTab === 'search_ranking' && (
            <AdminSearchRankingView
              salons={salons}
              onUpdateSalonPriority={onUpdateSalonPriority}
            />
          )}

          {activeTab === 'users' && (
            <AdminUsersView
              users={users}
              onUpdateUserRole={onUpdateUserRole}
              onToggleUserStatus={onToggleUserStatus}
              onAddUser={onAddUser}
            />
          )}

          {activeTab === 'specialists' && (
            <AdminSpecialistsView
              salons={salons}
              onToggleSpecialistVerified={onToggleSpecialistVerified}
            />
          )}

          {activeTab === 'support' && (
            <AdminSupportView
              tickets={tickets}
              onReplyTicket={onReplyTicket}
            />
          )}

          {activeTab === 'audit_logs' && (
            <AdminAuditLogsView logs={auditLogs} />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsView />
          )}
        </main>
      </div>
    </div>
  );
};
