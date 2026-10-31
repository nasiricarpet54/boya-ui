import React, { useState } from 'react';
import { User, Phone, MapPin, LifeBuoy, Share2, Plus, MessageSquare, Send, CheckCircle2, ShieldCheck, ChevronLeft, Store } from 'lucide-react';
import { SupportTicket, INITIAL_TICKETS } from '../../../shared/data/marketplaceData';
import { toPersianDigits } from '../../../shared/utils/persianUtils';

interface ProfileSupportScreenProps {
  onSwitchToSalonPanel: () => void;
}

export const ProfileSupportScreen: React.FC<ProfileSupportScreenProps> = ({
  onSwitchToSalonPanel,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'tickets' | 'addresses' | 'referral'>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newReplyText, setNewReplyText] = useState<string>('');
  const [isCreatingTicket, setIsCreatingTicket] = useState<boolean>(false);
  const [newTicketTitle, setNewTicketTitle] = useState<string>('');
  const [newTicketCategory, setNewTicketCategory] = useState<'booking' | 'salon' | 'specialist'>('booking');
  const [newTicketMessage, setNewTicketMessage] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const referralCode = 'BOYA-SHADI94';

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyText.trim() || !selectedTicket) return;

    const updated = {
      ...selectedTicket,
      messages: [
        ...selectedTicket.messages,
        {
          sender: 'user' as const,
          senderName: 'شادی بهرامی',
          text: newReplyText.trim(),
          time: 'هم‌اکنون',
        },
      ],
      lastReply: newReplyText.trim(),
      status: 'in_progress' as const,
    };

    setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? updated : t)));
    setSelectedTicket(updated);
    setNewReplyText('');
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !newTicketMessage.trim()) return;

    const newTicket: SupportTicket = {
      id: `tkt-${Math.floor(100 + Math.random() * 900)}`,
      title: newTicketTitle.trim(),
      userName: 'شادی بهرامی',
      userPhone: '۰۹۱۲۳۴۵۶۷۸۹',
      userRole: 'customer',
      category: newTicketCategory,
      status: 'open',
      lastReply: newTicketMessage.trim(),
      createdAt: 'امروز',
      messages: [
        {
          sender: 'user',
          senderName: 'شادی بهرامی',
          text: newTicketMessage.trim(),
          time: 'هم‌اکنون',
        },
      ],
    };

    setTickets([newTicket, ...tickets]);
    setIsCreatingTicket(false);
    setNewTicketTitle('');
    setNewTicketMessage('');
    setSelectedTicket(newTicket);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Title */}
      <div className="px-1">
        <h1 className="text-xl font-extrabold text-[#173B3F] font-serif">
          پروفایل کاربری و پشتیبانی آنلاین
        </h1>
        <p className="text-xs text-[#6C6C6C] mt-0.5">
          مدیریت حساب، تیکت‌های پشتیبانی بویا، آدرس‌های منتخب و کد معرف
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-[#173B3F] text-[#D9A2B0] flex items-center justify-center font-bold text-lg border-2 border-[#D9A2B0]/40 shadow-sm">
            ش‌ب
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#173B3F]">
                شادی بهرامی
              </h2>
              <span className="text-[10px] text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full border border-[#6F9A8D]/40 font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 text-[#6F9A8D]" />
                <span>شماره تایید شده</span>
              </span>
            </div>
            <span className="text-xs text-[#6C6C6C] block mt-0.5 font-mono">
              {toPersianDigits('۰۹۱۲۳۴۵۶۷۸۹')}
            </span>
            <span className="text-[11px] text-[#173B3F] font-bold mt-1 block">
              عضو سطح طلایی باشگاه مشتریان بویا
            </span>
          </div>
        </div>

        {/* Switch to Salon App Button */}
        <button
          onClick={onSwitchToSalonPanel}
          className="flex flex-col items-center justify-center px-3.5 py-2.5 rounded-2xl bg-[#E8F0EF] border border-[#173B3F]/20 hover:bg-[#173B3F] hover:text-white text-xs font-bold text-[#173B3F] transition-all shadow-xs group"
        >
          <Store className="w-5 h-5 text-[#173B3F] group-hover:text-white mb-0.5 transition-colors" />
          <span className="text-[11px]">پنل سالندار</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1 bg-white rounded-2xl border border-[#E7E2DA] shadow-sm">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'tickets'
              ? 'bg-[#173B3F] text-white shadow-sm'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          تیکت‌های پشتیبانی ({toPersianDigits(tickets.length)})
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'addresses'
              ? 'bg-[#173B3F] text-white shadow-sm'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          آدرس‌های من
        </button>
        <button
          onClick={() => setActiveTab('referral')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'referral'
              ? 'bg-[#173B3F] text-white shadow-sm'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          کد معرف و دعوت
        </button>
      </div>

      {/* Tab: Support Tickets */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#173B3F]">
              گفتگو با تیم پشتیبانی فنی و پیگیری بویا:
            </span>
            <button
              onClick={() => setIsCreatingTicket(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#D9A2B0]" />
              <span>ارسال تیکت جدید</span>
            </button>
          </div>

          {/* Ticket Messages View if selected */}
          {selectedTicket ? (
            <div className="bg-white rounded-3xl p-4 border border-[#E7E2DA] space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-2.5">
                <div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-xs text-[#173B3F] font-bold flex items-center gap-1 mb-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                    <span>بازگشت به لیست تیکت‌ها</span>
                  </button>
                  <h3 className="text-sm font-bold text-[#173B3F]">
                    {selectedTicket.title}
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedTicket.status === 'resolved'
                      ? 'bg-[#EAF2EF] text-[#2E5E52] border border-[#6F9A8D]/40'
                      : 'bg-[#FBF4EC] text-[#8C5526] border border-[#C99558]/30'
                  }`}
                >
                  {selectedTicket.status === 'resolved' ? 'پاسخ داده شد' : 'در حال پیگیری پشتیبانی'}
                </span>
              </div>

              {/* Message Thread */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto p-1">
                {selectedTicket.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-2xl text-xs max-w-[85%] ${
                      msg.sender === 'user'
                        ? 'mr-auto bg-[#FAF7F2] border border-[#E7E2DA] text-[#1C1C1C]'
                        : 'ml-auto bg-[#173B3F] text-white'
                    }`}
                  >
                    <span className="text-[10px] opacity-70 block mb-1">
                      {msg.sender === 'user' ? 'شما' : 'پشتیبانی بویا'} • {msg.time}
                    </span>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-[#E7E2DA]">
                <input
                  type="text"
                  placeholder="پاسخ خود را بنویسید..."
                  value={newReplyText}
                  onChange={(e) => setNewReplyText(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none"
                />
                <button
                  type="submit"
                  className="px-4 h-10 rounded-xl bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] flex items-center gap-1 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال</span>
                </button>
              </form>
            </div>
          ) : (
            /* Tickets List */
            <div className="space-y-3">
              {tickets.map((tkt) => (
                <div
                  key={tkt.id}
                  onClick={() => setSelectedTicket(tkt)}
                  className="bg-white rounded-2xl p-4 border border-[#E7E2DA] hover:border-[#173B3F] cursor-pointer transition-all space-y-1.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#173B3F]">
                      {tkt.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tkt.status === 'resolved'
                          ? 'bg-[#EAF2EF] text-[#2E5E52]'
                          : 'bg-[#FBF4EC] text-[#8C5526]'
                      }`}
                    >
                      {tkt.status === 'resolved' ? 'پاسخ داده شد' : 'در حال بررسی'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6C6C6C] truncate">
                    آخرین پیام: {tkt.lastReply}
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-[#6C6C6C] pt-1 border-t border-[#E7E2DA]/60">
                    <span>دسته‌بندی: {tkt.category === 'booking' ? 'نوبت‌دهی' : 'متخصصین'}</span>
                    <span>{tkt.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Ticket Modal */}
          {isCreatingTicket && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] max-w-md w-full space-y-3.5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-2">
                  <h4 className="text-sm font-bold text-[#173B3F]">
                    ارسال تیکت پشتیبانی جدید به بویا
                  </h4>
                  <button
                    onClick={() => setIsCreatingTicket(false)}
                    className="w-7 h-7 rounded-full bg-[#FAF7F2] flex items-center justify-center text-[#6C6C6C]"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateTicket} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#1C1C1C] block mb-1">
                      موضوع تیکت:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثلا: پیگیری تاخیر متخصص در خدمت سیار"
                      value={newTicketTitle}
                      onChange={(e) => setNewTicketTitle(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#1C1C1C] block mb-1">
                      دپارتمان مربوطه:
                    </label>
                    <select
                      value={newTicketCategory}
                      onChange={(e) => setNewTicketCategory(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none"
                    >
                      <option value="booking">پیگیری نوبت‌ها و رزرو</option>
                      <option value="specialist">متخصصین و خدمات در محل</option>
                      <option value="salon">انتقادات و پیشنهادات سالن‌ها</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#1C1C1C] block mb-1">
                      متن پیام:
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="جزییات کامل درخواست خود را شرح دهید..."
                      value={newTicketMessage}
                      onChange={(e) => setNewTicketMessage(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 rounded-full bg-[#173B3F] text-white font-bold text-xs hover:bg-[#0F3232] shadow-sm"
                  >
                    ثبت تیکت در سامانه
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-3">
          <div className="p-4 bg-white rounded-2xl border border-[#E7E2DA] space-y-2 text-xs shadow-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#173B3F] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#173B3F]" />
                منزل (پیش‌فرض خدمات سیار)
              </span>
              <span className="text-[10px] text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full font-bold">
                آدرس فعال
              </span>
            </div>
            <p className="text-[#1C1C1C] leading-relaxed">
              تهران، زعفرانیه، خیابان آصف، کوچه شقایق، پلاک ۴، زنگ ۳
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#E7E2DA] space-y-2 text-xs shadow-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#173B3F] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#6C6C6C]" />
                محل کار
              </span>
            </div>
            <p className="text-[#6C6C6C] leading-relaxed">
              تهران، الهیه، خیابان فرشته، برج رز، طبقه ۴
            </p>
          </div>
        </div>
      )}

      {/* Tab: Referral Code */}
      {activeTab === 'referral' && (
        <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F0EF] border border-[#173B3F]/20 text-[#173B3F] flex items-center justify-center mx-auto">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#173B3F] font-serif">
            معرفی بویا به دوستان و دریافت اعتبار هدیه
          </h3>
          <p className="text-xs text-[#6C6C6C] max-w-sm mx-auto leading-relaxed">
            با اشتراک‌گذاری این کد، دوستان شما در اولین رزرو خدمات سالن تخفیف دریافت کرده و ۲۰۰,۰۰۰ تومان اعتبار بویا به حساب شما افزوده می‌شود.
          </p>

          <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7E2DA] inline-flex items-center gap-3">
            <span className="font-mono font-bold text-base text-[#173B3F] tracking-wider">
              {referralCode}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(referralCode);
                setCopiedNotification(true);
                setTimeout(() => setCopiedNotification(false), 2000);
              }}
              className="text-xs bg-[#173B3F] text-white px-3.5 py-1.5 rounded-xl font-bold hover:bg-[#0F3232] transition-colors"
            >
              {copiedNotification ? 'کپی شد!' : 'کپی کد'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
