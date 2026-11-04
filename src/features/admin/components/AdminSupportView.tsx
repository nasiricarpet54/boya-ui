import React, { useState, useEffect } from 'react';
import { Send, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useDataStore } from '../../../shared/stores/dataStore';
import { useUIStore } from '../../../shared/stores/uiStore';
import { toPersianDigits, formatJalaliDate } from '../../../shared/utils/persianUtils';
import api from '../../../shared/api/apiClient';

interface ApiTicketMessage {
  id: number;
  ticketId: number;
  senderId: number;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface ApiTicket {
  id: number | string;
  userId?: number;
  ticketCode?: string;
  subject?: string;
  title?: string;
  category?: string;
  priority?: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt?: string;
  updatedAt?: string;
  messages?: ApiTicketMessage[] | any[];
  userName?: string;
}

export const AdminSupportView: React.FC = () => {
  const { tickets: mockTickets, setTickets: setMockTickets } = useDataStore();
  const { showToast } = useUIStore();
  
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTicketId, setSelectedTicketId] = useState<number | string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [adminReplyText, setAdminReplyText] = useState('');
  const [resolveOnReply, setResolveOnReply] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/tickets');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setTickets(res.data);
        if (!selectedTicketId || !res.data.some((t: any) => String(t.id) === String(selectedTicketId))) {
          setSelectedTicketId(res.data[0].id);
        }
      } else {
        // Fall back to mock tickets if no DB tickets exist yet
        setTickets(mockTickets);
        if (!selectedTicketId && mockTickets.length > 0) {
          setSelectedTicketId(mockTickets[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin tickets from API:', err);
      setTickets(mockTickets);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const filteredTickets = tickets.filter(t => statusFilter === 'all' || t.status === statusFilter);
  const activeTicket = tickets.find(t => String(t.id) === String(selectedTicketId)) || filteredTickets[0];

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeTicket) return;

    try {
      setIsSending(true);
      // If active ticket is in PostgreSQL (numeric ID)
      if (typeof activeTicket.id === 'number' || !isNaN(Number(activeTicket.id))) {
        await api.post(`/tickets/${activeTicket.id}/messages`, {
          message: adminReplyText.trim(),
        });

        if (resolveOnReply) {
          await api.patch(`/tickets/${activeTicket.id}/status`, {
            status: 'resolved',
          });
        }
      }

      // Also update local / fallback store
      setTickets(prev => prev.map(t => {
        if (String(t.id) === String(activeTicket.id)) {
          const newMsg = {
            id: Date.now(),
            ticketId: Number(t.id),
            senderId: 1,
            senderRole: 'super_admin',
            message: adminReplyText.trim(),
            text: adminReplyText.trim(),
            sender: 'admin',
            senderName: 'مدیر بویا',
            createdAt: new Date().toISOString(),
          };
          return {
            ...t,
            status: resolveOnReply ? 'resolved' : 'in_progress',
            messages: [...(t.messages || []), newMsg],
          };
        }
        return t;
      }));

      showToast(resolveOnReply ? 'پاسخ ارسال شد و تیکت بسته شد.' : 'پاسخ با موفقیت به کاربر ارسال شد.');
      setAdminReplyText('');
      setResolveOnReply(false);
      await fetchTickets();
    } catch (err: any) {
      console.error('Error replying to ticket:', err);
      showToast('خطا در ارسال پاسخ تیکت.');
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: 'open' | 'in_progress' | 'resolved') => {
    if (!activeTicket) return;
    try {
      if (typeof activeTicket.id === 'number' || !isNaN(Number(activeTicket.id))) {
        await api.patch(`/tickets/${activeTicket.id}/status`, { status: newStatus });
      }
      setTickets(prev => prev.map(t => String(t.id) === String(activeTicket.id) ? { ...t, status: newStatus } : t));
      showToast(`وضعیت تیکت تغییر یافت.`);
      await fetchTickets();
    } catch (err) {
      console.error('Failed to change ticket status:', err);
      showToast('خطا در تغییر وضعیت تیکت.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-wrap justify-between items-center gap-3 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-gray-900 font-serif">پشتیبانی و تیکتینگ کاربران</h2>
          <p className="text-xs text-gray-500 mt-0.5">رسیدگی به پیام‌ها، شکایات و درخواست‌های پشتیبانی</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTickets}
            disabled={isLoading}
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            title="به‌روزرسانی تیکت‌ها"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs border border-gray-200 rounded-xl p-2 bg-white text-gray-700 outline-none font-bold"
          >
            <option value="all">همه تیکت‌ها</option>
            <option value="open">جدید / باز</option>
            <option value="in_progress">در حال بررسی</option>
            <option value="resolved">بسته شده</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[480px]">
        {/* Tickets List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-3 space-y-2 overflow-y-auto max-h-[550px] shadow-xs">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#173B3F]" />
              <span className="text-xs">در حال بارگذاری تیکت‌ها...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-xs">
              تیکتی در این وضعیت یافت نشد.
            </div>
          ) : (
            filteredTickets.map(t => {
              const isSelected = activeTicket && String(activeTicket.id) === String(t.id);
              const lastMsg = t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1] : null;
              const preview = lastMsg ? (lastMsg.message || lastMsg.text) : '';
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#173B3F]/5 border-[#173B3F] text-[#173B3F]'
                      : 'bg-white border-gray-100 hover:border-gray-300 text-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold truncate">{t.subject || t.title}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ${
                      t.status === 'resolved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : t.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {t.status === 'resolved' ? 'بسته شده' : t.status === 'in_progress' ? 'در بررسی' : 'جدید'}
                    </span>
                  </div>
                  {t.ticketCode && (
                    <span className="text-[10px] text-gray-400 font-mono block mb-1">
                      {t.ticketCode}
                    </span>
                  )}
                  {preview && (
                    <p className="text-[11px] text-gray-500 line-clamp-1">{preview}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Active Ticket Conversation & Reply */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col justify-between shadow-xs">
          {activeTicket ? (
            <>
              <div>
                <div className="border-b border-gray-100 pb-3 mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">{activeTicket.subject || activeTicket.title}</h3>
                    <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                      <span>کد: {activeTicket.ticketCode || toPersianDigits(String(activeTicket.id))}</span>
                      <span>·</span>
                      <span>دسته‌بندی: {activeTicket.category || 'عمومی'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusChange(activeTicket.status === 'resolved' ? 'open' : 'resolved')}
                      className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition-all ${
                        activeTicket.status === 'resolved'
                          ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      {activeTicket.status === 'resolved' ? (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span>بازگشایی مجدد</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>بستن تیکت</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto space-y-3 mb-4 max-h-[320px] p-1">
                  {(activeTicket.messages || []).map((m: any, i: number) => {
                    const isAdmin = m.senderRole === 'super_admin' || m.sender === 'admin';
                    return (
                      <div
                        key={m.id || i}
                        className={`p-3.5 rounded-2xl text-xs max-w-[85%] ${
                          isAdmin
                            ? 'mr-auto bg-[#173B3F] text-white shadow-xs'
                            : 'ml-auto bg-gray-50 border border-gray-100 text-gray-800'
                        }`}
                      >
                        <div className={`text-[9px] mb-1 font-bold ${isAdmin ? 'text-[#D9A2B0]' : 'text-gray-500'}`}>
                          {isAdmin ? 'مدیریت ارشد بویا' : 'کاربر'}
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{m.message || m.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-gray-100">
                <textarea
                  value={adminReplyText}
                  onChange={e => setAdminReplyText(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#173B3F] transition-all resize-none"
                  rows={3}
                  placeholder="پاسخ مدیریت به این تیکت..."
                  required
                />
                <div className="flex justify-between items-center">
                  <label className="text-xs text-gray-600 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resolveOnReply}
                      onChange={e => setResolveOnReply(e.target.checked)}
                      className="rounded border-gray-300 text-[#173B3F] focus:ring-0"
                    />
                    <span>همزمان با ارسال پاسخ، تیکت بسته شود</span>
                  </label>
                  <button
                    type="submit"
                    disabled={isSending || !adminReplyText.trim()}
                    className="bg-[#173B3F] text-white hover:bg-[#0F282B] disabled:opacity-50 px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? 'در حال ارسال...' : 'ارسال پاسخ'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
              <AlertCircle className="w-8 h-8 stroke-1 text-gray-300" />
              <span className="text-xs">یک تیکت را از ستون کناری انتخاب کنید</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
