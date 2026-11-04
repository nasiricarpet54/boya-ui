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
  Clock,
  Layers,
  Layout,
  MessageSquare,
  SlidersHorizontal,
  ChevronLeft
} from 'lucide-react';
import { useDataStore, PlatformNotification } from '../../../shared/stores/dataStore';
import { toPersianDigits, formatJalaliDate } from '../../../shared/utils/persianUtils';
import api from '../../../shared/api/apiClient';

export const AdminNotificationsView: React.FC = () => {
  const { notifications, addNotification, toggleNotification, deleteNotification, updateNotification } = useDataStore();

  const [isCreating, setIsCreating] = useState(false);
  const [filterAudience, setFilterAudience] = useState<'all' | 'customer' | 'salon' | 'admin'>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [testPhone, setTestPhone] = useState('09123456789');
  const [isSendingSms, setIsSendingSms] = useState<number | null>(null);
  const [smsResult, setSmsResult] = useState<string | null>(null);
  const [previewNotif, setPreviewNotif] = useState<PlatformNotification | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'promotional' | 'informational' | 'alert' | 'discount'>('promotional');
  const [targetAudience, setTargetAudience] = useState<'all' | 'customer' | 'salon'>('all');
  const [targetPanels, setTargetPanels] = useState<'all' | 'customer' | 'salon' | 'admin'>('customer');
  const [displayPosition, setDisplayPosition] = useState<'banner' | 'popup' | 'toast' | 'card'>('banner');
  const [channel, setChannel] = useState<'in_app' | 'sms' | 'both'>('in_app');
  const [badgeText, setBadgeText] = useState('پیشنهاد ویژه');
  const [actionUrl, setActionUrl] = useState('/salons');
  const [actionText, setActionText] = useState('مشاهده و رزرو');
  const [expiresAt, setExpiresAt] = useState('');

  const filteredNotifs = notifications.filter((n) => {
    if (filterAudience !== 'all') {
      const p = (n.targetPanels || n.targetAudience || 'all').toLowerCase();
      if (p !== 'all' && !p.includes(filterAudience)) return false;
    }
    if (filterPosition !== 'all') {
      if ((n.displayPosition || 'banner') !== filterPosition) return false;
    }
    return true;
  });

  const totalViews = notifications.reduce((acc, n) => acc + (n.viewsCount || 0), 0);
  const totalClicks = notifications.reduce((acc, n) => acc + (n.clicksCount || 0), 0);
  const activeCount = notifications.filter((n) => n.isActive).length;

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newNotif: Partial<PlatformNotification> = {
      title: title.trim(),
      content: content.trim(),
      type,
      targetAudience,
      targetPanels,
      displayPosition,
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
    setBadgeText('پیشنهاد ویژه');
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

  const getPositionLabel = (pos?: string) => {
    switch (pos) {
      case 'popup':
        return { label: 'پاپ‌آپ مودال', icon: Layers, color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'toast':
        return { label: 'نوتیفیکیشن شناور', icon: Bell, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'card':
        return { label: 'کارت درون صفحه', icon: Layout, color: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'banner':
      default:
        return { label: 'نوار ثابت بالای صفحه', icon: Megaphone, color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
  };

  const getPanelLabel = (panel?: string) => {
    switch (panel) {
      case 'customer':
        return { label: 'پنل مشتریان', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'salon':
        return { label: 'پنل سالن‌دار و متخصصین', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'admin':
        return { label: 'پنل ادمین', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'all':
      default:
        return { label: 'همه پنل‌ها (عمومی)', color: 'bg-neutral-100 text-neutral-800 border-neutral-300' };
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-[#E7E2DA] shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[#173B3F] font-serif flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#D9A2B0]" />
            مدیریت اعلانات، تبلیغات و پیام‌های سیستمی
          </h2>
          <p className="text-xs text-[#6C6C6C] mt-1">
            تعیین نحوه نمایش (نوار ثابت، پاپ‌آپ، نوتیفیکیشن) و انتخاب پنل‌های مقصد
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-[#173B3F] text-white px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-[#122e31] active:scale-98 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          ایجاد اعلان / تبلیغ جدید
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E7E2DA] shadow-2xs">
          <div className="flex items-center justify-between text-[#6C6C6C] mb-1">
            <span className="text-[11px] font-bold">کل اعلان‌ها</span>
            <Bell className="w-4 h-4 text-[#173B3F]" />
          </div>
          <div className="text-lg font-bold text-[#173B3F]">{toPersianDigits(notifications.length)}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E2DA] shadow-2xs">
          <div className="flex items-center justify-between text-[#6C6C6C] mb-1">
            <span className="text-[11px] font-bold">اعلان‌های فعال</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-600">{toPersianDigits(activeCount)}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E2DA] shadow-2xs">
          <div className="flex items-center justify-between text-[#6C6C6C] mb-1">
            <span className="text-[11px] font-bold">تعداد کل بازدیدها</span>
            <Eye className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-blue-600">{toPersianDigits(totalViews)}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E2DA] shadow-2xs">
          <div className="flex items-center justify-between text-[#6C6C6C] mb-1">
            <span className="text-[11px] font-bold">تعداد کل کلیک‌ها</span>
            <MousePointerClick className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-amber-600">{toPersianDigits(totalClicks)}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E7E2DA] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#6C6C6C] font-bold flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            فیلتر پنل:
          </span>
          <button
            onClick={() => setFilterAudience('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterAudience === 'all' ? 'bg-[#173B3F] text-white' : 'bg-[#FAF7F2] text-[#6C6C6C] hover:bg-[#E7E2DA]'
            }`}
          >
            همه
          </button>
          <button
            onClick={() => setFilterAudience('customer')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterAudience === 'customer' ? 'bg-[#173B3F] text-white' : 'bg-[#FAF7F2] text-[#6C6C6C] hover:bg-[#E7E2DA]'
            }`}
          >
            مشتریان
          </button>
          <button
            onClick={() => setFilterAudience('salon')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterAudience === 'salon' ? 'bg-[#173B3F] text-white' : 'bg-[#FAF7F2] text-[#6C6C6C] hover:bg-[#E7E2DA]'
            }`}
          >
            سالنداران و متخصصین
          </button>
          <button
            onClick={() => setFilterAudience('admin')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterAudience === 'admin' ? 'bg-[#173B3F] text-white' : 'bg-[#FAF7F2] text-[#6C6C6C] hover:bg-[#E7E2DA]'
            }`}
          >
            ادمین
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#6C6C6C] font-bold">محل نمایش:</span>
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="h-8 px-2.5 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] text-xs font-bold text-[#173B3F] outline-none"
          >
            <option value="all">همه موقعیت‌ها</option>
            <option value="banner">نوار ثابت بالای صفحه</option>
            <option value="popup">پاپ‌آپ مودال</option>
            <option value="toast">نوتیفیکیشن گوشه</option>
            <option value="card">کارت درون صفحه</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="grid gap-4">
        {filteredNotifs.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-[#E7E2DA] text-center space-y-3">
            <Megaphone className="w-12 h-12 text-[#6C6C6C]/40 mx-auto" />
            <h3 className="text-sm font-bold text-[#173B3F]">اعلانی در این بخش وجود ندارد</h3>
            <p className="text-xs text-[#6C6C6C]">
              با زدن دکمه «ایجاد اعلان جدید» می‌توانید اطلاعیه یا پیام تبلیغاتی برای پنل مشتریان، سالن یا ادمین ثبت کنید.
            </p>
          </div>
        ) : (
          filteredNotifs.map((notif) => {
            const posInfo = getPositionLabel(notif.displayPosition);
            const panelInfo = getPanelLabel(notif.targetPanels || notif.targetAudience);
            const PosIcon = posInfo.icon;

            return (
              <div
                key={notif.id}
                className={`bg-white p-6 rounded-[28px] border transition-all relative overflow-hidden group shadow-2xs ${
                  notif.isActive ? 'border-[#E7E2DA]' : 'border-dashed border-[#D5CEC4] opacity-75'
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Active Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        notif.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${notif.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                        {notif.isActive ? 'فعال در سیستم' : 'غیرفعال'}
                      </span>

                      {/* Display Position Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${posInfo.color}`}>
                        <PosIcon className="w-3 h-3" />
                        {posInfo.label}
                      </span>

                      {/* Target Panels Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${panelInfo.color}`}>
                        {panelInfo.label}
                      </span>

                      {/* Custom Badge */}
                      {notif.badgeText && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF7F2] text-[#173B3F] border border-[#E7E2DA]">
                          {notif.badgeText}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-[#6C6C6C] bg-[#FAF7F2] px-2.5 py-0.5 rounded-full border border-[#E7E2DA]/60 mr-auto">
                        <Calendar className="w-3 h-3" />
                        {notif.createdAt ? formatJalaliDate(notif.createdAt) : 'امروز'}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#173B3F] mb-1">{notif.title}</h3>
                      <p className="text-xs text-[#6C6C6C] leading-relaxed whitespace-pre-line">{notif.content}</p>
                    </div>

                    {notif.actionUrl && (
                      <div className="flex items-center gap-2 text-[11px] text-[#173B3F] bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E7E2DA] w-fit">
                        <ExternalLink className="w-3.5 h-3.5 text-[#D9A2B0]" />
                        <span className="font-bold">دکمه اقدام:</span>
                        <span>«{notif.actionText || 'مشاهده'}»</span>
                        <span className="text-[#6C6C6C] font-mono text-[10px]">({notif.actionUrl})</span>
                      </div>
                    )}

                    {/* Stats bar */}
                    <div className="flex items-center gap-4 pt-1 text-[11px] text-[#6C6C6C]">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        بازدید: <strong className="text-[#173B3F]">{toPersianDigits(notif.viewsCount || 0)}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="w-3.5 h-3.5 text-amber-600" />
                        کلیک: <strong className="text-[#173B3F]">{toPersianDigits(notif.clicksCount || 0)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-row md:flex-col items-center justify-end gap-2 shrink-0 border-t md:border-t-0 md:border-r border-[#E7E2DA] pt-4 md:pt-0 md:pr-6">
                    <button
                      onClick={() => setPreviewNotif(notif)}
                      className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
                      title="پیش‌نمایش زنده در صفحه"
                    >
                      <Eye className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => toggleNotification(notif.id)}
                      className={`p-2.5 rounded-2xl transition-all cursor-pointer ${
                        notif.isActive
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-[#FAF7F2] text-[#6C6C6C] hover:bg-[#E7E2DA]'
                      }`}
                      title={notif.isActive ? 'غیرفعال کردن اعلان' : 'فعال کردن اعلان'}
                    >
                      <Radio className={`w-5 h-5 ${notif.isActive ? 'animate-pulse text-emerald-600' : ''}`} />
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
                      onClick={() => {
                        if (confirm('آیا از حذف دائمی این اعلان اطمینان دارید؟')) {
                          deleteNotification(notif.id);
                        }
                      }}
                      className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all cursor-pointer"
                      title="حذف دائمی"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE NOTIFICATION MODAL */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl border border-[#E7E2DA] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E7E2DA] pb-3">
              <h3 className="text-sm font-bold text-[#173B3F] font-serif flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D9A2B0]" />
                ایجاد اعلان، بنر تبلیغاتی یا پاپ‌آپ جدید
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 text-[#6C6C6C] hover:text-[#173B3F] rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNotification} className="space-y-4 text-xs">
              {/* Title & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-[#1C1C1C] block mb-1">عنوان پیام / تیتر تبلیغاتی: *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: جشنواره ویژه تخفیف سالن‌های VIP"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">برچسب (Badge):</label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="مثال: تخفیف ویژه"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                  />
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">متن کامل اطلاعیه / پیام: *</label>
                <textarea
                  required
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="متن کامل پیام جهت نمایش به کاربران در پنل..."
                  className="w-full p-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none resize-none"
                />
              </div>

              {/* TARGET PANELS & DISPLAY POSITION */}
              <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-3">
                <div className="font-bold text-[#173B3F] flex items-center gap-1.5 text-xs">
                  <Layers className="w-4 h-4 text-[#D9A2B0]" />
                  تنظیمات مقصد و مکان نمایش (ضروری)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1C1C1C] block mb-1">نمایش در کدام پنل‌ها؟</label>
                    <select
                      value={targetPanels}
                      onChange={(e) => setTargetPanels(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none bg-white font-medium"
                    >
                      <option value="customer">👤 فقط پنل مشتریان (سایت و اپ)</option>
                      <option value="salon">🏪 فقط پنل سالن‌دار و متخصصین</option>
                      <option value="admin">🛡️ فقط پنل مدیریت کل (ادمین)</option>
                      <option value="all">🌐 همه پنل‌ها (عمومی)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#1C1C1C] block mb-1">محل و نحوه نمایش پیام:</label>
                    <select
                      value={displayPosition}
                      onChange={(e) => setDisplayPosition(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none bg-white font-medium"
                    >
                      <option value="banner">📌 نوار ثابت در بالای صفحه (Top Banner)</option>
                      <option value="popup">🪟 پاپ‌آپ مودال خوش‌آمدگویی (Popup Modal)</option>
                      <option value="toast">🔔 نوتیفیکیشن شناور گوشه صفحه (Toast)</option>
                      <option value="card">🗂️ کارت درون صفحه سالن‌ها (Marketplace Card)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1C1C1C] block mb-1">نوع محتوا و تم رنگی:</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none bg-white"
                    >
                      <option value="promotional">🌟 تبلیغاتی / جشنواره (طلایی/کهربایی)</option>
                      <option value="discount">🏷️ کد تخفیف / هدیه (سبز زمردی)</option>
                      <option value="informational">📢 اطلاع‌رسانی رسمی (سرمه‌ای بویا)</option>
                      <option value="alert">⚠️ هشدار / اطلاعیه مهم (قرمز/رز)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#1C1C1C] block mb-1">کانال ارسال:</label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none bg-white"
                    >
                      <option value="in_app">درون برنامه‌ای (نمایش در پنل)</option>
                      <option value="sms">فقط پیامک (SMS به شماره‌ها)</option>
                      <option value="both">هم درون برنامه‌ای و هم پیامک</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Button & URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">لینک اقدام (Action URL - اختیاری):</label>
                  <input
                    type="text"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="مثال: /salons یا /profile یا https://..."
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">متن روی دکمه اقدام:</label>
                  <input
                    type="text"
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value)}
                    placeholder="مثال: مشاهده تخفیف‌ها / رزرو آنی"
                    className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] focus:border-[#173B3F] outline-none"
                  />
                </div>
              </div>

              {/* LIVE PREVIEW BOX */}
              <div className="border border-[#E7E2DA] rounded-2xl p-4 bg-[#FAF7F2] space-y-2">
                <div className="flex items-center justify-between text-[#6C6C6C] text-[11px] font-bold">
                  <span>پیش‌نمایش زنده در پنل:</span>
                  <span>حالت: {displayPosition === 'banner' ? 'نوار بالای صفحه' : displayPosition === 'popup' ? 'پاپ‌آپ مودال' : displayPosition === 'toast' ? 'نوتیفیکیشن گوشه' : 'کارت'}</span>
                </div>

                {displayPosition === 'banner' ? (
                  <div className={`p-3 rounded-xl flex items-center justify-between gap-3 text-white text-xs ${
                    type === 'discount' ? 'bg-gradient-to-r from-emerald-600 to-teal-700' :
                    type === 'promotional' ? 'bg-gradient-to-r from-amber-600 to-rose-700' :
                    type === 'alert' ? 'bg-gradient-to-r from-rose-700 to-red-800' :
                    'bg-gradient-to-r from-[#173B3F] to-[#255257]'
                  }`}>
                    <div className="flex items-center gap-2 truncate">
                      <Megaphone className="w-4 h-4 shrink-0" />
                      {badgeText && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 border border-white/30 shrink-0">
                          {badgeText}
                        </span>
                      )}
                      <strong className="truncate">{title || 'عنوان پیام'}</strong>
                      <span className="opacity-90 truncate hidden sm:inline">- {content || 'متن اعلان...'}</span>
                    </div>
                    {actionText && (
                      <span className="px-2.5 py-1 rounded-lg bg-white text-[#173B3F] text-[10px] font-bold shrink-0">
                        {actionText}
                      </span>
                    )}
                  </div>
                ) : displayPosition === 'popup' ? (
                  <div className="bg-white border border-[#E7E2DA] p-4 rounded-2xl text-center space-y-2 max-w-sm mx-auto shadow-md">
                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF7F2] text-[#173B3F] border border-[#E7E2DA]">
                      {badgeText || 'پیشنهاد ویژه'}
                    </span>
                    <h4 className="font-bold text-[#173B3F] text-xs">{title || 'عنوان پاپ‌آپ'}</h4>
                    <p className="text-[11px] text-[#6C6C6C] line-clamp-2">{content || 'متن کامل پیام در این قسمت نمایش داده خواهد شد...'}</p>
                    <button type="button" className="w-full py-2 bg-[#173B3F] text-white rounded-xl text-[11px] font-bold">
                      {actionText || 'مشاهده و رزرو'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-[#E7E2DA] p-3 rounded-xl max-w-xs shadow-sm flex items-start gap-2.5">
                    <Bell className="w-4 h-4 text-[#173B3F] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[#173B3F] text-xs">{title || 'عنوان نوتیفیکیشن'}</div>
                      <div className="text-[10px] text-[#6C6C6C] line-clamp-1">{content || 'متن پیام...'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#173B3F] text-white py-3 rounded-2xl text-xs font-bold hover:bg-[#122e31] active:scale-98 transition-all cursor-pointer shadow-md"
                >
                  ثبت و انتشار رسمی در پنل‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-6 bg-[#FAF7F2] border border-[#E7E2DA] text-[#6C6C6C] py-3 rounded-2xl text-xs font-bold hover:bg-[#E7E2DA] transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK LIVE PREVIEW MODAL */}
      {previewNotif && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl border border-[#E7E2DA] p-6 max-w-md w-full space-y-4 shadow-2xl relative text-center">
            <button
              onClick={() => setPreviewNotif(null)}
              className="absolute top-4 left-4 p-1.5 rounded-full bg-[#FAF7F2] text-[#6C6C6C] hover:text-[#173B3F] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
              <Sparkles className="w-7 h-7" />
            </div>

            {previewNotif.badgeText && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF7F2] text-[#173B3F] border border-[#E7E2DA]">
                {previewNotif.badgeText}
              </span>
            )}

            <h3 className="text-base font-bold text-[#173B3F] font-serif">{previewNotif.title}</h3>
            <p className="text-xs text-[#6C6C6C] leading-relaxed whitespace-pre-line">{previewNotif.content}</p>

            <div className="pt-2 flex flex-col gap-2">
              {previewNotif.actionUrl && (
                <a
                  href={previewNotif.actionUrl}
                  onClick={() => setPreviewNotif(null)}
                  className="w-full py-2.5 bg-[#173B3F] text-white rounded-2xl text-xs font-bold hover:bg-[#122e31] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>{previewNotif.actionText || 'مشاهده'}</span>
                  <ChevronLeft className="w-4 h-4" />
                </a>
              )}
              <button
                onClick={() => setPreviewNotif(null)}
                className="w-full py-2 bg-[#FAF7F2] border border-[#E7E2DA] text-[#6C6C6C] rounded-2xl text-xs font-bold hover:bg-[#E7E2DA] transition-all cursor-pointer"
              >
                بستن پیش‌نمایش
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
