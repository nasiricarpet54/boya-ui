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
  const [isSendingSms, setIsSendingSms] = useState<string | null>(null);
  const [smsResult, setSmsResult] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'promotional' | 'informational' | 'alert' | 'discount'>('promotional');
  const [targetAudience, setTargetAudience] = useState<'customer' | 'salon' | 'all'>('customer');
  const [channel, setChannel] = useState<'in_app' | 'sms' | 'push' | 'both'>('in_app');
  const [badgeText, setBadgeText] = useState('تخفیف ویژه');
  const [actionUrl, setActionUrl] = useState('/salons');
  const [actionText, setActionText] = useState('مشاهده سالن‌ها');
  const [expiresAt, setExpiresAt] = useState('۱۴۰۳/۰۹/۳۰');

  const filteredNotifications = notifications.filter((n) => {
    if (filterAudience === 'all') return true;
    return n.targetAudience === filterAudience || n.targetAudience === 'all';
  });

  const totalViews = notifications.reduce((acc, n) => acc + (n.viewsCount || 0), 0);
  const totalClicks = notifications.reduce((acc, n) => acc + (n.clicksCount || 0), 0);
  const activeCount = notifications.filter((n) => n.isActive).length;

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newNotif: PlatformNotification = {
      id: `notif-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      type,
      targetAudience,
      channel,
      badgeText: badgeText.trim() || undefined,
      actionUrl: actionUrl.trim() || undefined,
      actionText: actionText.trim() || undefined,
      isActive: true,
      createdAt: new Date().toLocaleDateString('fa-IR'),
      expiresAt: expiresAt.trim() || undefined,
      viewsCount: 0,
      clicksCount: 0,
      smsSentCount: channel === 'sms' || channel === 'both' ? 1 : 0,
    };

    addNotification(newNotif);

    // Call server to log and trigger SMS if needed
    if (channel === 'sms' || channel === 'both') {
      try {
        await api.post('/notifications/broadcast', {
          title: newNotif.title,
          content: newNotif.content,
          targetAudience: newNotif.targetAudience,
          testPhone,
        }).catch((err) => console.warn('Broadcast endpoint warning:', err));
      } catch (err) {
        console.error(err);
      }
    }

    setIsCreating(false);
    // Reset Form
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

      setSmsResult(`پیامک تستی اعلان «${notif.title}» با موفقیت از طریق سامانه ملی‌پیامک به شماره ${toPersianDigits(testPhone)} ارسال و در کنسول سرور لاگ شد.`);
      updateNotification(notif.id, { smsSentCount: (notif.smsSentCount || 0) + 1 });
      setTimeout(() => setSmsResult(null), 5000);
    } catch (err: any) {
      setSmsResult('خطا در ارسال پیامک تستی.');
    } finally {
      setIsSendingSms(null);
    }
  };

  const getTypeBadge = (notifType: PlatformNotification['type']) => {
    switch (notifType) {
      case 'promotional':
        return { label: 'تبلیغاتی و تخفیف', bg: 'bg-[#C99558]/15 text-[#C99558] border-[#C99558]/30', icon: Sparkles };
      case 'discount':
        return { label: 'هدیه و بن ویژه', bg: 'bg-[#D9A2B0]/20 text-[#8A3838] border-[#D9A2B0]/40', icon: Tag };
      case 'alert':
        return { label: 'هشدار سیستمی', bg: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle };
      default:
        return { label: 'اطلاع‌رسانی عمومی', bg: 'bg-[#173B3F]/10 text-[#173B3F] border-[#173B3F]/20', icon: Megaphone };
    }
  };

  const getAudienceBadge = (audience: PlatformNotification['targetAudience']) => {
    switch (audience) {
      case 'customer':
        return { label: 'اپلیکیشن مشتریان', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Users };
      case 'salon':
        return { label: 'اپلیکیشن سالن و متخصصین', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: Store };
      default:
        return { label: 'سراسر پلتفرم (همه)', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: Smartphone };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-3xl p-6 border border-[#E7E2DA] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#173B3F] text-[#D9A2B0] flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-[#173B3F] font-serif">
                مدیریت نوتیفیکیشن‌ها و اعلان‌های تبلیغاتی / اطلاع‌رسانی
              </h2>
            </div>
            <p className="text-xs text-[#6C6C6C] mt-1">
              ایجاد، زمان‌بندی و انتشار بنرهای درون‌برنامه‌ای، پوش و پیامک‌های اطلاع‌رسانی برای اپ مشتری و اپ سالن
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#173B3F] hover:bg-[#0F3232] text-white text-xs font-bold shadow-md shadow-[#173B3F]/20 transition-all"
            >
              <Plus className="w-4 h-4 text-[#D9A2B0]" />
              <span>ایجاد نوتیفیکیشن جدید</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-[#E7E2DA] text-xs">
          <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7E2DA]">
            <span className="text-[11px] text-[#6C6C6C] block">کل اعلان‌ها:</span>
            <span className="text-lg font-black text-[#173B3F] font-mono">
              {toPersianDigits(notifications.length)}
            </span>
          </div>

          <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7E2DA]">
            <span className="text-[11px] text-[#6C6C6C] block">اعلان‌های فعال روی اپ‌ها:</span>
            <span className="text-lg font-black text-emerald-700 font-mono">
              {toPersianDigits(activeCount)} فعال
            </span>
          </div>

          <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7E2DA]">
            <span className="text-[11px] text-[#6C6C6C] block">مجموع بازدیدهای درون‌برنامه‌ای:</span>
            <span className="text-lg font-black text-[#173B3F] font-mono flex items-center gap-1">
              <Eye className="w-4 h-4 text-[#6F9A8D]" />
              <span>{toPersianDigits(totalViews.toLocaleString())}</span>
            </span>
          </div>

          <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7E2DA]">
            <span className="text-[11px] text-[#6C6C6C] block">مجموع کلیک و واکنش‌ها:</span>
            <span className="text-lg font-black text-[#C99558] font-mono flex items-center gap-1">
              <MousePointerClick className="w-4 h-4 text-[#C99558]" />
              <span>{toPersianDigits(totalClicks.toLocaleString())}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Success / Alert result message */}
      {smsResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{smsResult}</span>
          </div>
          <button onClick={() => setSmsResult(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create Notification Modal/Panel */}
      {isCreating && (
        <div className="bg-white rounded-3xl p-6 border-2 border-[#173B3F] shadow-lg space-y-5 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#C99558]" />
              <h3 className="text-sm font-bold text-[#173B3F]">
                تنظیم و انتشار اعلان تبلیغاتی یا اطلاع‌رسانی
              </h3>
            </div>
            <button
              onClick={() => setIsCreating(false)}
              className="p-1.5 rounded-full hover:bg-slate-100 text-[#6C6C6C]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Fields (8 Cols) */}
            <form onSubmit={handleCreateNotification} className="lg:col-span-7 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">
                  عنوان نوتیفیکیشن / پیام:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: جشنواره تخفیف پاییزی سالن‌های VIP بویا"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">
                  متن کامل اطلاعیه / پیشنهاد:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="متن کامل پیام جهت نمایش در بنر بالای اپلیکیشن یا ارسال پیامکی..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">
                    جامعه هدف (مخاطبین):
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e: any) => setTargetAudience(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] font-semibold text-[#173B3F] outline-none"
                  >
                    <option value="customer">👥 اپلیکیشن مشتریان (Customer App)</option>
                    <option value="salon">🏢 اپلیکیشن سالن‌دار و متخصصین (Salon App)</option>
                    <option value="all">🌐 کل کاربران پلتفرم (سراسری)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">
                    نوع اعلان:
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] font-semibold text-[#173B3F] outline-none"
                  >
                    <option value="promotional">🏷️ تبلیغاتی و آفر تخفیف</option>
                    <option value="informational">📢 اطلاع‌رسانی و اخبار پلتفرم</option>
                    <option value="alert">⚠️ هشدار فنی یا سیستمی</option>
                    <option value="discount">🎁 هدیه و بن ویژه</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">
                    شیوه ارسال و انتشار:
                  </label>
                  <select
                    value={channel}
                    onChange={(e: any) => setChannel(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] font-semibold text-[#173B3F] outline-none"
                  >
                    <option value="in_app">📱 بنر و پاپ‌آپ داخل اپلیکیشن (In-App)</option>
                    <option value="sms">📩 پیامک از طریق ملی‌پیامک (SMS)</option>
                    <option value="both">📲 ترکیبی (بنر درون‌برنامه + پیامک)</option>
                    <option value="push">🔔 پوش نوتیفیکیشن وب</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">
                    برچسب تیتر (نشان نشانگر):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: تخفیف ویژه، جدید، مهم"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">
                    لینک یا مسیر اقدام (Action URL):
                  </label>
                  <input
                    type="text"
                    placeholder="/salons یا /salon-admin"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    dir="ltr"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] font-mono text-left focus:border-[#173B3F] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">
                    متن دکمه اقدام:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: مشاهده سالن‌ها، بررسی پنل"
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-[#D9A2B0]" />
                  <span>انتشار و ثبت اعلان در پلتفرم</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2.5 rounded-full border border-[#E7E2DA] text-[#6C6C6C] hover:text-[#173B3F] text-xs font-semibold"
                >
                  انصراف
                </button>
              </div>
            </form>

            {/* Live Preview Column (5 Cols) */}
            <div className="lg:col-span-5 bg-[#FAF7F2] p-4 rounded-2xl border border-[#E7E2DA] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#C99558]" />
                  <span>پیش‌نمایش زنده در گوشی کاربر</span>
                </span>
                <span className="text-[10px] text-[#6C6C6C]">مخاطب: {getAudienceBadge(targetAudience).label}</span>
              </div>

              {/* In-App Banner Preview */}
              <div className="bg-white rounded-2xl p-4 border border-[#E7E2DA] shadow-sm space-y-2.5 text-right">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D9A2B0]/25 text-[#173B3F] border border-[#D9A2B0]/40">
                    {badgeText || 'اطلاعیه'}
                  </span>
                  <span className="text-[10px] text-[#6C6C6C] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>هم‌اکنون</span>
                  </span>
                </div>

                <h4 className="text-xs font-bold text-[#173B3F] font-serif leading-snug">
                  {title || 'عنوان نمونه اعلان تبلیغاتی بویا'}
                </h4>

                <p className="text-[11px] text-[#6C6C6C] leading-relaxed">
                  {content || 'متن پیش‌نمایش نوتیفیکیشن در این قسمت قرار خواهد گرفت و کاربر پس از مشاهده می‌تواند روی دکمه هدایت اقدام کلیک نماید.'}
                </p>

                {actionText && (
                  <div className="pt-1 flex justify-end">
                    <span className="text-[10px] font-bold text-[#173B3F] bg-[#FAF7F2] px-3 py-1 rounded-xl border border-[#E7E2DA] flex items-center gap-1">
                      <span>{actionText}</span>
                      <ExternalLink className="w-3 h-3 text-[#C99558]" />
                    </span>
                  </div>
                )}
              </div>

              {/* Channel badge info */}
              <div className="text-[11px] text-[#6C6C6C] space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>کانال ارسال:</span>
                  <span className="font-bold text-[#173B3F]">
                    {channel === 'in_app' ? 'بنر درون‌برنامه' : channel === 'sms' ? 'پیامک ملی‌پیامک' : channel === 'both' ? 'بنر + پیامک' : 'پوش نوتیفیکیشن'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>نوع دسته‌بندی:</span>
                  <span className="font-bold text-[#173B3F]">{getTypeBadge(type).label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Audience Selector Bar */}
      <div className="bg-white rounded-2xl p-3 border border-[#E7E2DA] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#173B3F]">فیلتر بر اساس مخاطب:</span>
          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E7E2DA]">
            <button
              onClick={() => setFilterAudience('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterAudience === 'all'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              همه ({toPersianDigits(notifications.length)})
            </button>
            <button
              onClick={() => setFilterAudience('customer')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterAudience === 'customer'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              اپ مشتریان
            </button>
            <button
              onClick={() => setFilterAudience('salon')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterAudience === 'salon'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              اپ سالن و متخصصین
            </button>
          </div>
        </div>

        {/* Test SMS phone input */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#6C6C6C] font-semibold">شماره تست ملی‌پیامک:</span>
          <input
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            dir="ltr"
            className="w-28 h-8 px-2 rounded-lg border border-[#E7E2DA] font-mono text-center text-xs focus:border-[#173B3F] outline-none"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3.5">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-[#E7E2DA] text-center space-y-2">
            <Bell className="w-10 h-10 text-[#6F9A8D] mx-auto opacity-40" />
            <h4 className="text-sm font-bold text-[#173B3F]">اعلانی در این بخش یافت نشد</h4>
            <p className="text-xs text-[#6C6C6C]">برای ایجاد اعلان تبلیغاتی یا پیام اطلاع‌رسانی از دکمه بالا استفاده نمایید.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const typeInfo = getTypeBadge(notif.type);
            const audienceInfo = getAudienceBadge(notif.targetAudience);
            const TypeIcon = typeInfo.icon;
            const AudienceIcon = audienceInfo.icon;

            return (
              <div
                key={notif.id}
                className={`bg-white rounded-3xl p-5 border transition-all shadow-xs space-y-3 ${
                  notif.isActive
                    ? 'border-[#E7E2DA] hover:border-[#173B3F]'
                    : 'border-slate-200 bg-slate-50/60 opacity-75'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Toggle Switch */}
                    <button
                      onClick={() => toggleNotification(notif.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all ${
                        notif.isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${notif.isActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-500'}`} />
                      <span>{notif.isActive ? 'فعال در اپلیکیشن' : 'غیرفعال (پیش‌نویس)'}</span>
                    </button>

                    {/* Target Audience Badge */}
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${audienceInfo.color}`}>
                      <AudienceIcon className="w-3 h-3" />
                      <span>{audienceInfo.label}</span>
                    </span>

                    {/* Type Badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${typeInfo.bg}`}>
                      <TypeIcon className="w-3 h-3" />
                      <span>{typeInfo.label}</span>
                    </span>

                    {notif.badgeText && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D9A2B0]/30 text-[#173B3F] border border-[#D9A2B0]/40">
                        {notif.badgeText}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#6C6C6C]">
                    <span>ثبت: {notif.createdAt}</span>
                    {notif.expiresAt && <span>• انقضا: {notif.expiresAt}</span>}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F] font-serif mb-1">
                    {notif.title}
                  </h3>
                  <p className="text-xs text-[#1C1C1C] leading-relaxed">
                    {notif.content}
                  </p>
                </div>

                {/* Footer Controls & Stats */}
                <div className="pt-3 border-t border-[#E7E2DA]/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-[#6C6C6C]">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Eye className="w-3.5 h-3.5 text-[#173B3F]" />
                      <span>بازدید: <strong className="text-[#173B3F] font-mono">{toPersianDigits(notif.viewsCount || 0)}</strong></span>
                    </span>

                    <span className="flex items-center gap-1 text-[11px]">
                      <MousePointerClick className="w-3.5 h-3.5 text-[#C99558]" />
                      <span>کلیک: <strong className="text-[#C99558] font-mono">{toPersianDigits(notif.clicksCount || 0)}</strong></span>
                    </span>

                    {notif.smsSentCount !== undefined && notif.smsSentCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <MessageSquare className="w-3.5 h-3.5 text-[#6F9A8D]" />
                        <span>ارسال پیامک: <strong className="text-[#6F9A8D] font-mono">{toPersianDigits(notif.smsSentCount)}</strong></span>
                      </span>
                    )}

                    {notif.actionUrl && (
                      <span className="text-[11px] text-[#173B3F] font-mono">
                        مقصد: {notif.actionUrl}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Test SMS via MeliPayamak */}
                    <button
                      onClick={() => handleSendTestSms(notif)}
                      disabled={isSendingSms === notif.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#E8F0EF] border border-[#E7E2DA] text-[#173B3F] text-[11px] font-bold transition-all disabled:opacity-50"
                      title={`ارسال تست SMS به ${testPhone}`}
                    >
                      <Radio className="w-3.5 h-3.5 text-[#C99558]" />
                      <span>{isSendingSms === notif.id ? 'در حال ارسال پیامک...' : 'تست ارسال با ملی‌پیامک'}</span>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-1.5 rounded-xl text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                      title="حذف اعلان"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
