import React, { useState } from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, Phone, Navigation, Star, MessageSquare } from 'lucide-react';
import { Booking } from '../data/marketplaceData';
import { formatPrice, toPersianDigits } from '../utils/persianUtils';

interface BookingsScreenProps {
  bookings: Booking[];
  onCancelBooking: (id: string) => void;
  onNavigateToSalons: () => void;
}

export const BookingsScreen: React.FC<BookingsScreenProps> = ({
  bookings,
  onCancelBooking,
  onNavigateToSalons,
}) => {
  const [filterTab, setFilterTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [reviewModalBooking, setReviewModalBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

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
    <div className="space-y-5 pb-24">
      {/* Title */}
      <div className="px-1">
        <h1 className="text-xl font-extrabold text-[#1A2942] font-serif">
          نوبت‌های من
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          پیگیری سانس‌های رزرو شده، رهگیری پیامکی و ثبت نظر درباره خدمات
        </p>
      </div>

      {/* Segmented Filter Controls */}
      <div className="flex p-1 bg-white rounded-2xl border border-[#E2E8F0]">
        <button
          onClick={() => setFilterTab('active')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'active'
              ? 'bg-[#1A2942] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#1A2942]'
          }`}
        >
          نوبت‌های فعال ({toPersianDigits(activeBookings.length)})
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'completed'
              ? 'bg-[#1A2942] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#1A2942]'
          }`}
        >
          انجام شده ({toPersianDigits(completedBookings.length)})
        </button>
        <button
          onClick={() => setFilterTab('cancelled')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'cancelled'
              ? 'bg-[#1A2942] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#1A2942]'
          }`}
        >
          لغو شده ({toPersianDigits(cancelledBookings.length)})
        </button>
      </div>

      {/* Bookings List */}
      {displayedBookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#EEDCC5] p-6 space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#FAF7F2] border border-[#EEDCC5] flex items-center justify-center mx-auto text-[#C59B27]">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1A2942]">
            {filterTab === 'active'
              ? 'در حال حاضر نوبت فعالی ندارید'
              : 'هیچ نوبتی در این بخش ثبت نشده است'}
          </h3>
          <p className="text-xs text-[#64748B] max-w-xs mx-auto">
            از بخش سالن‌ها و خدمات می‌توانید سالن دلخواه خود را پیدا کرده و سانس مناسب را رزرو کنید.
          </p>
          {filterTab === 'active' && (
            <button
              onClick={onNavigateToSalons}
              className="mt-2 px-6 py-2.5 rounded-full bg-[#C59B27] text-[#1A2942] text-xs font-bold hover:bg-[#B8860B] transition-colors"
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
              className="bg-white rounded-2xl p-4 border border-[#EEDCC5] hover:border-[#C59B27] transition-all space-y-3 shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#10B981] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      تایید شده با پیامک رسمی
                    </span>
                    {bkg.isMobileBooking && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        خدمت در محل (Mobile)
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#1A2942] mt-1.5 font-serif">
                    {bkg.salonName}
                  </h3>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-[#775A00] block">
                    {formatPrice(bkg.price)}
                  </span>
                  <span className="text-[10px] text-[#64748B]">پرداخت در محل سالن</span>
                </div>
              </div>

              {/* Details Box */}
              <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#F2EDE5] text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">خدمت درخواستی:</span>
                  <span className="font-bold text-[#1A2942]">{bkg.serviceName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">متخصص مجری:</span>
                  <span className="font-semibold text-[#775A00]">{bkg.specialistName}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-[#EEDCC5]/50">
                  <span className="text-[#64748B]">تاریخ و زمان سانس:</span>
                  <span className="font-bold text-[#1A2942]">
                    {bkg.date} - ساعت {toPersianDigits(bkg.time)} ({toPersianDigits(bkg.durationMinutes)} دقیقه)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">کد رهگیری پیامکی:</span>
                  <span className="font-mono font-bold text-[#C59B27]">{toPersianDigits(bkg.trackingCode)}</span>
                </div>
                {bkg.customerAddress && (
                  <div className="text-[11px] text-[#64748B] pt-1 border-t border-[#EEDCC5]/30">
                    محل خدمت: <strong className="text-[#1A2942]">{bkg.customerAddress}</strong>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F2EDE5]">
                <div className="flex items-center gap-2">
                  <a
                    href={`https://neshan.org/maps?q=${encodeURIComponent(bkg.salonAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FAF7F2] border border-[#E2E8F0] text-[11px] text-[#1A2942] hover:border-[#C59B27]"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#C59B27]" />
                    <span>مسیریابی روی نشان</span>
                  </a>

                  <button
                    onClick={() => setReviewModalBooking(bkg)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-[11px] text-[#775A00] hover:border-[#C59B27]"
                  >
                    <Star className="w-3.5 h-3.5 text-[#C59B27]" />
                    <span>ثبت نظر و امتیاز</span>
                  </button>
                </div>

                {bkg.status === 'confirmed' && (
                  <button
                    onClick={() => onCancelBooking(bkg.id)}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    لغو این نوبت
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review & Rating Modal */}
      {reviewModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 border border-[#EEDCC5] max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#F2EDE5] pb-3">
              <h4 className="text-sm font-bold text-[#1A2942]">
                ثبت نظر و امتیاز درباره {reviewModalBooking.salonName}
              </h4>
              <button
                onClick={() => setReviewModalBooking(null)}
                className="w-7 h-7 rounded-full bg-[#FAF7F2] flex items-center justify-center text-[#64748B]"
              >
                ✕
              </button>
            </div>

            {reviewSubmitted ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-[#1A2942]">
                  نظر شما با موفقیت ثبت شد و پس از بررسی منتشر خواهد شد.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-3">
                <div className="text-center">
                  <span className="text-xs text-[#64748B] block mb-2">امتیاز شما به کیفیت خدمت و متخصص:</span>
                  <div className="flex justify-center gap-1 text-[#C59B27]">
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
                  <label className="text-xs font-semibold text-[#1A2942] block mb-1">
                    متن تجربه شما از خدمت:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="کیفیت خدمات، رفتار پرسنل، رعایت بهداشت و زمان‌بندی..."
                    className="w-full p-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1A2942] focus:border-[#C59B27] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-full bg-[#C59B27] hover:bg-[#B8860B] text-[#1A2942] font-bold text-xs"
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
