import React from 'react';
import { Search, ShieldCheck, Database, Radio, Bell, UserCog } from 'lucide-react';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { useDataStore } from '../../../shared/stores/dataStore';

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  pendingApprovalsCount: number;
  onNavigateToProfile?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  pendingApprovalsCount,
  onNavigateToProfile,
}) => {
  const { adminProfile } = useDataStore();

  return (
    <header className="bg-white border-b border-[#E7E2DA] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
      {/* Title */}
      <div>
        <h1 className="text-lg font-bold text-[#173B3F] font-serif leading-tight">
          {title}
        </h1>
        <p className="text-xs text-[#6C6C6C] mt-0.5">
          {subtitle}
        </p>
      </div>

      {/* Controls & Status Indicators */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-[#6C6C6C]" />
          <input
            type="text"
            placeholder="جستجوی سالن، کاربر یا تیکت..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pr-9 pl-3 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] focus:outline-none"
          />
        </div>

        {/* Server & DB Health Indicator */}
        <div className="hidden lg:flex items-center gap-2 bg-[#EAF2EF] px-3 py-1.5 rounded-xl border border-[#6F9A8D]/30 text-[11px] text-[#2E5E52]">
          <Database className="w-3.5 h-3.5 text-[#6F9A8D]" />
          <span className="font-semibold">PostgreSQL 16 & RLS: سالم</span>
          <span className="w-1 h-1 rounded-full bg-[#6F9A8D]" />
          <Radio className="w-3.5 h-3.5 text-[#C99558]" />
          <span className="font-semibold">ملی‌پیامک: فعال</span>
        </div>

        {/* Admin Profile Chip (Clickable) */}
        <button
          onClick={onNavigateToProfile}
          className="flex items-center gap-2 pr-2 border-r border-[#E7E2DA] hover:bg-[#FAF7F2] p-1 rounded-xl transition-all text-right group cursor-pointer"
          title="مشاهده و ویرایش پروفایل ادمین کل"
        >
          {adminProfile.avatarUrl ? (
            <img
              src={adminProfile.avatarUrl}
              alt={adminProfile.fullName}
              className="w-8 h-8 rounded-full object-cover border border-[#D9A2B0]/60 shadow-xs"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#173B3F] text-[#D9A2B0] flex items-center justify-center font-bold text-xs border border-[#D9A2B0]/40">
              ادمین
            </div>
          )}
          <div className="text-right">
            <span className="text-xs font-bold text-[#173B3F] block group-hover:text-[#0F3232]">
              {adminProfile.fullName || 'مهندس حسینی'}
            </span>
            <span className="text-[10px] text-[#6F9A8D] font-bold block -mt-0.5">
              {adminProfile.positionTitle || 'Super Admin'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
