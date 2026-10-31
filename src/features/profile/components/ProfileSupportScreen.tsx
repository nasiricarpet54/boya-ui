import React, { useState } from 'react';
import { MapPin, Share2, Plus, Send, CheckCircle2, ChevronLeft, Store, ShieldCheck } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { SupportTicket, INITIAL_TICKETS } from '../../../shared/data/marketplaceData';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { useUIStore } from '../../../shared/stores/uiStore';
import { useAuthStore } from '../../../shared/stores/authStore';
import { LogOut } from 'lucide-react';

export const ProfileSupportScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setAppMode, setShowSplashScreen, setSplashAppName } = useUIStore();
  const { logout, user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'tickets' | 'addresses' | 'referral'>('tickets');
  // ... rest of state
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newReplyText, setNewReplyText] = useState<string>('');
  const [isCreatingTicket, setIsCreatingTicket] = useState<boolean>(false);
  const [newTicketTitle, setNewTicketTitle] = useState<string>('');
  const [newTicketCategory, setNewTicketCategory] = useState<'booking' | 'salon' | 'specialist'>('booking');
  const [newTicketMessage, setNewTicketMessage] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const referralCode = 'BOYA-SHADI94';

  const handleSwitchToSalonPanel = () => {
    setSplashAppName('ورود به پنل جامع سالندار و متخصصین بویا');
    setShowSplashScreen(true);
    setAppMode('salon_panel');
    navigate({ to: '/salon-admin' });
  };

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
      <div className="px-1">
        <h1 className="text-xl font-extrabold text-[#173B3F] font-serif">پروفایل و پشتیبانی</h1>
        <p className="text-xs text-[#6C6C6C] mt-0.5">مدیریت حساب و تیکت‌های پشتیبانی</p>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-[#173B3F] text-[#D9A2B0] flex items-center justify-center font-bold text-lg border-2 border-[#D9A2B0]/40 shadow-sm">ش‌ب</div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#173B3F]">شادی بهرامی</h2>
              <span className="text-[10px] text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full flex items-center gap-0.5 font-bold"><CheckCircle2 className="w-3 h-3" />تایید شده</span>
            </div>
            <span className="text-xs text-[#6C6C6C] block font-mono">{toPersianDigits('۰۹۱۲۳۴۵۶۷۸۹')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSwitchToSalonPanel} 
            className="flex flex-col items-center p-2 rounded-2xl bg-[#E8F0EF] text-[#173B3F] hover:bg-[#173B3F] hover:text-white transition-all min-w-[70px]"
          >
            <Store className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold">پنل سالن</span>
          </button>

          <button 
            onClick={() => {
              setSplashAppName('ورود به وب پنل ادمین اصلی کل');
              setShowSplashScreen(true);
              setAppMode('admin_panel');
              navigate({ to: '/admin' });
            }} 
            className="flex flex-col items-center p-2 rounded-2xl bg-[#173B3F] text-white hover:bg-[#0F3232] transition-all min-w-[70px]"
          >
            <ShieldCheck className="w-5 h-5 mb-0.5 text-[#D9A2B0]" />
            <span className="text-[10px] font-bold">وب پنل ادمین</span>
          </button>
          
          <button 
            onClick={() => logout()} 
            className="flex flex-col items-center p-2 rounded-2xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all min-w-[70px] border border-red-100"
          >
            <LogOut className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold">خروج</span>
          </button>
        </div>
      </div>

      <div className="flex p-1 bg-white rounded-2xl border border-[#E7E2DA] shadow-sm">
        {(['tickets', 'addresses', 'referral'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === tab ? 'bg-[#173B3F] text-white shadow-sm' : 'text-[#6C6C6C] hover:text-[#173B3F]'}`}>
            {tab === 'tickets' ? 'تیکت‌ها' : tab === 'addresses' ? 'آدرس‌ها' : 'کد معرف'}
          </button>
        ))}
      </div>

      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <button onClick={() => setIsCreatingTicket(true)} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#173B3F] text-white text-xs font-bold shadow-sm">
            <Plus className="w-3.5 h-3.5 text-[#D9A2B0]" />
            <span>ارسال تیکت جدید</span>
          </button>

          {selectedTicket ? (
            <div className="bg-white rounded-3xl p-4 border border-[#E7E2DA] space-y-4">
               <button onClick={() => setSelectedTicket(null)} className="text-xs text-[#173B3F] font-bold flex items-center gap-1"><ChevronLeft className="w-3.5 h-3.5 rotate-180" />بازگشت</button>
               <h3 className="text-sm font-bold">{selectedTicket.title}</h3>
               <div className="space-y-3 max-h-60 overflow-y-auto">
                 {selectedTicket.messages.map((msg, i) => (
                   <div key={i} className={`p-3 rounded-2xl text-xs max-w-[85%] ${msg.sender === 'user' ? 'mr-auto bg-[#FAF7F2] border' : 'ml-auto bg-[#173B3F] text-white'}`}>
                     <p>{msg.text}</p>
                   </div>
                 ))}
               </div>
               <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t">
                 <input type="text" placeholder="پاسخ خود را بنویسید..." value={newReplyText} onChange={e => setNewReplyText(e.target.value)} className="flex-1 h-10 px-3 rounded-xl border text-xs outline-none" />
                 <button type="submit" className="px-4 bg-[#173B3F] text-white rounded-xl font-bold text-xs"><Send className="w-4 h-4" /></button>
               </form>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map(t => (
                <div key={t.id} onClick={() => setSelectedTicket(t)} className="bg-white rounded-2xl p-4 border border-[#E7E2DA] hover:border-[#173B3F] cursor-pointer shadow-xs transition-all">
                  <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold">{t.title}</span><span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${t.status === 'resolved' ? 'bg-[#EAF2EF] text-[#2E5E52]' : 'bg-[#FBF4EC] text-[#8C5526]'}`}>{t.status === 'resolved' ? 'پاسخ داده شد' : 'در جریان'}</span></div>
                  <p className="text-[11px] text-[#6C6C6C] truncate">{t.lastReply}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isCreatingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-5 border max-w-md w-full space-y-4">
             <div className="flex justify-between border-b pb-2"><h4 className="text-sm font-bold">ارسال تیکت جدید</h4><button onClick={() => setIsCreatingTicket(false)}>✕</button></div>
             <form onSubmit={handleCreateTicket} className="space-y-3">
               <input type="text" placeholder="موضوع تیکت" value={newTicketTitle} onChange={e => setNewTicketTitle(e.target.value)} className="w-full h-10 px-3 rounded-xl border text-xs" required />
               <textarea placeholder="متن پیام" value={newTicketMessage} onChange={e => setNewTicketMessage(e.target.value)} className="w-full p-3 rounded-xl border text-xs" rows={4} required />
               <button type="submit" className="w-full py-3 bg-[#173B3F] text-white rounded-full font-bold text-xs">ثبت تیکت</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
