import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Navigation,
  Star,
  Bell,
  X,
  Sparkles,
  Radio,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Booking } from '../../../shared/data/marketplaceData';
import { formatPrice, toPersianDigits } from '../../../shared/utils/persianUtils';
import { useDataStore } from '../../../shared/stores/dataStore';

export interface BookingAlertNotification {
  id: string;
  bookingId: string;
  salonName: string;
  serviceName: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending';
  time: string;
}

export const BookingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { bookings, updateBookingStatus, latestBookingAlert } = useDataStore();

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

  // Watch for external alert passed via store
  useEffect(() => {
    if (latestBookingAlert) {
      triggerToast(latestBookingAlert);
    }
  }, [latestBookingAlert]);

  // Reactive diff: Detect any status changes made by salon or specialist in bookings array
  useEffect(() => {
    if (isInitialMount.current) {
      bookings.forEach((b) => {
        prevStatusesRef.current.set(b.id, b.status);
      });
      isInitialMount.current = false;
      return;
    }

    bookings.forEach((b) => {
      const prevStatus = prevStatusesRef.current.get(b.id);
      if (prevStatus && prevStatus !== b.status) {
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
      prevStatusesRef.current.set(b.id, b.status);
    });
  }, [bookings]);

  const handleSimulateStatus = (bookingId: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    updateBookingStatus(bookingId, status);
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

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/70 shadow-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#173B3F] animate-ping" />
                  <span>اطلاع‌رسانی آنی</span>
                </span>
                <span className="text-[10px] font-mono text-[#6C6C6C]">
                  {toastNotification.time}
                </span>
              </div>

              <h4 className="text-xs font-bold leading-tight">
                {toastNotification.status === 'confirmed' && <span className="text-[#2E5E52]">نوبت تایید شد! ✓</span>}
                {toastNotification.status === 'cancelled' && <span className="text-[#B35D67]">نوبت لغو گردید. ✕</span>}
                {toastNotification.status === 'completed' && <span className="text-[#24545F]">خدمت به پایان رسید. ★</span>}
              </h4>

              <p className="text-[11px] text-[#4A4A4A] leading-relaxed">
                سالن «<strong>{toastNotification.salonName}</strong>» وضعیت نوبت خدمت «{toastNotification.serviceName}» را به‌روزرسانی کرد.
              </p>
            </div>

            <button
              onClick={() => setShowToast(false)}
              className="w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-[#6C6C6C] shrink-0 transition-colors shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between px-1">
        <div>
          <h1 className="text-xl font-extrabold text-[#173B3F] font-serif">نوبت‌های من</h1>
          <p className="text-xs text-[#6C6C6C] mt-0.5">پیگیری سانس‌های رزرو شده و هشدارهای تغییر وضعیت</p>
        </div>

        {recentAlerts.length > 0 && (
          <button
            onClick={() => setShowNotificationCenter(!showNotificationCenter)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E7E2DA] hover:border-[#173B3F] text-xs font-bold text-[#173B3F] shadow-xs transition-all relative"
          >
            <Bell className="w-3.5 h-3.5 text-[#D9A2B0]" />
            <span>اعلان‌ها ({toPersianDigits(recentAlerts.length)})</span>
          </button>
        )}
      </div>

      <div className="flex p-1 bg-white rounded-2xl border border-[#E7E2DA] shadow-xs">
        {(['active', 'completed', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              filterTab === tab
                ? 'bg-[#173B3F] text-white shadow-xs'
                : 'text-[#6C6C6C] hover:text-[#173B3F]'
            }`}
          >
            {tab === 'active' ? 'فعال' : tab === 'completed' ? 'انجام شده' : 'لغو شده'} ({toPersianDigits(bookings.filter(b => tab === 'active' ? (b.status === 'confirmed' || b.status === 'pending') : b.status === tab).length)})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {displayedBookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E2DA] p-6 space-y-3 shadow-xs">
            <Calendar className="w-12 h-12 text-[#173B3F] mx-auto opacity-20" />
            <h3 className="text-base font-bold text-[#173B3F]">نوبتی یافت نشد</h3>
            <button
              onClick={() => navigate({ to: '/salons' })}
              className="mt-2 px-6 py-2.5 rounded-full bg-[#173B3F] text-white text-xs font-bold"
            >
              جستجوی سالن‌ها
            </button>
          </div>
        ) : (
          displayedBookings.map((bkg) => (
            <div key={bkg.id} className="bg-white rounded-2xl p-4 border border-[#E7E2DA] hover:border-[#173B3F] transition-all space-y-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    bkg.status === 'confirmed' ? 'text-[#2E5E52] bg-[#EAF2EF] border-[#6F9A8D]/40' : 
                    bkg.status === 'completed' ? 'text-[#24545F] bg-[#EDF4F5] border-[#5E8B95]/40' : 
                    'text-[#B35D67] bg-[#F8ECEE] border-[#B35D67]/40'
                  }`}>
                    {bkg.status === 'confirmed' ? 'تایید شده' : bkg.status === 'completed' ? 'انجام شده' : 'لغو شده'}
                  </span>
                  <h3 className="text-base font-bold text-[#173B3F] mt-1.5 font-serif">{bkg.salonName}</h3>
                </div>
                <div className="text-left font-bold text-[#173B3F]">{formatPrice(bkg.price)}</div>
              </div>

              <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E7E2DA] text-xs space-y-2">
                <div className="flex justify-between"><span>خدمت:</span><strong>{bkg.serviceName}</strong></div>
                <div className="flex justify-between"><span>زمان:</span><strong>{bkg.date} - {toPersianDigits(bkg.time)}</strong></div>
                <div className="flex justify-between"><span>کد رهگیری:</span><strong className="font-mono">{toPersianDigits(bkg.trackingCode)}</strong></div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-[#E7E2DA]/60">
                <a href={`https://neshan.org/maps?q=${encodeURIComponent(bkg.salonAddress)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FAF7F2] border border-[#E7E2DA] text-[11px]">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>مسیریابی</span>
                </a>
                
                <div className="flex gap-2">
                   {bkg.status === 'confirmed' && (
                     <button onClick={() => updateBookingStatus(bkg.id, 'cancelled')} className="text-xs text-[#B35D67] font-bold">لغو نوبت</button>
                   )}
                   <button onClick={() => setReviewModalBooking(bkg)} className="text-xs text-[#173B3F] font-bold">ثبت نظر</button>
                </div>
              </div>

              {/* Simulation for testing */}
              <div className="pt-2 border-t border-dashed border-[#E7E2DA] flex gap-2">
                <button onClick={() => handleSimulateStatus(bkg.id, 'confirmed')} className="text-[9px] bg-[#EAF2EF] px-1.5 py-0.5 rounded border border-[#6F9A8D]/20">تایید</button>
                <button onClick={() => handleSimulateStatus(bkg.id, 'cancelled')} className="text-[9px] bg-[#F8ECEE] px-1.5 py-0.5 rounded border border-[#B35D67]/20">لغو</button>
                <button onClick={() => handleSimulateStatus(bkg.id, 'completed')} className="text-[9px] bg-[#EDF4F5] px-1.5 py-0.5 rounded border border-[#5E8B95]/20">تکمیل</button>
              </div>
            </div>
          ))
        )}
      </div>

      {reviewModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] max-w-md w-full space-y-4">
             <div className="flex justify-between border-b pb-2">
               <h4 className="text-sm font-bold">ثبت نظر</h4>
               <button onClick={() => setReviewModalBooking(null)}>✕</button>
             </div>
             {reviewSubmitted ? <div className="text-center py-4">نظر شما ثبت شد.</div> : (
               <form onSubmit={handleSubmitReview} className="space-y-4">
                 <div className="flex justify-center gap-1 text-[#C99558]">
                   {[1,2,3,4,5].map(s => <button key={s} type="button" onClick={() => setReviewRating(s)}><Star className={s <= reviewRating ? 'fill-current' : 'text-slate-300'} /></button>)}
                 </div>
                 <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="نظر خود را بنویسید..." className="w-full p-2 border rounded text-xs" rows={3} />
                 <button type="submit" className="w-full py-2 bg-[#173B3F] text-white rounded-full font-bold text-xs">ارسال نظر</button>
               </form>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
