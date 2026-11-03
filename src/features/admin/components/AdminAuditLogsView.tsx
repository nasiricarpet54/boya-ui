import React, { useState } from 'react';
import { useDataStore } from '../../../shared/stores/dataStore';
import { toPersianDigits } from '../../../shared/utils/persianUtils';

export const AdminAuditLogsView: React.FC = () => {
  const { auditLogs } = useDataStore();
  const [levelFilter, setLevelFilter] = useState('all');

  const filtered = auditLogs.filter(l => levelFilter === 'all' || l.level === levelFilter);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border flex justify-between items-center">
        <h2 className="text-base font-bold text-[#1A2942]">لاگ‌های امنیت و حسابرسی</h2>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="text-xs border rounded-lg p-2">
          <option value="all">همه سطوح</option>
          <option value="security">امنیت</option>
          <option value="warning">هشدار</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden shadow-xs">
        <div className="divide-y">
          {filtered.map((log) => (
            <div key={log.id} className="p-4 hover:bg-[#FAF7F2]/40 space-y-1 text-xs">
              <div className="flex justify-between font-mono font-bold">
                <span>{log.action}</span>
                <span className="font-normal opacity-60">{log.timestamp}</span>
              </div>
              <p className="opacity-80">{log.details}</p>
              <div className="text-[10px] opacity-60">عامل: {log.actorName} - {log.ipAddress}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
