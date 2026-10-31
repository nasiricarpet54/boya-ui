import React, { useState } from 'react';
import { LifeBuoy, Send, MessageSquare, CheckCircle2, Clock, User, Phone } from 'lucide-react';
import { SupportTicket } from '../../../shared/data/marketplaceData';
import { toPersianDigits } from '../../../shared/utils/persianUtils';

interface AdminSupportViewProps {
  tickets: SupportTicket[];
  onReplyTicket: (ticketId: string, replyText: string, newStatus?: 'in_progress' | 'resolved') => void;
}

export const AdminSupportView: React.FC<AdminSupportViewProps> = ({
  tickets,
  onReplyTicket,
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string>(tickets[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [adminReplyText, setAdminReplyText] = useState('');
  const [resolveOnReply, setResolveOnReply] = useState(false);

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeTicket) return;

    onReplyTicket(
      activeTicket.id,
      adminReplyText.trim(),
      resolveOnReply ? 'resolved' : 'in_progress'
    );
    setAdminReplyText('');
    setResolveOnReply(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-[#EEDCC5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1A2942]">
            میز مرکزی پشتیبانی و تیکتینگ سراسری
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            رسیدگی به درخواست‌های مشتریان، مشکلات رزرو سانس‌ها و پشتیبانی مدیران سالن‌ها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs font-semibold focus:border-[#C59B27] outline-none"
          >
            <option value="all">همه تیکت‌ها ({toPersianDigits(tickets.length)})</option>
            <option value="open">تیکت‌های جدید (Open)</option>
            <option value="in_progress">در حال بررسی (In Progress)</option>
            <option value="resolved">حل و بسته شده (Resolved)</option>
          </select>
        </div>
      </div>

      {/* Two-Pane Ticket Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left Pane: Ticket List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EEDCC5] p-3 space-y-2 max-h-[600px] overflow-y-auto">
          {filteredTickets.map((t) => {
            const isSelected = activeTicket && activeTicket.id === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTicketId(t.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                  isSelected
                    ? 'border-[#C59B27] bg-[#FAF3E7]'
                    : 'border-[#E2E8F0] bg-white hover:border-[#C59B27]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1A2942] truncate">
                    {t.title}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.2 rounded-full ${
                      t.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : t.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t.status === 'resolved' ? 'بسته شد' : t.status === 'in_progress' ? 'پاسخ داده شد' : 'منتظر پاسخ'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span>{t.userName} ({t.userRole === 'salon_owner' ? 'مدیر سالن' : 'مشتری'})</span>
                  <span>{t.createdAt}</span>
                </div>

                <p className="text-[11px] text-[#8290AE] truncate">
                  {t.lastReply}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right Pane: Ticket Conversation Thread */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EEDCC5] p-5 flex flex-col justify-between">
          {activeTicket ? (
            <>
              {/* Ticket Top bar */}
              <div className="border-b border-[#F2EDE5] pb-3 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1A2942]">
                    {activeTicket.title}
                  </h3>
                  <span className="text-xs font-mono text-[#8290AE]">شناسه: {activeTicket.id}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#64748B]">
                  <span>ارسال‌کننده: <strong className="text-[#1A2942]">{activeTicket.userName}</strong></span>
                  <span>تلفن: <span className="font-mono">{toPersianDigits(activeTicket.userPhone)}</span></span>
                  <span>دسته: {activeTicket.category === 'booking' ? 'نوبت‌دهی' : activeTicket.category === 'payment' ? 'مالی' : 'عمومی'}</span>
                </div>
              </div>

              {/* Messages Thread */}
              <div className="py-4 space-y-3 flex-1 overflow-y-auto max-h-[380px] p-1">
                {activeTicket.messages.map((m, idx) => {
                  const isAdmin = m.sender === 'admin' || m.sender === 'support';
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl text-xs max-w-[85%] ${
                        isAdmin
                          ? 'mr-auto bg-[#1A2942] text-white'
                          : 'ml-auto bg-[#FAF3E7] border border-[#EEDCC5] text-[#1A2942]'
                      }`}
                    >
                      <div className="flex items-center justify-between opacity-80 text-[10px] mb-1">
                        <span>{m.senderName}</span>
                        <span>{m.time}</span>
                      </div>
                      <p className="leading-relaxed text-justify">{m.text}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="pt-3 border-t border-[#F2EDE5] space-y-2">
                <textarea
                  rows={2}
                  required
                  placeholder="پاسخ رسمی به عنوان مدیر کل سامانه بویا بنویسید..."
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2E8F0] text-xs focus:border-[#C59B27] outline-none"
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-[#64748B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resolveOnReply}
                      onChange={(e) => setResolveOnReply(e.target.checked)}
                      className="accent-[#10B981] w-4 h-4"
                    />
                    <span>تغییر وضعیت تیکت به «حل شده (Resolved)»</span>
                  </label>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#C59B27] hover:bg-[#B8860B] text-[#1A2942] font-bold text-xs shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ارسال پاسخ به کاربر</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-24 text-xs text-[#8290AE]">
              تیکتی انتخاب نشده است.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
