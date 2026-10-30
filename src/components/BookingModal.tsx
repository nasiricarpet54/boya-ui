import React, { useState } from 'react';
import { X, Calendar, Clock, CheckCircle2, MapPin, User, Car, ShieldCheck, Sparkles, Phone } from 'lucide-react';
import { Salon, SalonService, Specialist } from '../data/marketplaceData';
import { formatPrice, toPersianDigits } from '../utils/persianUtils';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: {
    salon: Salon;
    service: SalonService;
    specialist: Specialist;
    date: string;
    time: string;
  } | null;
  onConfirmBooking: (appointment: {
    salonId: string;
    salonName: string;
    salonAddress: string;
    serviceId: string;
    serviceName: string;
    serviceLineId: string;
    specialistId: string;
    specialistName: string;
    date: string;
    time: string;
    durationMinutes: number;
    price: number;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    notes?: string;
    isMobileBooking: boolean;
  }) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  bookingData,
  onConfirmBooking,
}) => {
  if (!isOpen || !bookingData) return null;

  const { salon, service, specialist, date, time } = bookingData;
  const [userName, setUserName] = useState('شادی بهرامی');
  const [userPhone, setUserPhone] = useState('۰۹۱۲۳۴۵۶۷۸۹');
  const [isMobileService, setIsMobileService] = useState(false);
  const [userAddress, setUserAddress] = useState('تهران، زعفرانیه، خیابان آصف، کوچه شقایق، پلاک ۴');
  const [userNotes, setUserNotes] = useState('پوست حساس - ترجیح مواد ملایم');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [generatedTrackingCode, setGeneratedTrackingCode] = useState('');

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const code = `BY-${Math.floor(100000 + Math.random() * 900000)}`;
    setGeneratedTrackingCode(code);

    onConfirmBooking({
      salonId: salon.id,
      salonName: salon.name,
      salonAddress: salon.address,
      serviceId: service.id,
      serviceName: service.name,
      serviceLineId: service.serviceLineId,
      specialistId: specialist.id,
      specialistName: specialist.name,
      date,
      time,
      durationMinutes: service.durationMinutes,
      price: service.price,
      customerName: userName,
      customerPhone: userPhone,
      customerAddress: isMobileService ? userAddress : undefined,
      notes: userNotes,
      isMobileBooking: isMobileService,
    });
    setIsConfirmed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#EEDCC5] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#F2EDE5] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#E2E8F0] flex items-center justify-center text-[#1A2942] hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-[#1A2942] font-serif">
              {isConfirmed ? 'تاییدیه نوبت و کد رهگیری بویا' : 'فرم رزرو نوبت در پلتفرم بویا'}
            </h3>
          </div>
          <span className="text-[11px] text-[#10B981] font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            فاز ۱: بدون کارمزد (ویترین رایگان)
          </span>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[82vh] overflow-y-auto">
          {isConfirmed ? (
            <div className="text-center py-5 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-lg font-bold text-[#1A2942] font-serif">
                نوبت شما در سامانه بویا ثبت گردید
              </h4>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto leading-relaxed">
                پیامک تایید نوبت و جزئیات سانس از طریق سامانه ملی‌پیامک به شماره {toPersianDigits(userPhone)} ارسال گردید.
              </p>

              {/* Tracking Code */}
              <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#EEDCC5] inline-block text-xs">
                کد رهگیری پیامکی نوبت: <strong className="text-base text-[#C59B27] mx-1">{toPersianDigits(generatedTrackingCode)}</strong>
              </div>

              {/* Summary Card */}
              <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#EEDCC5] text-right space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#EEDCC5]/50">
                  <span className="text-[#64748B]">نوع خدمت:</span>
                  <span className="font-bold text-[#1A2942]">{isMobileService ? 'خدمات سیار در محل مشتری (Mobile Service)' : 'حضور در سالن'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EEDCC5]/50">
                  <span className="text-[#64748B]">سالن / مبدا خدمت:</span>
                  <span className="font-bold text-[#1A2942]">{salon.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EEDCC5]/50">
                  <span className="text-[#64748B]">خدمت انتخابی:</span>
                  <span className="font-bold text-[#1A2942]">{service.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EEDCC5]/50">
                  <span className="text-[#64748B]">متخصص مجری:</span>
                  <span className="font-bold text-[#C59B27]">{specialist.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EEDCC5]/50">
                  <span className="text-[#64748B]">زمان مقرر:</span>
                  <span className="font-bold text-[#1A2942]">
                    {date} - ساعت {toPersianDigits(time)}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-[#64748B]">هزینه خدمت (پرداخت در محل سالن):</span>
                  <span className="font-bold text-[#1A2942]">{formatPrice(service.price)}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-full bg-[#1A2942] text-white text-xs font-semibold hover:bg-[#04142C] transition-colors"
                >
                  مشاهده در لیست نوبت‌های من
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
              {/* Service & Salon banner */}
              <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#EEDCC5] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#C59B27]" />
                    <span className="text-xs font-bold text-[#1A2942]">{salon.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[#775A00]">{formatPrice(service.price)}</span>
                </div>

                <div className="text-xs text-[#1A2942] font-semibold">
                  خدمت: {service.name} ({toPersianDigits(service.durationMinutes)} دقیقه)
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                  <MapPin className="w-3.5 h-3.5 text-[#C59B27]" />
                  <span>{salon.address}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EEDCC5]/60 text-xs">
                  <div className="flex items-center gap-1.5 text-[#1A2942]">
                    <Calendar className="w-3.5 h-3.5 text-[#775A00]" />
                    <span>{date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#1A2942]">
                    <Clock className="w-3.5 h-3.5 text-[#775A00]" />
                    <span>ساعت {toPersianDigits(time)}</span>
                  </div>
                </div>
              </div>

              {/* Mobile Service (At-home) toggle if salon supports it */}
              {salon.isMobileServiceActive && (
                <div
                  onClick={() => setIsMobileService(!isMobileService)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isMobileService
                      ? 'border-[#C59B27] bg-[#FAF3E7]'
                      : 'border-[#E2E8F0] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#1A2942] text-[#FECE57] flex items-center justify-center">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1A2942] block">
                        درخواست خدمت در محل شما (Mobile Service)
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        اعزام متخصص مجهز با تجهیزات به آدرس انتخابی شما
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isMobileService}
                    onChange={() => {}}
                    className="accent-[#C59B27] w-4 h-4 pointer-events-none"
                  />
                </div>
              )}

              {/* Customer Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#1A2942] block mb-1">
                    نام و نام خانوادگی رزروکننده:
                  </label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#1A2942] focus:border-[#C59B27] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1A2942] block mb-1">
                    شماره همراه (جهت دریافت پیامک تایید و رمز یکبار مصرف OTP):
                  </label>
                  <input
                    type="text"
                    required
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#1A2942] focus:border-[#C59B27] focus:outline-none"
                  />
                </div>

                {isMobileService && (
                  <div>
                    <label className="text-xs font-semibold text-[#1A2942] block mb-1">
                      آدرس دقیق محل اعزام متخصص:
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={userAddress}
                      onChange={(e) => setUserAddress(e.target.value)}
                      placeholder="تهران، خیابان..."
                      className="w-full p-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1A2942] focus:border-[#C59B27] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-[#1A2942] block mb-1">
                    توضیحات و نیازمندی‌های خاص (اختیاری):
                  </label>
                  <textarea
                    rows={2}
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="مثلا حساسیت به مواد، رنگ موی مدنظر یا..."
                    className="w-full p-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1A2942] focus:border-[#C59B27] focus:outline-none"
                  />
                </div>
              </div>

              {/* Phase 1 note adhering to ADR-004 */}
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C59B27] shrink-0" />
                <span>
                  در فاز ۱ (ویترین رایگان)، پرداخت آنلاین غیرفعال است و هزینه در محل سالن تسویه می‌شود.
                </span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 rounded-full bg-[#C59B27] hover:bg-[#B8860B] text-[#1A2942] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#1A2942]" />
                  <span>ثبت نوبت قطعی و صدور پیامک تایید</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
