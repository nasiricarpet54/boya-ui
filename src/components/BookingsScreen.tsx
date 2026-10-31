import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Phone,
  Navigation,
  Star,
  MessageSquare,
  Bell,
  AlertCircle,
  X,
  Sparkles,
  Radio,
  Check,
  RotateCcw
} from 'lucide-react';
import { Booking } from '../data/marketplaceData';
import { formatPrice, toPersianDigits } from '../utils/persianUtils';

export interface BookingAlertNotification {
  id: string;
  bookingId: string;
  salonName: string;
  serviceName: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending';
  time: string;
}

interface BookingsScreenProps {
  bookings: Booking[];
  onCancelBooking: (id: string) => void;
  onNavigateToSalons: () => void;
  latestAlert?: BookingAlertNotification | null;
  onUpdateBookingStatus?: (bookingId: string, newStatus: 'confirmed' | 'completed' | 'cancelled') => void;
}

export const BookingsScreen: React.FC<BookingsScreenProps> = ({
  bookings,
  onCancelBooking,
  onNavigateToSalons,
  latestAlert,
  onUpdateBookingStatus,
}) => {
  const [filterTab, setFilterTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [reviewModalBooking, setReviewModalBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  // Active Toast Notification State
  const [toastNotification, setToastNotification] = useState<BookingAlertNotification | null>(null);
  const [showToast, setShowToast] = useState<boolean>(false);

  // History of recent alerts in this session
  const [recentAlerts, setRecentAlerts] = useState<BookingAlertNotification[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);

  // Ref to track previous statuses of all bookings
  const prevStatusesRef = useRef<Map<string, 'confirmed' | 'completed' | 'cancelled' | 'pending'>>(new Map());
  const isInitialMount = useRef(true);

  // Helper to trigger a toast
  const triggerToast = (alert: BookingAlertNotification) => {
    setToastNotification(alert);
    setShowToast(true);
    setRecentAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)].slice(0, 5));

    // Auto dismiss after 6.5 seconds
    const timer = setTimeout(() => {
      setShowToast(false);
    }, 6500);

    return () => clearTimeout(timer);
  };

  // Watch for external alert passed via props
  useEffect(() => {
    if (latestAlert) {
      triggerToast(latestAlert);
    }
  }, [latestAlert]);

  // Reactive diff: Detect any status changes made by salon or specialist in bookings array
  useEffect(() => {
    if (isInitialMount.current) {
      // First render: populate current statuses
      bookings.forEach((b) => {
        prevStatusesRef.current.set(b.id, b.status);
      });
      isInitialMount.current = false;
      return;
    }

    // Check for status differences
    bookings.forEach((b) => {
      const prevStatus = prevStatusesRef.current.get(b.id);
      if (prevStatus && prevStatus !== b.status) {
        // Status has changed! Trigger live toast
        const newAlert: BookingAlertNotification = {
          id: `diff-${b.id}-${Date.now()}`,
          bookingId: b.id,
          salonName: b.salonName,
          serviceName: b.serviceName,
          status: b.status,
          time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        };
        triggerToast(newAlert);
      }
      // Update ref
      prevStatusesRef.current.set(b.id, b.status);
    });
  }, [bookings]);

  // Simulation handler for easy testing
  const handleSimulateStatus = (bookingId: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    if (onUpdateBookingStatus) {
      onUpdateBookingStatus(bookingId, status);
    } else {
      const target = bookings.find((b) => b.id === bookingId);
      if (target) {
        triggerToast({
          id: `sim-${Date.now()}`,
          bookingId,
          salonName: target.salonName,
          serviceName: target.serviceName,
          status,
          time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        });
      }
    }
  };

  const activeBookings = bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');

  const displayedBookings =
    filterTab === 'active'
      ? activeBookings
      : filterTab === 'completed'
      ? completedBookings
      : cancelledBookings;

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitted(true);
    setTimeout(() => {
      setReviewSubmitted(false);
      setReviewModalBooking(null);
      setReviewComment('');
    }, 1500);
  };

  return (
    <div className="space-y-5 pb-24 relative">
      {/* ========================================================
          LIVE TOAST NOTIFICATION BANNER (FLOATING AT TOP)
          Notifies the user immediately upon status change by salon
      ======================================================== */}
      {showToast && toastNotification && (
        <div className="fixed top-18 right-4 left-4 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-50 max-w-md w-full animate-bounceIn">
          <div
            className={`p-4 rounded-3xl shadow-2xl border-2 backdrop-blur-md transition-all flex items-start gap-3.5 ${
              toastNotification.status === 'confirmed'
                ? 'bg-[#EAF2EF]/95 border-[#6F9A8D] text-[#173B3F]'
                : toastNotification.status === 'cancelled'
                ? 'bg-[#F8ECEE]/95 border-[#B35D67] text-[#1C1C1C]'
                : 'bg-[#EDF4F5]/95 border-[#5E8B95] text-[#173B3F]'
            }`}
          >
            {/* Status Icon */}
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                toastNotification.status === 'confirmed'
                  ? 'bg-[#2E5E52] text-white'
                  : toastNotification.status === 'cancelled'
                  ? 'bg-[#B35D67] text-white'
                  : 'bg-[#24545F] text-white'
              }`}
            >
              {toastNotification.status === 'confirmed' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : toastNotification.status === 'cancelled' ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>

            {/* Notification Body */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/70 shadow-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#173B3F] animate-ping" />
                  <span>اطلاع‌رسانی آنی وضعیت سالن</span>
                </span>
                <span className="text-[10px] font-mono text-[#6C6C6C]">
                  {toastNotification.time}
                </span>
              </div>

              <h4 className="text-xs font-bold leading-tight">
                {toastNotification.status === 'confirmed' && (
                  <span className="text-[#2E5E52]">نوبت شما توسط سالن تایید شد! ✓</span>
                )}
                {toastNotification.status === 'cancelled' && (
                  <span className="text-[#B35D67]">نوبت شما توسط سالن لغو گردید. ✕</span>
                )}
                {toastNotification.status === 'completed' && (
                  <span className="text-[#24545F]">خدمت شما با موفقیت به پایان رسید. ★</span>
                )}
              </h4>

              <p className="text-[11px] text-[#4A4A4A] leading-relaxed">
                سالن «<strong>{toastNotification.salonName}</strong>» وضعیت نوبت خدمت «{toastNotification.serviceName}» را به‌روزرسانی کرد.
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => setShowToast(false)}
              className="w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-[#6C6C6C] shrink-0 transition-colors shadow-xs"
              title="بستن اعلان"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Screen Title & Live Notification Indicator */}
      <div className="flex items-start justify-between px-1">
        <div>
          <h1 className="text-xl font-extrabold text-[#173B3F] font-serif">
            نوبت‌های من
          </h1>
          <p className="text-xs text-[#6C6C6C] mt-0.5">
            پیگیری سانس‌های رزرو شده، رهگیری پیامکی و هشدارهای تغییر وضعیت سالن
          </p>
        </div>

        {recentAlerts.length > 0 && (
          <button
            onClick={() => setShowNotificationCenter(!showNotificationCenter)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E7E2DA] hover:border-[#173B3F] text-xs font-bold text-[#173B3F] shadow-xs transition-all relative"
          >
            <Bell className="w-3.5 h-3.5 text-[#D9A2B0]" />
            <span>اعلان‌های سالن ({toPersianDigits(recentAlerts.length)})</span>
            <span className="w-2 h-2 rounded-full bg-[#B35D67]" />
          </button>
        )}
      </div>

      {/* Recent Alerts Drawer (If opened by user) */}
      {showNotificationCenter && recentAlerts.length > 0 && (
        <div className="bg-white rounded-3xl p-4 border border-[#173B3F]/30 space-y-3 shadow-md animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-2">
            <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-[#D9A2B0]" />
              <span>تاریخچه هشدارهای تغییر وضعیت سالن:</span>
            </span>
            <button
              onClick={() => setRecentAlerts([])}
              className="text-[11px] text-[#6C6C6C] hover:text-[#B35D67]"
            >
              پاک کردن تاریخچه
            </button>
          </div>

          <div className="space-y-2">
            {recentAlerts.map((alt) => (
              <div
                key={alt.id}
                className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA] text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      alt.status === 'confirmed'
                        ? 'bg-[#2E5E52]'
                        : alt.status === 'cancelled'
                        ? 'bg-[#B35D67]'
                        : 'bg-[#24545F]'
                    }`}
                  />
                  <span>
                    سالن «{alt.salonName}»: {alt.serviceName} ({alt.status === 'confirmed' ? 'تایید' : alt.status === 'cancelled' ? 'لغو' : 'انجام'})
                  </span>
                </div>
                <span className="text-[10px] text-[#6C6C6C] font-mono">{alt.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Segmented Filter Controls */}
      <div className="flex p-1 bg-white rounded-2xl border border-[#E7E2DA] shadow-xs">
        <button
          onClick={() => setFilterTab('active')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'active'
              ? 'bg-[#173B3F] text-white shadow-xs'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          نوبت‌های فعال ({toPersianDigits(activeBookings.length)})
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'completed'
              ? 'bg-[#173B3F] text-white shadow-xs'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          انجام شده ({toPersianDigits(completedBookings.length)})
        </button>
        <button
          onClick={() => setFilterTab('cancelled')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'cancelled'
              ? 'bg-[#173B3F] text-white shadow-xs'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          لغو شده ({toPersianDigits(cancelledBookings.length)})
        </button>
      </div>

      {/* Bookings List */}
      {displayedBookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E2DA] p-6 space-y-3 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F0EF] border border-[#173B3F]/20 flex items-center justify-center mx-auto text-[#173B3F]">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#173B3F]">
            {filterTab === 'active'
              ? 'در حال حاضر نوبت فعالی ندارید'
              : 'هیچ نوبتی در این بخش ثبت نشده است'}
          </h3>
          <p className="text-xs text-[#6C6C6C] max-w-xs mx-auto">
            از بخش سالن‌ها و خدمات می‌توانید سالن دلخواه خود را پیدا کرده و سانس مناسب را رزرو کنید.
          </p>
          {filterTab === 'active' && (
            <button
              onClick={onNavigateToSalons}
              className="mt-2 px-6 py-2.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] transition-colors shadow-md shadow-[#173B3F]/20"
            >
              کشف و رزرو سالن‌ها
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedBookings.map((bkg) => (
            <div
              key={bkg.id}
              className="bg-white rounded-2xl p-4 border border-[#E7E2DA] hover:border-[#173B3F] transition-all space-y-3 shadow-xs"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        bkg.status === 'confirmed'
                          ? 'text-[#2E5E52] bg-[#EAF2EF] border-[#6F9A8D]/40'
                          : bkg.status === 'completed'
                          ? 'text-[#24545F] bg-[#EDF4F5] border-[#5E8B95]/40'
                          : 'text-[#B35D67] bg-[#F8ECEE] border-[#B35D67]/40'
                      }`}
                    >
                      {bkg.status === 'confirmed'
                        ? 'تایید شده توسط سالن'
                        : bkg.status === 'completed'
                        ? 'انجام شده'
                        : 'لغو شده'}
                    </span>
                    {bkg.isMobileBooking && (
                      <span className="text-[10px] font-bold text-[#173B3F] bg-[#E8F0EF] px-2 py-0.5 rounded-full border border-[#173B3F]/20">
                        خدمت در محل (Mobile)
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#173B3F] mt-1.5 font-serif">
                    {bkg.salonName}
                  </h3>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-[#173B3F] block">
                    {formatPrice(bkg.price)}
                  </span>
                  <span className="text-[10px] text-[#6C6C6C]">پرداخت در محل سالن</span>
                </div>
              </div>

              {/* Details Box */}
              <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E7E2DA] text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#6C6C6C]">خدمت درخواستی:</span>
                  <span className="font-bold text-[#1C1C1C]">{bkg.serviceName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6C6C6C]">متخصص مجری:</span>
                  <span className="font-bold text-[#173B3F]">{bkg.specialistName}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-[#E7E2DA]/60">
                  <span className="text-[#6C6C6C]">تاریخ و زمان سانس:</span>
                  <span className="font-bold text-[#1C1C1C]">
                    {bkg.date} - ساعت {toPersianDigits(bkg.time)} ({toPersianDigits(bkg.durationMinutes)} دقیقه)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6C6C6C]">کد رهگیری پیامکی:</span>
                  <span className="font-mono font-bold text-[#173B3F]">{toPersianDigits(bkg.trackingCode)}</span>
                </div>
                {bkg.customerAddress && (
                  <div className="text-[11px] text-[#6C6C6C] pt-1 border-t border-[#E7E2DA]/40">
                    محل خدمت: <strong className="text-[#1C1C1C]">{bkg.customerAddress}</strong>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E7E2DA]/60">
                <div className="flex items-center gap-2">
                  <a
                    href={`https://neshan.org/maps?q=${encodeURIComponent(bkg.salonAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FAF7F2] border border-[#E7E2DA] text-[11px] text-[#173B3F] hover:border-[#173B3F]"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#173B3F]" />
                    <span>مسیریابی روی نشان</span>
                  </a>

                  <button
                    onClick={() => setReviewModalBooking(bkg)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#E7E2DA] text-[11px] text-[#173B3F] hover:border-[#173B3F]"
                  >
                    <Star className="w-3.5 h-3.5 text-[#C99558]" />
                    <span>ثبت نظر و امتیاز</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {bkg.status === 'confirmed' && (
                    <button
                      onClick={() => onCancelBooking(bkg.id)}
                      className="text-xs text-[#B35D67] hover:underline font-bold"
                    >
                      لغو این نوبت
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Simulator Bar for testing Salon notifications */}
              <div className="pt-2 border-t border-dashed border-[#E7E2DA] flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <span className="text-[#6C6C6C] flex items-center gap-1">
                  <Radio className="w-3 h-3 text-[#173B3F]" />
                  <span>تست تغییر وضعیت توسط سالن:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {bkg.status !== 'confirmed' && (
                    <button
                      onClick={() => handleSimulateStatus(bkg.id, 'confirmed')}
                      className="px-2 py-0.5 rounded-md bg-[#EAF2EF] text-[#2E5E52] border border-[#6F9A8D]/40 font-bold hover:bg-[#d8e8e3]"
                    >
                      تایید توسط سالن
                    </button>
                  )}
                  {bkg.status !== 'cancelled' && (
                    <button
                      onClick={() => handleSimulateStatus(bkg.id, 'cancelled')}
                      className="px-2 py-0.5 rounded-md bg-[#F8ECEE] text-[#B35D67] border border-[#B35D67]/40 font-bold hover:bg-[#f2dde0]"
                    >
                      لغو توسط سالن
                    </button>
                  )}
                  {bkg.status !== 'completed' && (
                    <button
                      onClick={() => handleSimulateStatus(bkg.id, 'completed')}
                      className="px-2 py-0.5 rounded-md bg-[#EDF4F5] text-[#24545F] border border-[#5E8B95]/40 font-bold hover:bg-[#d8e5e7]"
                    >
                      تکمیل خدمت
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review & Rating Modal */}
      {reviewModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-3">
              <h4 className="text-sm font-bold text-[#173B3F]">
                ثبت نظر و امتیاز درباره {reviewModalBooking.salonName}
              </h4>
              <button
                onClick={() => setReviewModalBooking(null)}
                className="w-7 h-7 rounded-full bg-[#FAF7F2] flex items-center justify-center text-[#6C6C6C]"
              >
                ✕
              </button>
            </div>

            {reviewSubmitted ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#6F9A8D] mx-auto" />
                <p className="text-xs font-bold text-[#173B3F]">
                  نظر شما با موفقیت ثبت شد و پس از بررسی منتشر خواهد شد.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-3">
                <div className="text-center">
                  <span className="text-xs text-[#6C6C6C] block mb-2">امتیاز شما به کیفیت خدمت و متخصص:</span>
                  <div className="flex justify-center gap-1 text-[#C99558]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setReviewRating(s)}
                        className="p-1"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            s <= reviewRating ? 'fill-current' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1C1C1C] block mb-1">
                    متن تجربه شما از خدمت:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="کیفیت خدمات، رفتار پرسنل، رعایت بهداشت و زمان‌بندی..."
                    className="w-full p-2.5 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white font-bold text-xs shadow-md shadow-[#173B3F]/20"
                >
                  ارسال نظر برای تایید در پلتفرم
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
