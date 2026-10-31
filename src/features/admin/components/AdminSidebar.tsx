import React from 'react';
import {
  LayoutDashboard,
  CheckCircle2,
  Building2,
  Users,
  Scissors,
  LifeBuoy,
  ShieldAlert,
  Settings,
  ArrowRight,
  Sparkles,
  Store,
  UserCheck,
  Crown,
  Bell,
  UserCog,
} from 'lucide-react';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { BoyaLogo } from '../../../shared/components/ui/BoyaLogo';

export type AdminTab =
  | 'dashboard'
  | 'approvals'
  | 'tenants'
  | 'search_ranking'
  | 'notifications'
  | 'users'
  | 'specialists'
  | 'support'
  | 'audit_logs'
  | 'settings'
  | 'admin_profile';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingApprovalsCount: number;
  openTicketsCount: number;
  vipSalonsCount?: number;
  activeNotificationsCount?: number;
  onSwitchToCustomerApp: () => void;
  onSwitchToSalonApp: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingApprovalsCount,
  openTicketsCount,
  vipSalonsCount = 0,
  activeNotificationsCount = 0,
  onSwitchToCustomerApp,
  onSwitchToSalonApp,
}) => {
  const menuItems: { id: AdminTab; label: string; icon: React.ElementType; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'پیشخوان نظارتی کل', icon: LayoutDashboard },
    {
      id: 'notifications',
      label: 'اعلانات و پیام‌های تبلیغاتی',
      icon: Bell,
      badge: activeNotificationsCount,
      badgeColor: 'bg-[#D9A2B0] text-[#173B3F] font-bold',
    },
    {
      id: 'approvals',
      label: 'تایید مدارک و سالن‌ها',
      icon: CheckCircle2,
      badge: pendingApprovalsCount,
      badgeColor: 'bg-[#C99558] text-[#173B3F] font-bold',
    },
    { id: 'tenants', label: 'مدیریت سالن‌ها (Tenants)', icon: Building2 },
    {
      id: 'search_ranking',
      label: 'ترتیب نتایج و سالن‌های VIP',
      icon: Crown,
      badge: vipSalonsCount,
      badgeColor: 'bg-[#C99558] text-[#173B3F] font-black',
    },
    { id: 'users', label: 'کاربران و تخصیص نقش‌ها', icon: Users },
    { id: 'specialists', label: 'متخصصین و خدمات سیار', icon: Scissors },
    {
      id: 'support',
      label: 'میز تیکت‌های پشتیبانی',
      icon: LifeBuoy,
      badge: openTicketsCount,
      badgeColor: 'bg-[#6F9A8D] text-white',
    },
    { id: 'audit_logs', label: 'لاگ‌های امنیتی و RLS', icon: ShieldAlert },
    { id: 'settings', label: 'تنظیمات و درگاه پیامک', icon: Settings },
    { id: 'admin_profile', label: 'اطلاعات ادمین اصلی', icon: UserCog },
  ];

  return (
    <aside className="w-64 bg-[#0F3232] text-white flex flex-col justify-between shrink-0 border-l border-[#173B3F] select-none shadow-xl">
      {/* Brand & System Title */}
      <div>
        <div className="p-4 border-b border-[#173B3F] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white p-1 border border-white/20 shadow-md flex items-center justify-center shrink-0">
              <img
                src="/assets/aistudio/IMG_20261031_121115_770_79cc90aa.png"
                alt="BOYA"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif font-black text-base text-white">بویا ادمین</span>
                <span className="text-[10px] text-[#D9A2B0] font-mono font-bold tracking-wider">PANEL</span>
              </div>
              <span className="text-[10px] text-[#E8F0EF]/80 block -mt-0.5">سامانه جامع مدیریت پلتفرم</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all text-right ${
                  isActive
                    ? 'bg-[#D9A2B0] text-[#173B3F] shadow-md shadow-[#D9A2B0]/20 font-bold'
                    : 'text-[#E8F0EF] hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#173B3F]' : 'text-[#6F9A8D]'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-[#173B3F] text-white' : item.badgeColor || 'bg-white/20 text-white'
                    }`}
                  >
                    {toPersianDigits(item.badge)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Switch to Apps Footer Shortcuts */}
      <div className="p-4 border-t border-[#173B3F] bg-black/25 space-y-2">
        <span className="text-[10px] text-[#E8F0EF]/70 block font-medium">سوییچ سریع به اپلیکیشن‌ها:</span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onSwitchToCustomerApp}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] text-[#E8F0EF] transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#D9A2B0]" />
            <span>اپ مشتری</span>
          </button>

          <button
            onClick={onSwitchToSalonApp}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] text-[#E8F0EF] transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-[#C99558]" />
            <span>پنل سالندار</span>
          </button>
        </div>

        <div className="pt-2 text-[10px] text-[#E8F0EF]/60 flex items-center justify-between border-t border-white/5">
          <span>نسخه: 1.2.0-beta</span>
          <span className="flex items-center gap-1 text-[#6F9A8D] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6F9A8D] animate-pulse" />
            سیستم آنلاین
          </span>
        </div>
      </div>
    </aside>
  );
};
