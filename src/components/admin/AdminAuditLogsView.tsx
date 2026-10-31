import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Info, Database, Lock, RefreshCw } from 'lucide-react';
import { AuditLogItem } from '../../data/marketplaceData';
import { toPersianDigits } from '../../utils/persianUtils';

interface AdminAuditLogsViewProps {
  logs: AuditLogItem[];
  onRefreshLogs?: () => void;
}

export const AdminAuditLogsView: React.FC<AdminAuditLogsViewProps> = ({
  logs,
  onRefreshLogs,
}) => {
  const [levelFilter, setLevelFilter] = useState('all');

  const filtered = logs.filter((l) => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#EEDCC5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#10B981]" />
            <h2 className="text-base font-bold text-[#1A2942]">
              لاگ‌های حسابرسی و امنیت چندمستأجری (RLS Audit Logs)
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            ثبت غیرقابل تغییر رویدادهای سیستمی، ارسال پیامک‌های OTP، تغییرات سطوح دسترسی و وضعیت جداول تفکیک‌شده
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs font-semibold focus:border-[#C59B27] outline-none"
          >
            <option value="all">همه سطوح رویداد</option>
            <option value="security">رویدادهای امنیتی (Security)</option>
            <option value="warning">هشدارها (Warning)</option>
            <option value="info">اطلاعات (Info)</option>
          </select>
        </div>
      </div>

      {/* RLS Status Banner */}
      <div className="bg-[#0B1B34] text-white p-4 rounded-2xl border border-[#C59B27]/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold block text-white">
              وضعیت حفاظت داده‌ها: FORCE ROW LEVEL SECURITY فعال است
            </span>
            <span className="text-[11px] text-[#8290AE]">
              نقش beauty_app بدون BYPASSRLS و جداسازی کامل مستاجران با GUC app.current_tenant_id (ADR-001)
            </span>
          </div>
        </div>

        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-500/40">
          تایید سلامت ۱۰۰٪
        </span>
      </div>

      {/* Audit Logs List */}
      <div className="bg-white rounded-2xl border border-[#EEDCC5] overflow-hidden shadow-xs">
        <div className="divide-y divide-[#F2EDE5]">
          {filtered.map((log) => (
            <div key={log.id} className="p-4 hover:bg-[#FAF7F2]/40 transition-colors space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {log.level === 'security' ? (
                    <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  ) : log.level === 'warning' ? (
                    <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                      <Info className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span className="font-mono font-bold text-xs text-[#1A2942]">
                    {log.action}
                  </span>
                </div>

                <span className="text-[11px] text-[#8290AE] font-medium">
                  {log.timestamp}
                </span>
              </div>

              <p className="text-xs text-[#44474D] pr-8 leading-relaxed">
                {log.details}
              </p>

              <div className="pr-8 pt-1 flex items-center gap-4 text-[10px] text-[#8290AE]">
                <span>عامل: <strong className="text-[#1A2942]">{log.actorName}</strong> ({log.actorRole})</span>
                <span>آدرس IP: <span className="font-mono">{log.ipAddress}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
