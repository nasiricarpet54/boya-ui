import React, { useState, useMemo } from 'react';
import { Star, MapPin, CheckCircle2, ChevronLeft, Clock, Calendar, Car, Eye, Heart, Navigation, Layers, Sparkles, UserCheck, CalendarDays } from 'lucide-react';
import { Salon, SalonService, Specialist, SERVICE_LINES } from '../../data/marketplaceData';
import { formatPrice, toPersianDigits } from '../../utils/persianUtils';
import { formatDistancePersian } from '../../utils/geoUtils';
import { BeautyActivityIcon } from './BeautyActivityIcon';
import { useModalStore } from '../../stores/modalStore';
import { SafeHtml } from './SafeHtml';
import { JalaliDatePicker } from './JalaliDatePicker';
import { generateUpcomingDays, getSlotsForArbitraryDate } from '../../utils/dateSlotGenerator';

interface SalonCardProps {
  salon: Salon;
  distanceKm?: number;
  onBookNow: (salon: Salon, service: SalonService, specialist: Specialist, date: string, time: string) => void;
  onViewSpecialistPortfolio: (specialist: Specialist, salon: Salon) => void;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
}

export const SalonCard: React.FC<SalonCardProps> = ({
  salon,
  distanceKm,
  onBookNow,
  onViewSpecialistPortfolio,
  isWishlisted,
  onToggleWishlist,
}) => {
  const [selectedLineId, setSelectedLineId] = useState<string>('all');
  const [selectedSpecialistIndex, setSelectedSpecialistIndex] = useState<number>(0);
  const [selectedServiceIndex, setSelectedServiceIndex] = useState<number>(0);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [customSelectedDate, setCustomSelectedDate] = useState<string | null>(null);
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  const services = salon.services || [];
  const specialists = salon.specialists || [];
  
  // Generate 30 upcoming days with standard slots
  const upcomingSchedule = useMemo(() => {
    return generateUpcomingDays(30, salon.availableSlots);
  }, [salon.availableSlots]);

  // Filtered lists based on line
  const filteredSpecialists = selectedLineId === 'all'
    ? specialists
    : specialists.filter(s => s.specialtyLine === selectedLineId || s.role.toLowerCase().includes(selectedLineId));

  const filteredServices = selectedLineId === 'all'
    ? services
    : services.filter(s => s.serviceLineId === selectedLineId);

  const activeSpecialists = filteredSpecialists.length > 0 ? filteredSpecialists : specialists;
  const activeServices = filteredServices.length > 0 ? filteredServices : services;

  const currentSpecialist = activeSpecialists[selectedSpecialistIndex] || activeSpecialists[0] || specialists[0] || {
    id: 'spec-default',
    name: 'متخصص بویا',
    role: 'متخصص سالن',
    specialtyLine: 'عمومی',
    avatar: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=150&q=80',
    verified: true,
  };

  const currentService = activeServices[selectedServiceIndex] || activeServices[0] || services[0] || {
    id: 'serv-default',
    name: 'خدمت زیبایی',
    description: 'توضیحات خدمت',
    price: 0,
    durationMinutes: 60,
    serviceLineId: 'hair'
  };

  // Determine current active date and time slots
  const selectedDayItem = customSelectedDate
    ? {
        date: customSelectedDate,
        dayName: 'تاریخ انتخابی',
        dayNumber: '',
        slots: getSlotsForArbitraryDate(customSelectedDate, salon.availableSlots),
      }
    : upcomingSchedule[selectedDateIndex] || upcomingSchedule[0];

  const currentDateLabel = selectedDayItem.date;
  const availableTimeSlots = selectedDayItem.slots || [];
  const freeSlotsCount = availableTimeSlots.filter(s => !s.booked).length;

  const handleSlotClick = (time: string, booked: boolean) => {
    if (booked) return;
    setSelectedTimeSlot(time);
  };

  const handleBooking = () => {
    const timeToBook =
      selectedTimeSlot || availableTimeSlots.find((t) => !t.booked)?.time || '۱۱:۳۰';
    onBookNow(salon, currentService, currentSpecialist, currentDateLabel, timeToBook);
  };

  const { openQuickViewModal } = useModalStore();

  // Get unique lines available in this salon
  const availableLineIds = Array.from(new Set([
    ...services.map(s => s.serviceLineId),
    ...specialists.map(sp => sp.specialtyLine)
  ])).filter(Boolean);

  return (
    <div
      className={`bg-white rounded-3xl overflow-hidden transition-all duration-300 mb-6 ${
        salon.isVip
          ? 'border-2 border-[#C99558] ring-2 ring-[#C99558]/20 shadow-[0_6px_30px_rgba(201,149,88,0.18)]'
          : 'border border-[#E7E2DA] hover:border-[#173B3F] shadow-sm'
      }`}
    >
      {/* Visual Cover Banner */}
      <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-[#F7F3EE]">
        <img
          src={salon.coverImage}
          alt={salon.name}
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B2626]/95 via-[#173B3F]/40 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5 z-10">
          {salon.isVip && (
            <span className="bg-gradient-to-r from-[#C99558] to-[#D4925A] text-[#173B3F] border border-[#FBF4EC] text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3.5 h-3.5 fill-[#173B3F] text-[#173B3F]" />
              <span>{salon.vipBadgeLabel || 'سالن برگزیده VIP'}</span>
            </span>
          )}
          {salon.isApproved && (
            <span className="bg-white/95 backdrop-blur-md text-[#2E5E52] border border-[#6F9A8D]/40 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6F9A8D]" />
              <span>تایید شده بویا</span>
            </span>
          )}
          {salon.isMobileServiceActive && (
            <span className="bg-[#173B3F]/90 backdrop-blur-md text-[#D9A2B0] border border-[#D9A2B0]/40 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Car className="w-3 h-3" />
              <span>خدمات سیار در محل</span>
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={onToggleWishlist}
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1C1C1C] hover:bg-white hover:text-[#B35D67] transition-all z-10 shadow-sm"
          title={isWishlisted ? 'حذف از نشان‌شده‌ها' : 'نشان کردن سالن'}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#B35D67] text-[#B35D67]' : 'text-[#6C6C6C]'}`} />
        </button>

        {/* Location & Rating Header Info */}
        <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between text-white">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold font-serif leading-tight">
              {salon.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#E8F0EF]">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#D9A2B0]" />
                <span>{salon.province !== salon.city ? `${salon.province}، ` : ''}{salon.city}، {salon.district}</span>
              </div>
              {distanceKm !== undefined && (
                <span className="inline-flex items-center gap-1 bg-[#173B3F]/90 text-[#D9A2B0] border border-[#D9A2B0]/40 text-[10.5px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  <Navigation className="w-2.5 h-2.5 fill-current rotate-45" />
                  <span>{formatDistancePersian(distanceKm)} تا شما</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shrink-0">
            <Star className="w-3.5 h-3.5 text-[#C99558] fill-current" />
            <span className="text-xs font-bold text-white">
              {toPersianDigits(Number(salon.rating).toFixed(2))}
            </span>
            <span className="text-[10px] text-[#E8F0EF]">
              ({toPersianDigits(salon.reviewsCount)})
            </span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 space-y-5">

        {/* Service Lines Filter Pills */}
        <div className="border-b border-[#E7E2DA] pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#173B3F]" />
              لاین‌های تخصصی سالن:
            </span>
            <span className="text-[11px] text-[#6C6C6C]">
              فیلتر بر اساس لاین انتخابی
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => { setSelectedLineId('all'); setSelectedSpecialistIndex(0); setSelectedServiceIndex(0); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                selectedLineId === 'all'
                  ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-xs'
                  : 'bg-[#FAF7F2] text-[#6C6C6C] border-[#E7E2DA] hover:border-[#173B3F]'
              }`}
            >
              همه لاین‌ها ({toPersianDigits(services.length)})
            </button>
            {availableLineIds.map((lineId) => {
              const lineMeta = SERVICE_LINES.find(l => l.id === lineId) || { name: lineId, emoji: '✨' };
              const isSelected = selectedLineId === lineId;
              return (
                <button
                  key={lineId}
                  onClick={() => { setSelectedLineId(lineId); setSelectedSpecialistIndex(0); setSelectedServiceIndex(0); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-xs'
                      : 'bg-[#FAF7F2] text-[#1C1C1C] border-[#E7E2DA] hover:border-[#173B3F]'
                  }`}
                >
                  <span>{lineMeta.emoji}</span>
                  <span>{lineMeta.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 1: Specialists Grouped by Line */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1">
              <UserCheck className="w-4 h-4 text-[#173B3F]" />
              کادر و متخصصین لاین ({toPersianDigits(activeSpecialists.length)} نفر):
            </span>
            <span className="text-[10.5px] text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full border border-[#6F9A8D]/30 font-semibold">
              برای دیدن نمونه‌کار روی آیکون 👁️ کلیک کنید
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activeSpecialists.map((spec, idx) => {
              const isSelected = selectedSpecialistIndex === idx;
              const name = spec.name || 'متخصص بویا';
              const role = spec.role || 'متخصص سالن';
              const lineMeta = SERVICE_LINES.find(l => l.id === spec.specialtyLine);

              return (
                <div
                  key={spec.id}
                  className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'border-[#173B3F] bg-[#E8F0EF]/80 ring-1 ring-[#173B3F] shadow-xs'
                      : 'border-[#E7E2DA] bg-white hover:border-[#173B3F]/50'
                  }`}
                >
                  <button
                    onClick={() => setSelectedSpecialistIndex(idx)}
                    className="flex items-center gap-2.5 text-right min-w-0 flex-1"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={spec.avatar || 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=150&q=80'}
                        alt={name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#D9A2B0]"
                      />
                      {spec.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#6F9A8D] fill-[#EAF2EF]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-[#1C1C1C] truncate">
                          {name}
                        </span>
                        {spec.isMobileSpecialist && (
                          <span className="bg-[#173B3F] text-white text-[9px] px-1.5 py-0.2 rounded-md shrink-0">
                            سیار
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] text-[#6C6C6C] block truncate">
                        {role} {lineMeta ? `(${lineMeta.name})` : ''}
                      </span>
                    </div>
                  </button>

                  {/* Portfolio Trigger */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewSpecialistPortfolio(spec, salon);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E7E2DA] text-[#173B3F] hover:bg-[#173B3F] hover:text-white flex items-center gap-1 text-[11px] font-bold shadow-xs transition-colors shrink-0"
                    title="مشاهده نمونه‌کارها و سابقه"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#D9A2B0]" />
                    <span>نمونه‌کار</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Services List under selected Line/Specialist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#173B3F]">
              خدمات انتخابی ({toPersianDigits(activeServices.length)} مورد):
            </span>
            <button
              type="button"
              onClick={() => openQuickViewModal(salon)}
              className="text-[11px] text-[#173B3F] font-bold hover:underline flex items-center gap-1"
            >
              <span>لیست کامل خدمات سالن</span>
              <ChevronLeft className="w-3 h-3 text-[#D9A2B0]" />
            </button>
          </div>

          <div className="space-y-2">
            {activeServices.map((serv, idx) => {
              const isSelected = selectedServiceIndex === idx;
              return (
                <div
                  key={serv.id}
                  onClick={() => setSelectedServiceIndex(idx)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[#173B3F] bg-[#E8F0EF]/80 shadow-xs ring-1 ring-[#173B3F]/30'
                      : 'border-[#E7E2DA] bg-white hover:border-[#173B3F]/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {serv.imageUrl ? (
                      <img
                        src={serv.imageUrl}
                        alt={serv.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[#E7E2DA] shrink-0"
                      />
                    ) : (
                      <BeautyActivityIcon activityId={serv.serviceLineId} size="sm" isActive={isSelected} />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#1C1C1C] truncate">
                        {serv.name}
                      </div>
                      <SafeHtml 
                        html={serv.description} 
                        className="text-[11px] text-[#6C6C6C] truncate" 
                      />
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <div className="text-xs font-extrabold text-[#173B3F]">
                      {formatPrice(serv.price)}
                    </div>
                    <div className="inline-flex items-center gap-1 text-[10px] text-[#6C6C6C]">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{toPersianDigits(serv.durationMinutes)} دقیقه</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Booking Dates Selector (30 Upcoming Days Strip & Calendar Popover) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#173B3F]" />
              انتخاب تاریخ رزرو نوبت (روزهای آینده):
            </span>
            
            {/* Calendar Popover Toggle Button */}
            <button
              type="button"
              onClick={() => setShowDatePickerModal(!showDatePickerModal)}
              className="px-2.5 py-1 rounded-xl bg-[#FAF7F2] hover:bg-[#EAF2EF] border border-[#E7E2DA] text-[11px] font-bold text-[#173B3F] flex items-center gap-1 shadow-xs transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#D9A2B0]" />
              <span>{showDatePickerModal ? 'بستن تقویم' : 'تقویم کامل شمسی 📅'}</span>
            </button>
          </div>

          {/* Inline Jalali Date Picker if toggled */}
          {showDatePickerModal && (
            <div className="mb-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#173B3F]/20">
              <JalaliDatePicker
                selectedDate={customSelectedDate || currentDateLabel}
                onDateChange={(jalaliFormattedStr) => {
                  setCustomSelectedDate(jalaliFormattedStr);
                  setSelectedTimeSlot('');
                  setShowDatePickerModal(false);
                }}
                label="انتخاب تاریخ رزرو نوبت از تقویم شمسی:"
                placeholder="برای رزرو روزهای آینده کلیک کنید..."
              />
            </div>
          )}

          {/* 30-day Horizontal Strip */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {upcomingSchedule.map((slot, idx) => {
              const isSelected = !customSelectedDate && selectedDateIndex === idx;
              return (
                <button
                  key={slot.date}
                  onClick={() => {
                    setCustomSelectedDate(null);
                    setSelectedDateIndex(idx);
                    setSelectedTimeSlot('');
                  }}
                  className={`flex flex-col items-center justify-center px-3.5 py-2 rounded-2xl border transition-all shrink-0 min-w-[70px] ${
                    isSelected
                      ? 'border-[#173B3F] bg-[#173B3F] text-white shadow-md'
                      : 'border-[#E7E2DA] bg-white text-[#6C6C6C] hover:border-[#173B3F]'
                  }`}
                >
                  <span className={`text-[10px] font-medium ${isSelected ? 'text-[#E8F0EF]' : 'text-[#6C6C6C]'}`}>
                    {slot.dayName}
                  </span>
                  <span className="text-sm font-black mt-0.5">
                    {slot.dayNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Available Time Slots ("زمان‌های آزاد برای تعیین وقت") */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#173B3F] block truncate max-w-[260px]">
              ساعات آزاد تعیین وقت ({currentDateLabel}):
            </span>
            <span className="text-[10.5px] text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full border border-[#6F9A8D]/30 font-bold shrink-0">
              {toPersianDigits(freeSlotsCount)} سانس آزاد
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {availableTimeSlots.map((slotItem) => {
              const isSelected = selectedTimeSlot === slotItem.time;

              if (slotItem.booked) {
                return (
                  <div
                    key={slotItem.time}
                    className="py-2 px-1 text-center rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs select-none relative overflow-hidden"
                    title="این زمان قبلاً رزرو شده است"
                  >
                    <span className="line-through text-[11px]">
                      {toPersianDigits(slotItem.time)}
                    </span>
                    <span className="block text-[9px] text-red-500 font-medium">پر شده</span>
                  </div>
                );
              }

              return (
                <button
                  key={slotItem.time}
                  onClick={() => handleSlotClick(slotItem.time, false)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-sm ring-2 ring-[#173B3F]/20'
                      : 'bg-emerald-50 text-[#173B3F] border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400'
                  }`}
                >
                  <span>{toPersianDigits(slotItem.time)}</span>
                  <span className={`text-[9px] font-semibold ${isSelected ? 'text-[#D9A2B0]' : 'text-emerald-700'}`}>
                    آزاد
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer CTA & Price Summary */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E2DA]">
          <div>
            <span className="text-[11px] text-[#6C6C6C] block">جمع هزینه خدمت انتخابی:</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-[#173B3F]">
                {formatPrice(currentService.price)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBooking}
              className="flex items-center gap-2 px-7 py-3 rounded-full bg-[#173B3F] hover:bg-[#0F3232] active:bg-[#0B2626] text-white font-extrabold text-xs transition-all shadow-md shadow-[#173B3F]/20"
            >
              <span>رزرو نوبت با {currentSpecialist.name}</span>
              <ChevronLeft className="w-4 h-4 text-[#D9A2B0]" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


