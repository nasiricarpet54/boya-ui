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
        <h1 className="text-xl font-extrabold text-[#173B3F] font-serif">
          نوبت‌های من
        </h1>
        <p className="text-xs text-[#6C6C6C] mt-0.5">
          پیگیری سانس‌های رزرو شده، رهگیری پیامکی و ثبت نظر درباره خدمات
        </p>
      </div>

      {/* Segmented Filter Controls */}
      <div className="flex p-1 bg-white rounded-2xl border border-[#E7E2DA] shadow-sm">
        <button
          onClick={() => setFilterTab('active')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'active'
              ? 'bg-[#173B3F] text-white shadow-sm'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          نوبت‌های فعال ({toPersianDigits(activeBookings.length)})
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'completed'
              ? 'bg-[#173B3F] text-white shadow-sm'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          انجام شده ({toPersianDigits(completedBookings.length)})
        </button>
        <button
          onClick={() => setFilterTab('cancelled')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'cancelled'
              ? 'bg-[#173B3F] text-white shadow-sm'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          لغو شده ({toPersianDigits(cancelledBookings.length)})
        </button>
      </div>

      {/* Bookings List */}
      {displayedBookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E2DA] p-6 space-y-3 shadow-sm">
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
              className="bg-white rounded-2xl p-4 border border-[#E7E2DA] hover:border-[#173B3F] transition-all space-y-3 shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full border border-[#6F9A8D]/40">
                      تایید شده با پیامک رسمی
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
