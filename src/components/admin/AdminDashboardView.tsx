import React from 'react';
import {
  Building2,
  Users,
  CalendarCheck,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Salon, Booking, PlatformUser, AuditLogItem } from '../../data/marketplaceData';
import { formatPrice, toPersianDigits } from '../../utils/persianUtils';

interface AdminDashboardViewProps {
  salons: Salon[];
  bookings: Booking[];
  users: PlatformUser[];
  auditLogs: AuditLogItem[];
  onApproveTenant: (tenantId: string) => void;
  onRejectTenant: (tenantId: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  salons,
  bookings,
  users,
  auditLogs,
  onApproveTenant,
  onRejectTenant,
  onNavigateToTab,
}) => {
  const activeTenants = salons.filter((s) => s.isApproved);
  const pendingTenants = salons.filter((s) => !s.isApproved);
  const totalRevenue = bookings.reduce((sum, b) => (b.status !== 'cancelled' ? sum + b.price : sum), 0);

  return (
    <div className="space-y-6">
      {/* 4 Major KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tenants */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#6C6C6C]">
            <span className="text-xs font-semibold text-[#173B3F]">سالن‌ها و شعب فعال</span>
            <div className="w-8 h-8 rounded-xl bg-[#E8F0EF] text-[#173B3F] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-serif text-[#173B3F]">
              {toPersianDigits(activeTenants.length)}
            </span>
            {pendingTenants.length > 0 && (
              <span className="text-[11px] font-bold text-[#8C5526] bg-[#FBF4EC] px-2 py-0.5 rounded-full border border-[#C99558]/30">
                {toPersianDigits(pendingTenants.length)} در صف تایید
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#6C6C6C] block">در ۳ استان (تهران، فارس، اصفهان)</span>
        </div>

        {/* Card 2: Users */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#6C6C6C]">
            <span className="text-xs font-semibold text-[#173B3F]">کل کاربران ثبت‌شده</span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF2EF] text-[#6F9A8D] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-serif text-[#173B3F]">
              {toPersianDigits(users.length)}
            </span>
            <span className="text-[11px] font-bold text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full">
              احراز هویت شده
            </span>
          </div>
          <span className="text-[10px] text-[#6C6C6C] block">مشتری، سالندار و بیوتیشن</span>
        </div>

        {/* Card 3: Total Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#6C6C6C]">
            <span className="text-xs font-semibold text-[#173B3F]">نوبت‌های رزرو شده</span>
            <div className="w-8 h-8 rounded-xl bg-[#EDF4F5] text-[#5E8B95] flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-serif text-[#173B3F]">
              {toPersianDigits(bookings.length)}
            </span>
            <span className="text-[11px] font-bold text-[#24545F] bg-[#EDF4F5] px-2 py-0.5 rounded-full">
              بدون تداخل (GiST OK)
            </span>
          </div>
          <span className="text-[10px] text-[#6C6C6C] block">تاییدیه پیامک ملی‌پیامک</span>
        </div>

        {/* Card 4: GMV Revenue Estimate */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#6C6C6C]">
            <span className="text-xs font-semibold text-[#173B3F]">گردش ناخالص خدمات (GMV)</span>
            <div className="w-8 h-8 rounded-xl bg-[#F8ECEE] text-[#B35D67] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-black font-serif text-[#173B3F]">
              {formatPrice(totalRevenue)}
            </span>
          </div>
          <span className="text-[10px] text-[#C99558] font-bold block">Phase 1: ویترین رایگان</span>
        </div>
      </div>

      {/* Pending Approvals Section if any */}
      {pendingTenants.length > 0 && (
        <div className="bg-[#FBF4EC] rounded-2xl p-5 border border-[#C99558]/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#C99558]" />
              <h3 className="text-sm font-bold text-[#173B3F]">
                درخواست‌های جدید پیوستن سالن به پلتفرم بویا ({toPersianDigits(pendingTenants.length)})
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('approvals')}
              className="text-xs font-bold text-[#173B3F] hover:underline"
            >
              مشاهده صف کامل تاییدات
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingTenants.map((t) => (
              <div
                key={t.id}
                className="bg-white p-4 rounded-xl border border-[#E7E2DA] flex flex-col justify-between space-y-2 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#173B3F]">{t.name}</span>
                    <span className="text-[10px] text-[#6C6C6C]">{t.city}</span>
                  </div>
                  <span className="text-[11px] text-[#6C6C6C] block mt-0.5">
                    مالک: {t.ownerName} ({toPersianDigits(t.ownerPhone)})
                  </span>
                  <p className="text-[10px] text-[#6C6C6C] mt-1">{t.address}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E2DA]/60">
                  <button
                    onClick={() => onRejectTenant(t.id)}
                    className="px-3 py-1 rounded-lg border border-[#B35D67]/30 text-[#B35D67] text-xs font-medium hover:bg-[#F8ECEE]"
                  >
                    رد مدارک
                  </button>
                  <button
                    onClick={() => onApproveTenant(t.id)}
                    className="px-4 py-1 rounded-lg bg-[#6F9A8D] text-white text-xs font-bold hover:bg-[#5a8075] shadow-xs"
                  >
                    تایید رسمی سالن
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2-Columns: Recent Bookings & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Live Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-3">
            <h3 className="text-sm font-bold text-[#173B3F]">
              آخرین نوبت‌های ثبت شده در سیستم
            </h3>
            <button
              onClick={() => onNavigateToTab('tenants')}
              className="text-xs text-[#173B3F] font-bold hover:underline"
            >
              مدیریت نوبت‌ها
            </button>
          </div>

          <div className="space-y-2.5">
            {bookings.map((bkg) => (
              <div
                key={bkg.id}
                className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E7E2DA] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-[#173B3F]">
                    <span>{bkg.customerName}</span>
                    <span className="text-[10px] font-mono text-[#6C6C6C]">({toPersianDigits(bkg.trackingCode)})</span>
                  </div>
                  <span className="text-[11px] text-[#173B3F] block mt-0.5">
                    {bkg.serviceName} در {bkg.salonName}
                  </span>
                  <span className="text-[10px] text-[#6C6C6C] block">
                    {bkg.date} - ساعت {toPersianDigits(bkg.time)}
                  </span>
                </div>
                <div className="text-left">
                  <span className="font-bold text-[#173B3F] block">{formatPrice(bkg.price)}</span>
                  <span className="text-[10px] text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full font-bold">
                    {bkg.status === 'confirmed' ? 'تایید پیامکی' : 'تکمیل شده'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: System Audit Trail */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#6F9A8D]" />
              <h3 className="text-sm font-bold text-[#173B3F]">
                لاگ‌های امنیتی و رویدادهای زنده سیستم
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('audit_logs')}
              className="text-xs text-[#173B3F] font-bold hover:underline"
            >
              مشاهده تمام لاگ‌ها
            </button>
          </div>

          <div className="space-y-2.5">
            {auditLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-[#E7E2DA] bg-white text-xs space-y-1 hover:border-[#173B3F]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[11px] text-[#173B3F]">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-[#6C6C6C]">{log.timestamp}</span>
                </div>
                <p className="text-[11px] text-[#6C6C6C] leading-relaxed">
                  {log.details}
                </p>
                <div className="text-[10px] text-[#6C6C6C] flex items-center justify-between pt-1">
                  <span>عامل: {log.actorName}</span>
                  <span className="font-mono">{log.ipAddress}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
