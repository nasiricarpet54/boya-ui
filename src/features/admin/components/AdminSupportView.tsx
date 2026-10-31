import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useDataStore } from '../../../shared/stores/dataStore';
import { toPersianDigits } from '../../../shared/utils/persianUtils';

export const AdminSupportView: React.FC = () => {
  const { tickets, setTickets } = useDataStore();
  const [selectedTicketId, setSelectedTicketId] = useState<string>(tickets[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [adminReplyText, setAdminReplyText] = useState('');
  const [resolveOnReply, setResolveOnReply] = useState(false);

  const filteredTickets = tickets.filter(t => statusFilter === 'all' || t.status === statusFilter);
  const activeTicket = tickets.find(t => t.id === selectedTicketId) || filteredTickets[0];

  const onReplyTicket = (id: string, text: string, status: any = 'in_progress') => {
    setTickets(tickets.map(t => t.id === id ? {
      ...t, status, lastReply: text,
      messages: [...t.messages, { sender: 'admin', senderName: 'مدیر بویا', text, time: 'هم‌اکنون' }]
    } : t));
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeTicket) return;
    onReplyTicket(activeTicket.id, adminReplyText.trim(), resolveOnReply ? 'resolved' : 'in_progress');
    setAdminReplyText(''); setResolveOnReply(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border flex justify-between items-center">
        <h2 className="text-base font-bold">پشتیبانی و تیکتینگ</h2>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg p-2">
          <option value="all">همه تیکت‌ها</option>
          <option value="open">جدید</option>
          <option value="resolved">بسته شده</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[450px]">
        <div className="lg:col-span-4 bg-white rounded-2xl border p-2 space-y-2 overflow-y-auto max-h-[500px]">
          {filteredTickets.map(t => (
            <div key={t.id} onClick={() => setSelectedTicketId(t.id)} className={`p-3 rounded-xl border cursor-pointer ${selectedTicketId === t.id ? 'bg-[#FAF3E7] border-[#C59B27]' : 'bg-white'}`}>
              <div className="text-xs font-bold truncate">{t.title}</div>
              <div className="text-[10px] opacity-60">{t.userName} - {t.createdAt}</div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-8 bg-white rounded-2xl border p-5 flex flex-col justify-between">
          {activeTicket ? (
            <>
              <div className="border-b pb-3 mb-3 font-bold text-sm">{activeTicket.title}</div>
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[300px] p-1">
                {activeTicket.messages.map((m, i) => (
                  <div key={i} className={`p-3 rounded-2xl text-xs max-w-[85%] ${m.sender === 'admin' ? 'mr-auto bg-[#1A2942] text-white' : 'ml-auto bg-gray-100'}`}>
                    <p>{m.text}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendReply} className="space-y-2 pt-3 border-t">
                <textarea value={adminReplyText} onChange={e => setAdminReplyText(e.target.value)} className="w-full p-2 border rounded-xl text-xs" rows={2} placeholder="پاسخ..." required />
                <div className="flex justify-between items-center">
                   <label className="text-[10px] flex items-center gap-1"><input type="checkbox" checked={resolveOnReply} onChange={e => setResolveOnReply(e.target.checked)} /> بستن تیکت</label>
                   <button type="submit" className="bg-[#C59B27] px-4 py-1.5 rounded-lg text-xs font-bold"><Send className="w-3 h-3 inline" /> ارسال</button>
                </div>
              </form>
            </>
          ) : <div className="text-center opacity-40 py-20">انتخاب کنید</div>}
        </div>
      </div>
    </div>
  );
};
