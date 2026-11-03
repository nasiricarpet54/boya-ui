import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Share2, Plus, Send, CheckCircle2, ChevronLeft, Store, ShieldCheck, Camera, Edit3, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { useUIStore } from '../../../shared/stores/uiStore';
import { useAuthStore } from '../../../shared/stores/authStore';
import { SEO } from '../../../shared/components/SEO';
import api from '../../../shared/api/apiClient';

export const ProfileSupportScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setAppMode, setShowSplashScreen, setSplashAppName } = useUIStore();
  const { logout, user, updateProfile } = useAuthStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editFullName, setEditFullName] = useState(user?.fullName || '');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, filename: file.name }),
            credentials: 'include',
          });
          const uploadData = await uploadRes.json();
          if (uploadData.url) {
            await updateProfile({ avatar: uploadData.url });
            setProfileSuccessMsg(true);
            setTimeout(() => setProfileSuccessMsg(false), 3000);
          }
        } catch (err) {
          console.error('Error uploading avatar:', err);
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      reader.onerror = () => {
        setIsUploadingAvatar(false);
        console.error('FileReader error');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error in handleAvatarFileChange:', err);
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    if (!editFullName.trim()) return;
    try {
      await updateProfile({ fullName: editFullName.trim() });
      setIsEditingName(false);
      setProfileSuccessMsg(true);
      setTimeout(() => setProfileSuccessMsg(false), 3000);
    } catch (err) {
      console.error('Error updating name:', err);
    }
  };
  
  const [activeTab, setActiveTab] = useState<'profile' | 'tickets' | 'addresses' | 'referral' | 'faq' | 'guide'>('tickets');
  // ... rest of state
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [newReplyText, setNewReplyText] = useState<string>('');
  const [isCreatingTicket, setIsCreatingTicket] = useState<boolean>(false);
  const [newTicketTitle, setNewTicketTitle] = useState<string>('');
  const [newTicketCategory, setNewTicketCategory] = useState<'booking' | 'salon' | 'specialist'>('booking');
  const [newTicketMessage, setNewTicketMessage] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const fetchTickets = async () => {
    if (!user) return;
    try {
      setIsLoadingTickets(true);
      const res = await api.get('/tickets');
      if (Array.isArray(res.data)) {
        setTickets(res.data);
        if (selectedTicket) {
          const updatedSelected = res.data.find((t: any) => t.id === selectedTicket.id);
          if (updatedSelected) setSelectedTicket(updatedSelected);
        }
      }
    } catch (err) {
      console.error('Failed to load tickets from server:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tickets' && user) {
      fetchTickets();
    }
  }, [activeTab, user]);

  const referralCode = user?.phone ? `BOYA-${user.phone.slice(-4)}` : 'BOYA-CLUB';

  const handleSwitchToSalonPanel = () => {
    setSplashAppName('ورود به پنل جامع سالندار و متخصصین بویا');
    setShowSplashScreen(true);
    setAppMode('salon_panel');
    navigate({ to: '/salon-admin' });
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyText.trim() || !selectedTicket) return;

    try {
      await api.post(`/tickets/${selectedTicket.id}/messages`, {
        message: newReplyText.trim(),
      });
      setNewReplyText('');
      await fetchTickets();
    } catch (err) {
      console.error('Failed to send reply to ticket:', err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !newTicketMessage.trim()) return;

    try {
      const res = await api.post('/tickets', {
        subject: newTicketTitle.trim(),
        category: newTicketCategory,
        message: newTicketMessage.trim(),
        priority: 'medium',
      });
      setIsCreatingTicket(false);
      setNewTicketTitle('');
      setNewTicketMessage('');
      await fetchTickets();
      if (res.data) {
        setSelectedTicket(res.data);
      }
    } catch (err) {
      console.error('Failed to create ticket on server:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    setAppMode('customer');
    navigate({ to: '/' });
  };

  return (
    <>
      <SEO 
        title="پروفایل و پشتیبانی" 
        description="مدیریت حساب کاربری، مشاهده تیکت‌های پشتیبانی و تنظیمات شخصی در سامانه بویا." 
      />
      <div className="space-y-5 pb-24">
        <div className="px-1">
          <h1 className="text-xl font-extrabold text-[#173B3F] font-serif">پروفایل و پشتیبانی</h1>
          <p className="text-xs text-[#6C6C6C] mt-0.5">مدیریت حساب و تیکت‌های پشتیبانی</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="relative group">
              <div className="w-14 h-14 rounded-2xl bg-[#173B3F] text-[#D9A2B0] flex items-center justify-center font-bold text-lg border-2 border-[#D9A2B0]/40 shadow-sm overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0) || 'ک'
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white flex items-center justify-center border border-white shadow-xs transition-all cursor-pointer"
                title="تغییر تصویر پروفایل"
              >
                <Camera className="w-3.5 h-3.5 text-[#D9A2B0]" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="h-8 px-2 text-xs font-bold rounded-lg border border-[#173B3F] outline-none"
                      autoFocus
                    />
                    <button onClick={handleSaveName} className="px-2 py-1 bg-[#173B3F] text-white rounded-lg text-[10px] font-bold">ذخیره</button>
                    <button onClick={() => setIsEditingName(false)} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-[10px]">انصراف</button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-base font-bold text-[#173B3F]">{user?.fullName || 'کاربر مهمان'}</h2>
                    <button onClick={() => { setEditFullName(user?.fullName || ''); setIsEditingName(true); }} className="text-[#6F9A8D] hover:text-[#173B3F] p-0.5" title="ویرایش نام">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full flex items-center gap-0.5 font-bold"><CheckCircle2 className="w-3 h-3" />تایید شده</span>
                  </>
                )}
              </div>
              <span className="text-xs text-[#6C6C6C] block font-mono">{toPersianDigits(user?.phone || '')}</span>
              {profileSuccessMsg && (
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">تغییرات با موفقیت در دیتابیس ذخیره شد.</span>
              )}
              {isUploadingAvatar && (
                <span className="text-[10px] text-amber-700 font-bold block mt-0.5">در حال ذخیره دائمی تصویر...</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">


            {(user?.role === 'salon_admin' || user?.role === 'salon_specialist' || user?.role === 'mobile_specialist' || user?.role === 'line_manager') && (
              <button 
                onClick={handleSwitchToSalonPanel} 
                className="flex flex-col items-center p-2 rounded-2xl bg-[#E8F0EF] text-[#173B3F] hover:bg-[#173B3F] hover:text-white transition-all min-w-[70px]"
              >
                <Store className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-bold">پنل سالن/متخصص</span>
              </button>
            )}
            
            <button 
              onClick={handleLogout} 
              className="flex flex-col items-center p-2 rounded-2xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all min-w-[70px] border border-red-100"
            >
              <LogOut className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-bold">خروج</span>
            </button>
          </div>
        </div>

        <div className="flex p-1 bg-white rounded-2xl border border-[#E7E2DA] shadow-sm overflow-x-auto">
          {(['tickets', 'faq', 'guide', 'addresses', 'referral'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-[75px] py-2 text-xs font-bold rounded-xl transition-all ${activeTab === tab ? 'bg-[#173B3F] text-white shadow-sm' : 'text-[#6C6C6C] hover:text-[#173B3F]'}`}>
              {tab === 'tickets' ? 'تیکت‌ها' : tab === 'faq' ? 'سوالات متداول' : tab === 'guide' ? 'راهنمای پروژه' : tab === 'addresses' ? 'آدرس‌ها' : 'کد معرف'}
            </button>
          ))}
        </div>

        {activeTab === 'faq' && (
          <div className="space-y-3">
            <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-[#173B3F] font-serif">سوالات متداول کاربران (FAQ)</h3>
              <div className="space-y-3">
                <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-1">
                  <h4 className="text-xs font-bold text-[#173B3F]">۱. چگونه می‌توانم در سامانه نوبت رزرو کنم؟</h4>
                  <p className="text-xs text-[#6C6C6C] leading-relaxed">از طریق بخش سالن‌ها یا جستجوی هوشمند، سالن و خدمت مدنظر را انتخاب کرده، متخصص و سانس ساعت آزاد را تعیین و نوبت خود را ثبت کنید.</p>
                </div>
                <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-1">
                  <h4 className="text-xs font-bold text-[#173B3F]">۲. آیا پرداخت آنلاین در فاز ۱ الزامی است؟</h4>
                  <p className="text-xs text-[#6C6C6C] leading-relaxed">خیر، در فاز ۱ (ویترین رایگان) هزینه خدمات مستقیماً در محل سالن یا پس از دریافت خدمت سیار تسویه می‌گردد.</p>
                </div>
                <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-1">
                  <h4 className="text-xs font-bold text-[#173B3F]">۳. چگونه می‌توانم به عنوان متخصص یا مدیر سالن فعالیت کنم؟</h4>
                  <p className="text-xs text-[#6C6C6C] leading-relaxed">با کلیک بر روی دکمه «پنل سالن» در بالای صفحه، می‌توانید به پنل مدیریت سالن و بیوتیشن‌ها دسترسی داشته باشید.</p>
                </div>
                <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-1">
                  <h4 className="text-xs font-bold text-[#173B3F]">۴. چگونه کد رهگیری نوبت خود را پیگیری کنم؟</h4>
                  <p className="text-xs text-[#6C6C6C] leading-relaxed">تمامی نوبت‌های فعال و انجام‌شده در بخش «نوبت‌های من» قابل مشاهده و پیگیری هستند و هشدارهای تغییر وضعیت به صورت آنی نمایش داده می‌شوند.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="space-y-3">
            <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-[#173B3F] font-serif">راهنمای جامع و مستندات پروژه بویا</h3>
              <div className="space-y-3 text-xs text-[#6C6C6C] leading-relaxed">
                <div className="p-3.5 bg-[#EAF2EF] rounded-2xl border border-[#6F9A8D]/30 space-y-1">
                  <h4 className="font-bold text-[#173B3F]">درباره پلتفرم زیبایی بویا</h4>
                  <p>بویا سامانه هوشمند اتصال مشتریان به سالن‌های زیبایی برتر، بیوتیشن‌های مستقل و متخصصین سیار در سراسر کشور است که با هدف ارتقای کیفیت خدمات و شفافیت تعرفه‌ها طراحی شده است.</p>
                </div>
                <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-1">
                  <h4 className="font-bold text-[#173B3F]">ویژگی‌های کلیدی معماری سیستم:</h4>
                  <ul className="list-disc pr-4 space-y-1">
                    <li><strong>فیلتر پیشرفته موقعیت مکانی:</strong> جستجوی بر اساس GPS و ۳۱ استان کشور.</li>
                    <li><strong>مدیریت پیشرفته نوبت‌ها:</strong> امکان رزرو در تقویم روزهای آینده و انتخاب ساعات آزاد.</li>
                    <li><strong>خدمات سیار (Mobile Service):</strong> اعزام متخصص به آدرس دلخواه مشتری با امکانات کامل.</li>
                    <li><strong>ایزولاسیون نقش‌ها:</strong> پنل‌های مجزا و امن برای مدیران کل، مدیران سالن، مدیران لاین و متخصصین سیار.</li>
                    <li><strong>یکپارچه‌سازی پایگاه‌داده:</strong> ذخیره‌سازی ابری روی PostgreSQL و سیستم ذخیره محلی با قابلیت همگام‌سازی کامل.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-4">
            <button onClick={() => setIsCreatingTicket(true)} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#173B3F] text-white text-xs font-bold shadow-sm">
              <Plus className="w-3.5 h-3.5 text-[#D9A2B0]" />
              <span>ارسال تیکت جدید</span>
            </button>

            {isLoadingTickets ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin text-[#173B3F]" />
                <span className="text-xs">در حال بارگذاری تیکت‌ها...</span>
              </div>
            ) : selectedTicket ? (
              <div className="bg-white rounded-3xl p-4 border border-[#E7E2DA] space-y-4">
                 <button onClick={() => setSelectedTicket(null)} className="text-xs text-[#173B3F] font-bold flex items-center gap-1"><ChevronLeft className="w-3.5 h-3.5 rotate-180" />بازگشت</button>
                 <div className="flex items-center justify-between border-b pb-2">
                   <div>
                     <h3 className="text-sm font-bold text-[#173B3F]">{selectedTicket.subject || selectedTicket.title}</h3>
                     <span className="text-[10px] text-gray-500">{selectedTicket.ticketCode || ''}</span>
                   </div>
                   <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedTicket.status === 'resolved' ? 'bg-[#EAF2EF] text-[#2E5E52]' : 'bg-[#FBF4EC] text-[#8C5526]'}`}>
                     {selectedTicket.status === 'resolved' ? 'بسته شده / پاسخ داده شده' : selectedTicket.status === 'in_progress' ? 'در حال بررسی' : 'در انتظار پاسخ'}
                   </span>
                 </div>
                 <div className="space-y-3 max-h-60 overflow-y-auto">
                   {(selectedTicket.messages || []).map((msg: any, i: number) => {
                     const isUser = msg.sender === 'user' || msg.senderRole === 'customer' || msg.senderId === user?.id;
                     return (
                       <div key={msg.id || i} className={`p-3 rounded-2xl text-xs max-w-[85%] ${isUser ? 'mr-auto bg-[#FAF7F2] border border-[#E7E2DA] text-[#173B3F]' : 'ml-auto bg-[#173B3F] text-white'}`}>
                         <div className="text-[9px] opacity-70 mb-1 font-bold">
                           {isUser ? 'شما' : 'پشتیبانی بویا'}
                         </div>
                         <p className="leading-relaxed">{msg.message || msg.text}</p>
                       </div>
                     );
                   })}
                 </div>
                 <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t">
                   <input type="text" placeholder="پاسخ خود را بنویسید..." value={newReplyText} onChange={e => setNewReplyText(e.target.value)} className="flex-1 h-10 px-3 rounded-xl border text-xs outline-none focus:border-[#173B3F]" />
                   <button type="submit" disabled={!newReplyText.trim()} className="px-4 bg-[#173B3F] text-white rounded-xl font-bold text-xs disabled:opacity-50"><Send className="w-4 h-4" /></button>
                 </form>
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-[#E7E2DA] text-center text-gray-400 text-xs">
                هنوز هیچ تیکتی ثبت نکرده‌اید. برای شروع، روی «ارسال تیکت جدید» کلیک کنید.
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map(t => {
                  const lastMsg = t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1] : null;
                  const previewText = lastMsg ? (lastMsg.message || lastMsg.text) : (t.lastReply || 'بدون پیام');
                  return (
                    <div key={t.id} onClick={() => setSelectedTicket(t)} className="bg-white rounded-2xl p-4 border border-[#E7E2DA] hover:border-[#173B3F] cursor-pointer shadow-xs transition-all">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-[#173B3F]">{t.subject || t.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${t.status === 'resolved' ? 'bg-[#EAF2EF] text-[#2E5E52]' : t.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-[#FBF4EC] text-[#8C5526]'}`}>
                          {t.status === 'resolved' ? 'پاسخ داده شد' : t.status === 'in_progress' ? 'در حال بررسی' : 'جدید'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6C6C6C] truncate">{previewText}</p>
                    </div>
                  );
                })}
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
    </>
  );
};
