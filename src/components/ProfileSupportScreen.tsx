import React, { useState } from 'react';
import { User, Phone, MapPin, LifeBuoy, Share2, Plus, MessageSquare, Send, CheckCircle2, ShieldCheck, ChevronLeft, Store } from 'lucide-react';
import { SupportTicket, INITIAL_TICKETS } from '../data/marketplaceData';
import { toPersianDigits } from '../utils/persianUtils';

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
      category: newTicketCategory,
      status: 'open',
      lastReply: newTicketMessage.trim(),
      createdAt: 'امروز',
      messages: [
        {
          sender: 'user',
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
        <h1 className="text-xl font-extrabold text-[#1A2942] font-serif">
          پروفایل کاربری و پشتیبانی آنلاین
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          مدیریت حساب، تیکت‌های پشتیبانی بویا، آدرس‌های منتخب و کد معرف
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#EEDCC5] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-[#1A2942] text-[#FECE57] flex items-center justify-center font-bold text-lg border-2 border-[#C59B27]">
            ش‌ب
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#1A2942]">
                شادی بهرامی
              </h2>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>شماره تایید شده</span>
              </span>
            </div>
            <span className="text-xs text-[#64748B] block mt-0.5 font-mono">
              {toPersianDigits('۰۹۱۲۳۴۵۶۷۸۹')}
            </span>
            <span className="text-[11px] text-[#775A00] font-medium mt-1 block">
              عضو سطح طلایی باشگاه مشتریان بویا
            </span>
          </div>
        </div>

        {/* Switch to Salon App Button */}
        <button
          onClick={onSwitchToSalonPanel}
          className="flex flex-col items-center justify-center px-3 py-2 rounded-2xl bg-[#FAF7F2] border border-[#EEDCC5] hover:border-[#C59B27] text-xs font-semibold text-[#1A2942] transition-colors"
        >
          <Store className="w-5 h-5 text-[#C59B27] mb-0.5" />
          <span className="text-[11px]">پنل سالندار</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1 bg-white rounded-2xl border border-[#E2E8F0]">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'tickets'
              ? 'bg-[#1A2942] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#1A2942]'
          }`}
        >
          تیکت‌های پشتیبانی ({toPersianDigits(tickets.length)})
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'addresses'
              ? 'bg-[#1A2942] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#1A2942]'
          }`}
        >
          آدرس‌های من
        </button>
        <button
          onClick={() => setActiveTab('referral')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'referral'
              ? 'bg-[#1A2942] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#1A2942]'
          }`}
        >
          کد معرف و دعوت
        </button>
      </div>

      {/* Tab: Support Tickets */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1A2942]">
              گفتگو با تیم پشتیبانی فنی و پیگیری بویا:
            </span>
            <button
              onClick={() => setIsCreatingTicket(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#C59B27] text-[#1A2942] text-xs font-bold hover:bg-[#B8860B]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ارسال تیکت جدید</span>
            </button>
          </div>

          {/* Ticket Messages View if selected */}
          {selectedTicket ? (
            <div className="bg-white rounded-3xl p-4 border border-[#EEDCC5] space-y-3">
              <div className="flex items-center justify-between border-b border-[#F2EDE5] pb-2.5">
                <div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-xs text-[#775A00] font-semibold flex items-center gap-1 mb-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                    <span>بازگشت به لیست تیکت‌ها</span>
                  </button>
                  <h3 className="text-sm font-bold text-[#1A2942]">
                    {selectedTicket.title}
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedTicket.status === 'resolved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
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
                        ? 'mr-auto bg-[#FAF3E7] border border-[#EEDCC5] text-[#1A2942]'
                        : 'ml-auto bg-[#1A2942] text-white'
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
              <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-[#F2EDE5]">
                <input
                  type="text"
                  placeholder="پاسخ خود را بنویسید..."
                  value={newReplyText}
                  onChange={(e) => setNewReplyText(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#1A2942] focus:border-[#C59B27] outline-none"
                />
                <button
                  type="submit"
                  className="px-4 h-10 rounded-xl bg-[#1A2942] text-white text-xs font-semibold hover:bg-[#04142C] flex items-center gap-1"
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
                  className="bg-white rounded-2xl p-4 border border-[#EEDCC5] hover:border-[#C59B27] cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1A2942]">
                      {tkt.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tkt.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {tkt.status === 'resolved' ? 'پاسخ داده شده' : 'در حال بررسی'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] truncate">
                    آخرین پیام: {tkt.lastReply}
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-[#64748B] pt-1 border-t border-[#F2EDE5]">
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
              <div className="bg-white rounded-3xl p-5 border border-[#EEDCC5] max-w-md w-full space-y-3.5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#F2EDE5] pb-2">
                  <h4 className="text-sm font-bold text-[#1A2942]">
                    ارسال تیکت پشتیبانی جدید به بویا
                  </h4>
                  <button
                    onClick={() => setIsCreatingTicket(false)}
                    className="w-7 h-7 rounded-full bg-[#FAF7F2] flex items-center justify-center text-[#64748B]"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateTicket} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#1A2942] block mb-1">
                      موضوع تیکت:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثلا: پیگیری تاخیر متخصص در خدمت سیار"
                      value={newTicketTitle}
                      onChange={(e) => setNewTicketTitle(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#1A2942] focus:border-[#C59B27] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#1A2942] block mb-1">
                      دپارتمان مربوطه:
                    </label>
                    <select
                      value={newTicketCategory}
                      onChange={(e) => setNewTicketCategory(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#1A2942] focus:border-[#C59B27] outline-none"
                    >
                      <option value="booking">پیگیری نوبت‌ها و رزرو</option>
                      <option value="specialist">متخصصین و خدمات در محل</option>
                      <option value="salon">انتقادات و پیشنهادات سالن‌ها</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#1A2942] block mb-1">
                      متن پیام:
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="جزییات کامل درخواست خود را شرح دهید..."
                      value={newTicketMessage}
                      onChange={(e) => setNewTicketMessage(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1A2942] focus:border-[#C59B27] outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 rounded-full bg-[#C59B27] text-[#1A2942] font-bold text-xs hover:bg-[#B8860B]"
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
          <div className="p-4 bg-white rounded-2xl border border-[#EEDCC5] space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#1A2942] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#C59B27]" />
                منزل (پیش‌فرض خدمات سیار)
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                آدرس فعال
              </span>
            </div>
            <p className="text-[#44474D] leading-relaxed">
              تهران، زعفرانیه، خیابان آصف، کوچه شقایق، پلاک ۴، زنگ ۳
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#1A2942] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#775A00]" />
                محل کار
              </span>
            </div>
            <p className="text-[#64748B] leading-relaxed">
              تهران، الهیه، خیابان فرشته، برج رز، طبقه ۴
            </p>
          </div>
        </div>
      )}

      {/* Tab: Referral Code */}
      {activeTab === 'referral' && (
        <div className="bg-white rounded-3xl p-5 border border-[#EEDCC5] text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#EEDCC5] text-[#C59B27] flex items-center justify-center mx-auto">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1A2942] font-serif">
            معرفی بویا به دوستان و دریافت اعتبار هدیه
          </h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto leading-relaxed">
            با اشتراک‌گذاری این کد، دوستان شما در اولین رزرو خدمات سالن تخفیف دریافت کرده و ۲۰۰,۰۰۰ تومان اعتبار بویا به حساب شما افزوده می‌شود.
          </p>

          <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#EEDCC5] inline-flex items-center gap-3">
            <span className="font-mono font-bold text-base text-[#1A2942] tracking-wider">
              {referralCode}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(referralCode);
                alert('کد معرف کپی گردید.');
              }}
              className="text-xs bg-[#1A2942] text-white px-3 py-1.5 rounded-xl font-medium"
            >
              کپی کد
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
