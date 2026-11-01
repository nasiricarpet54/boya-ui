import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, CheckCircle2, MapPin, User, Car, ShieldCheck, Sparkles, Phone, Lock, LogIn } from 'lucide-react';
import { Salon, SalonService, Specialist } from '../../data/marketplaceData';
import { formatPrice, toPersianDigits } from '../../utils/persianUtils';
import { BeautyActivityIcon } from '../../components/ui/BeautyActivityIcon';
import { BoyaLogo } from '../../components/ui/BoyaLogo';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingSchema } from '../../utils/validation';
import { useAuthStore } from '../../stores/authStore';
import { useModalStore } from '../../stores/modalStore';
import api from '../../api/apiClient';
import { JalaliDatePicker } from '../ui/JalaliDatePicker';
import { getSlotsForArbitraryDate } from '../../utils/dateSlotGenerator';

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
  onConfirmBooking: (appointment: any) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  bookingData,
  onConfirmBooking,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const { openAuthModal } = useModalStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [generatedTrackingCode, setGeneratedTrackingCode] = useState('');
  const [isMobileService, setIsMobileService] = useState(false);

  // Dynamic Date and Time selection
  const [selectedDate, setSelectedDate] = useState<string>('شنبه ۵ آبان');
  const [selectedTime, setSelectedTime] = useState<string>('۱۱:۳۰');

  const { register, handleSubmit, formState: { errors }, watch, reset, setValue } = useForm({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      salonId: String(bookingData?.salon?.id || ''),
      serviceId: String(bookingData?.service?.id || ''),
      specialistId: String(bookingData?.specialist?.id || ''),
      date: selectedDate,
      time: selectedTime,
      customerName: user?.fullName || '',
      customerPhone: user?.phone || '',
      customerAddress: '',
      notes: '',
    },
  });

  // 1. Reset all modal states and initialize form when modal opens or bookingData changes
  useEffect(() => {
    if (isOpen && bookingData) {
      setIsProcessing(false);
      setIsConfirmed(false);
      setGeneratedTrackingCode('');
      setIsMobileService(false);

      const initialDate = bookingData.date || 'شنبه ۵ آبان';
      const initialTime = bookingData.time || '۱۱:۳۰';
      setSelectedDate(initialDate);
      setSelectedTime(initialTime);

      reset({
        salonId: String(bookingData.salon.id || ''),
        serviceId: String(bookingData.service.id || ''),
        specialistId: String(bookingData.specialist.id || ''),
        date: initialDate,
        time: initialTime,
        customerName: user?.fullName || '',
        customerPhone: user?.phone || '',
        customerAddress: '',
        notes: '',
      });
    }
  }, [isOpen, bookingData, reset]);

  // 2. Automatically update & reset form values when user logs in
  useEffect(() => {
    if (user) {
      setValue('customerName', user.fullName || '');
      setValue('customerPhone', user.phone || '');
    }
  }, [user, setValue]);

  // Sync date/time selection to form state
  useEffect(() => {
    setValue('date', selectedDate);
    setValue('time', selectedTime);
  }, [selectedDate, selectedTime, setValue]);

  if (!isOpen || !bookingData) return null;

  const { salon, service, specialist } = bookingData;
  const availableSlots = getSlotsForArbitraryDate(selectedDate, salon.availableSlots);

  const handleConfirm = async (formData: any) => {
    // 3. Pre-booking login check: Must be authenticated
    if (!isAuthenticated || !user) {
      openAuthModal();
      return;
    }

    setIsProcessing(true);
    try {
      const response = await api.post('/bookings', {
        salonId: salon.id,
        serviceId: service.id,
        specialistId: specialist.id,
        date: selectedDate,
        time: selectedTime,
        customerName: formData.customerName,
        isMobileBooking: isMobileService,
        customerAddress: formData.customerAddress,
        notes: formData.notes,
        price: service.price.toString(),
      });

      const tracking = response.data?.trackingCode || `BY-${Math.floor(100000 + Math.random() * 900000)}`;
      setGeneratedTrackingCode(tracking);
      setIsConfirmed(true);
      onConfirmBooking({
        ...response.data,
        salonName: salon.name,
      });
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'خطایی در ثبت نوبت رخ داد.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E7E2DA] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#E7E2DA] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#E8F0EF] border border-[#173B3F]/20 flex items-center justify-center text-[#173B3F] hover:bg-[#173B3F] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-[#173B3F] font-serif">
              {isConfirmed ? 'تاییدیه نوبت و کد رهگیری بویا' : 'فرم رزرو نوبت در پلتفرم بویا'}
            </h3>
          </div>
          <span className="text-[11px] text-[#2E5E52] font-bold bg-[#EAF2EF] px-2.5 py-0.5 rounded-full border border-[#6F9A8D]/30">
            فاز ۱: بدون کارمزد (ویترین رایگان)
          </span>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[82vh] overflow-y-auto">
          {isProcessing ? (
            <div className="text-center py-10 space-y-4">
              <BoyaLogo variant="animated" size="md" showText={false} />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#173B3F] font-serif">
                  در حال ثبت نوبت در تقویم کاری سالن و صدور کد رهگیری...
                </h4>
                <p className="text-xs text-[#6C6C6C]">
                  رزرو سانس {toPersianDigits(selectedTime)} برای {bookingData?.specialist?.name || 'متخصص'}
                </p>
              </div>
            </div>
          ) : isConfirmed ? (
            <div className="text-center py-4 space-y-3.5">
              <div className="flex justify-center">
                <BoyaLogo variant="badge" />
              </div>
              <div className="w-14 h-14 rounded-full bg-[#EAF2EF] text-[#2E5E52] border border-[#6F9A8D]/40 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-[#6F9A8D]" />
              </div>
              <h4 className="text-lg font-bold text-[#173B3F] font-serif">
                نوبت شما در سامانه بویا با موفقیت ثبت شد
              </h4>
              <p className="text-xs text-[#6C6C6C] max-w-sm mx-auto leading-relaxed">
                پیامک تایید نوبت و جزئیات سانس از طریق سامانه ملی‌پیامک به شماره {toPersianDigits(watch('customerPhone'))} ارسال گردید.
              </p>

              {/* Tracking Code */}
              <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E7E2DA] inline-block text-xs">
                کد رهگیری پیامکی نوبت: <strong className="text-base text-[#173B3F] mx-1">{toPersianDigits(generatedTrackingCode)}</strong>
              </div>

              {/* Summary Card */}
              <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E7E2DA] text-right space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E7E2DA]/60">
                  <span className="text-[#6C6C6C]">نوع خدمت:</span>
                  <span className="font-bold text-[#1C1C1C]">{isMobileService ? 'خدمات سیار در محل مشتری (Mobile Service)' : 'حضور در سالن'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E7E2DA]/60">
                  <span className="text-[#6C6C6C]">سالن / مبدا خدمت:</span>
                  <span className="font-bold text-[#1C1C1C]">{salon.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E7E2DA]/60">
                  <span className="text-[#6C6C6C]">خدمت انتخابی:</span>
                  <span className="font-bold text-[#1C1C1C]">{service.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E7E2DA]/60">
                  <span className="text-[#6C6C6C]">متخصص مجری:</span>
                  <span className="font-bold text-[#173B3F]">{specialist.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E7E2DA]/60">
                  <span className="text-[#6C6C6C]">زمان مقرر:</span>
                  <span className="font-bold text-[#1C1C1C]">
                    {selectedDate} - ساعت {toPersianDigits(selectedTime)}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-[#6C6C6C]">هزینه خدمت (پرداخت در محل سالن):</span>
                  <span className="font-bold text-[#173B3F]">{formatPrice(service.price)}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] transition-colors shadow-sm"
                >
                  بستن و ادامه در بویا
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(handleConfirm)} className="space-y-4">
              {/* Login Banner Prompt if unauthenticated */}
              {!isAuthenticated && (
                <div className="bg-[#EAF2EF] p-3.5 rounded-2xl border border-[#6F9A8D]/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#2E5E52]">
                    <Lock className="w-4 h-4 text-[#173B3F]" />
                    <span className="font-bold">برای ثبت نوبت، لطفاً وارد حساب خود شوید:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAuthModal()}
                    className="bg-[#173B3F] text-white px-3.5 py-1.5 rounded-xl font-bold text-[11px] hover:bg-[#122e31] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#D9A2B0]" />
                    <span>ورود با شماره همراه</span>
                  </button>
                </div>
              )}

              {/* Service & Salon banner with Activity Icon */}
              <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E7E2DA] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {service.imageUrl ? (
                      <img src={service.imageUrl} alt={service.name} className="w-12 h-12 rounded-xl object-cover border border-[#E7E2DA] shrink-0" />
                    ) : (
                      <BeautyActivityIcon activityId={service.serviceLineId} size="sm" />
                    )}
                    <div>
                      <span className="text-xs font-bold text-[#173B3F] block">{salon.name}</span>
                      <span className="text-xs text-[#1C1C1C] font-semibold block">{service.name} ({toPersianDigits(service.durationMinutes)} دقیقه)</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#173B3F]">{formatPrice(service.price)}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#6C6C6C] pt-1 border-t border-[#E7E2DA]/60">
                  <div className="flex items-center gap-1.5">
                    <img src={specialist.avatar} alt={specialist.name} className="w-5 h-5 rounded-full object-cover border border-[#D9A2B0]" />
                    <span>متخصص: <strong className="text-[#173B3F] font-bold">{specialist.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#173B3F]" />
                    <span className="truncate max-w-[200px]">{salon.district || salon.address}</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#E7E2DA] space-y-2">
                  <JalaliDatePicker
                    selectedDate={selectedDate}
                    onDateChange={(jalaliFormattedStr) => {
                      setSelectedDate(jalaliFormattedStr);
                    }}
                    label="تاریخ رزرو نوبت (قابل تغییر برای روزهای آینده):"
                    placeholder="انتخاب تاریخ از تقویم..."
                  />

                  {/* Time Slots grid for selected date */}
                  <div>
                    <label className="text-[11px] font-bold text-[#173B3F] block mb-1.5 flex items-center justify-between">
                      <span>ساعات آزاد در {selectedDate}:</span>
                      <span className="text-[10px] text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full font-bold">
                        {toPersianDigits(availableSlots.filter(s => !s.booked).length)} سانس آزاد
                      </span>
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
                      {availableSlots.map((slot) => {
                        const isSelected = selectedTime === slot.time;
                        if (slot.booked) {
                          return (
                            <div key={slot.time} className="py-1.5 text-center rounded-xl bg-slate-100 text-slate-400 text-[11px] line-through select-none">
                              {toPersianDigits(slot.time)}
                            </div>
                          );
                        }
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => setSelectedTime(slot.time)}
                            className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                              isSelected
                                ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-xs'
                                : 'bg-emerald-50 text-[#173B3F] border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {toPersianDigits(slot.time)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Service (At-home) toggle if salon supports it */}
              {salon.isMobileServiceActive && (
                <div
                  onClick={() => setIsMobileService(!isMobileService)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isMobileService
                      ? 'border-[#173B3F] bg-[#E8F0EF]'
                      : 'border-[#E7E2DA] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#173B3F] text-[#D9A2B0] flex items-center justify-center">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1C1C1C] block">
                        درخواست خدمت در محل شما (Mobile Service)
                      </span>
                      <span className="text-[10px] text-[#6C6C6C]">
                        اعزام متخصص مجهز با تجهیزات به آدرس انتخابی شما
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isMobileService}
                    onChange={() => {}}
                    className="accent-[#173B3F] w-4 h-4 pointer-events-none"
                  />
                </div>
              )}

              {/* Customer Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#1C1C1C] block mb-1">
                    نام و نام خانوادگی رزروکننده:
                  </label>
                  <input
                    {...register('customerName')}
                    type="text"
                    placeholder="مثال: مریم کریمی"
                    className="w-full h-11 px-3 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] focus:outline-none"
                  />
                  {errors.customerName && <p className="text-red-500 text-[10px] pr-2 mt-1">{errors.customerName.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1C1C1C] block mb-1">
                    شماره همراه (جهت دریافت پیامک تایید و رهگیری):
                  </label>
                  <input
                    {...register('customerPhone')}
                    type="text"
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full h-11 px-3 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] focus:outline-none"
                    dir="ltr"
                  />
                  {errors.customerPhone && <p className="text-red-500 text-[10px] pr-2 mt-1">{errors.customerPhone.message}</p>}
                </div>

                {isMobileService && (
                  <div>
                    <label className="text-xs font-semibold text-[#1C1C1C] block mb-1">
                      آدرس دقیق محل اعزام متخصص:
                    </label>
                    <textarea
                      {...register('customerAddress')}
                      rows={2}
                      placeholder="تهران، خیابان..."
                      className="w-full p-2.5 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] focus:outline-none"
                    />
                    {errors.customerAddress && <p className="text-red-500 text-[10px] pr-2 mt-1">{errors.customerAddress.message}</p>}
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-[#1C1C1C] block mb-1">
                    توضیحات و نیازمندی‌های خاص (اختیاری):
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    placeholder="مثلا حساسیت به مواد، رنگ موی مدنظر یا..."
                    className="w-full p-2.5 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] focus:outline-none"
                  />
                </div>
              </div>

              {/* Phase 1 note adhering to ADR-004 */}
              <div className="bg-[#EAF2EF] p-2.5 rounded-xl border border-[#6F9A8D]/40 text-[11px] text-[#2E5E52] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#6F9A8D] shrink-0" />
                <span>
                  در فاز ۱ (ویترین رایگان)، پرداخت آنلاین غیرفعال است و هزینه در محل سالن تسویه می‌شود.
                </span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                {!isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => openAuthModal()}
                    className="w-full h-12 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#173B3F]/20 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-[#D9A2B0]" />
                    <span>ورود به حساب جهت ثبت نوبت</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full h-12 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#173B3F]/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#D9A2B0]" />
                    <span>ثبت نوبت قطعی و صدور پیامک تایید</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
