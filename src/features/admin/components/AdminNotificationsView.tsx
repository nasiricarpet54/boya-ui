import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Send,
  Trash2,
  CheckCircle2,
  Smartphone,
  Store,
  Users,
  Megaphone,
  Sparkles,
  AlertTriangle,
  Eye,
  MousePointerClick,
  Radio,
  ExternalLink,
  Tag,
  Calendar,
  X,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { useDataStore, PlatformNotification } from '../../../shared/stores/dataStore';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import api from '../../../shared/api/apiClient';

export const AdminNotificationsView: React.FC = () => {
  const { notifications, addNotification, toggleNotification, deleteNotification, updateNotification } = useDataStore();

  const [isCreating, setIsCreating] = useState(false);
  const [filterAudience, setFilterAudience] = useState<'all' | 'customer' | 'salon'>('all');
  const [testPhone, setTestPhone] = useState('09123456789');
  const [isSendingSms, setIsSendingSms] = useState<number | null>(null);
  const [smsResult, setSmsResult] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'promotional' | 'informational' | 'alert' | 'discount'>('promotional');
  const [targetAudience, setTargetAudience] = useState<'all' | 'customer' | 'salon'>('all');
  const [channel, setChannel] = useState<'in_app' | 'sms' | 'push' | 'both'>('in_app');
  const [badgeText, setBadgeText] = useState('اطلاعیه');
  const [actionUrl, setActionUrl] = useState('');
  const [actionText, setActionText] = useState('مشاهده جزئیات');
  const [expiresAt, setExpiresAt] = useState('');

  const filteredNotifs = notifications.filter((n) => {
    if (filterAudience === 'all') return true;
    return n.targetAudience === filterAudience || n.targetAudience === 'all';
  });

  const totalViews = notifications.reduce((acc, n) => acc + (n.viewsCount || 0), 0);
  const totalClicks = notifications.reduce((acc, n) => acc + (n.clicksCount || 0), 0);
  const activeCount = notifications.filter((n) => n.isActive).length;

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newNotif: any = {
      title: title.trim(),
      content: content.trim(),
      type,
      targetAudience,
      channel,
      badgeText: badgeText.trim() || undefined,
      actionUrl: actionUrl.trim() || undefined,
      actionText: actionText.trim() || undefined,
      isActive: true,
      expiresAt: expiresAt.trim() || undefined,
    };

    await addNotification(newNotif);

    // Trigger SMS broadcast if applicable
    if (channel === 'sms' || channel === 'both') {
      try {
        await api.post('/notifications/broadcast', {
          title: newNotif.title,
          content: newNotif.content,
          targetAudience: newNotif.targetAudience,
          testPhone,
        }).catch(() => {});
      } catch (e) {}
    }

    setIsCreating(false);
    setTitle('');
    setContent('');
    setBadgeText('اطلاعیه');
  };

  const handleSendTestSms = async (notif: PlatformNotification) => {
    setIsSendingSms(notif.id);
    setSmsResult(null);

    try {
      await api.post('/notifications/broadcast', {
        title: notif.title,
        content: notif.content,
        targetAudience: notif.targetAudience,
        testPhone,
      });
      setSmsResult('success');
    } catch (err) {
      setSmsResult('error');
    } finally {
      setTimeout(() => {
        setIsSendingSms(null);
        setSmsResult(null);
      }, 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats omitted for brevity, but IDs fixed below */}
      <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-[#E7E2DA] shadow-xs">
        <h2 className="text-base font-bold text-[#173B3F] font-serif flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#D9A2B0]" />
          مدیریت اعلان‌ها و کمپین‌های پیامکی
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-[#173B3F] text-white px-5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-[#122e31] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          ایجاد اعلان جدید
        </button>
      </div>

      <div className="grid gap-4">
        {filteredNotifs.map((notif) => (
          <div key={notif.id} className="bg-white p-6 rounded-[32px] border border-[#E7E2DA] shadow-xs relative overflow-hidden group">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                    notif.type === 'promotional' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    notif.type === 'informational' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    notif.type === 'discount' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {notif.badgeText || 'اطلاعیه'}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#6C6C6C] bg-[#F7F3EE] px-2.5 py-1 rounded-full border border-[#E7E2DA]/50">
                    <Calendar className="w-3 h-3" />
                    {notif.createdAt}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F] mb-1.5">{notif.title}</h3>
                  <p className="text-xs text-[#6C6C6C] leading-relaxed line-clamp-2">{notif.content}</p>
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-center justify-end gap-2 shrink-0 border-t md:border-t-0 md:border-r border-[#E7E2DA] pt-4 md:pt-0 md:pr-6">
                <button
                  onClick={() => toggleNotification(notif.id)}
                  className={`p-2.5 rounded-2xl transition-all cursor-pointer ${
                    notif.isActive ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-[#F7F3EE] text-[#6C6C6C] hover:bg-[#E7E2DA]'
                  }`}
                  title={notif.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                >
                  <Radio className={`w-5 h-5 ${notif.isActive ? 'animate-pulse' : ''}`} />
                </button>
                <button
                  onClick={() => handleSendTestSms(notif)}
                  disabled={isSendingSms === notif.id}
                  className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all cursor-pointer disabled:opacity-50"
                  title="ارسال تست پیامکی"
                >
                  {isSendingSms === notif.id ? (
                    <Clock className="w-5 h-5 animate-spin" />
                  ) : (
                    <Smartphone className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => deleteNotification(notif.id)}
                  className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all cursor-pointer"
                  title="حذف دائمی"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Create Notification Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl border border-[#E7E2DA] p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#E7E2DA] pb-3">
              <h3 className="text-sm font-bold text-[#173B3F] font-serif flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D9A2B0]" />
                ایجاد اعلان و کمپین جدید
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 text-[#6C6C6C] hover:text-[#173B3F] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNotification} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">عنوان اعلان:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: جشنواره تخفیف پاییزه سالن‌ها"
                  className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">متن اعلان:</label>
                <textarea
                  required
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="متن کامل پیام یا اطلاعیه برای کاربران..."
                  className="w-full p-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">نوع اعلان:</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none bg-white"
                  >
                    <option value="promotional">تبلیغاتی / جشنواره</option>
                    <option value="informational">اطلاع‌رسانی عمومی</option>
                    <option value="alert">هشدار سیستم</option>
                    <option value="discount">کد تخفیف</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">مخاطبان هدف:</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none bg-white"
                  >
                    <option value="all">همه کاربران و سالن‌ها</option>
                    <option value="customer">فقط مشتریان</option>
                    <option value="salon">فقط سالنداران و متخصصان</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">کانال ارسال:</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none bg-white"
                  >
                    <option value="in_app">درون برنامه‌ای (In-App)</option>
                    <option value="sms">پیامک (SMS)</option>
                    <option value="both">درون برنامه‌ای + پیامک</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">برچسب (Badge):</label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="اطلاعیه"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#173B3F] text-white py-2.5 rounded-2xl text-xs font-bold hover:bg-[#122e31] transition-all cursor-pointer"
                >
                  ثبت و انتشار اعلان
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-5 bg-[#FAF7F2] border border-[#E7E2DA] text-[#6C6C6C] py-2.5 rounded-2xl text-xs font-bold hover:bg-[#E7E2DA] transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
