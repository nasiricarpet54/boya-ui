import React, { useState } from 'react';
import { Star, MapPin, CheckCircle2, ChevronLeft, Clock, Calendar, Car, Eye, Phone } from 'lucide-react';
import { Salon, SalonService, Specialist } from '../data/marketplaceData';
import { formatPrice, toPersianDigits } from '../utils/persianUtils';

interface SalonCardProps {
  salon: Salon;
  onBookNow: (salon: Salon, service: SalonService, specialist: Specialist, date: string, time: string) => void;
  onViewSpecialistPortfolio: (specialist: Specialist, salon: Salon) => void;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
}

export const SalonCard: React.FC<SalonCardProps> = ({
  salon,
  onBookNow,
  onViewSpecialistPortfolio,
  isWishlisted,
  onToggleWishlist,
}) => {
  const [selectedServiceIndex, setSelectedServiceIndex] = useState<number>(0);
  const [selectedSpecialistIndex, setSelectedSpecialistIndex] = useState<number>(0);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  const currentService = salon.services[selectedServiceIndex] || salon.services[0];
  const currentSpecialist = salon.specialists[selectedSpecialistIndex] || salon.specialists[0];
  const currentDateSlots = salon.availableSlots[selectedDateIndex] || salon.availableSlots[0];

  const handleSlotClick = (time: string, booked: boolean) => {
    if (booked) return;
    setSelectedTimeSlot(time);
  };

  const handleBooking = () => {
    const timeToBook =
      selectedTimeSlot || currentDateSlots.slots.find((t) => !t.booked)?.time || '۱۱:۳۰';
    onBookNow(salon, currentService, currentSpecialist, currentDateSlots.date, timeToBook);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EEDCC5] overflow-hidden transition-all duration-200 hover:border-[#C59B27] mb-5">
      {/* Top Visual Image */}
      <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-[#FAF7F2]">
        <img
          src={salon.coverImage}
          alt={salon.name}
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2942]/90 via-[#1A2942]/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5">
          {salon.isApproved && (
            <span className="bg-white/95 text-[#10B981] border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>سالن تایید شده بویا</span>
            </span>
          )}
          {salon.isMobileServiceActive && (
            <span className="bg-[#1A2942]/90 backdrop-blur-md text-[#FECE57] border border-[#C59B27]/40 text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
              <Car className="w-3 h-3" />
              <span>پذیرش خدمات در محل</span>
            </span>
          )}
        </div>

        {/* Location & Rating */}
        <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between text-white">
          <div>
            <h3 className="text-base sm:text-lg font-bold font-serif leading-tight">
              {salon.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-amber-100/90 mt-1">
              <MapPin className="w-3.5 h-3.5 text-[#FECE57]" />
              <span>{salon.city}، {salon.district}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-full border border-white/20">
            <Star className="w-3.5 h-3.5 text-[#FECE57] fill-current" />
            <span className="text-xs font-bold text-white">
              {toPersianDigits(salon.rating.toFixed(2))}
            </span>
            <span className="text-[10px] text-amber-200">
              ({toPersianDigits(salon.reviewsCount)})
            </span>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-4">
        {/* Specialists list with Portfolio Trigger */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1A2942]">
              متخصصین سالن (کادر تایید شده):
            </span>
            <span className="text-[10px] text-[#775A00]">
              روی هر متخصص برای مشاهده نمونه‌کار کلیک کنید
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {salon.specialists.map((spec, idx) => {
              const isSelected = selectedSpecialistIndex === idx;
              return (
                <div
                  key={spec.id}
                  className={`flex items-center gap-2 p-1.5 pr-2 pl-2 rounded-full border transition-all text-right ${
                    isSelected
                      ? 'border-[#C59B27] bg-[#FAF7F2] ring-1 ring-[#C59B27]'
                      : 'border-[#E2E8F0] bg-white hover:border-[#C59B27]/50'
                  }`}
                >
                  <button
                    onClick={() => setSelectedSpecialistIndex(idx)}
                    className="flex items-center gap-2"
                  >
                    <img
                      src={spec.avatar}
                      alt={spec.name}
                      className="w-7 h-7 rounded-full object-cover border border-[#EEDCC5]"
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-[#1A2942]">
                          {spec.name}
                        </span>
                        {spec.verified && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full border border-[#D4A574] bg-[#F5F0E8] text-[9px] text-[#10B981] font-semibold">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#64748B] block -mt-0.5">
                        {spec.role}
                      </span>
                    </div>
                  </button>

                  {/* Portfolio Trigger */}
                  <button
                    onClick={() => onViewSpecialistPortfolio(spec, salon)}
                    className="w-6 h-6 rounded-full bg-white border border-[#E2E8F0] text-[#775A00] hover:text-[#1A2942] flex items-center justify-center mr-1"
                    title="مشاهده نمونه‌کارها و سابقه"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Services Selectable Tabs */}
        <div>
          <span className="text-xs font-semibold text-[#1A2942] block mb-2">
            خدمات و لاین‌های سالن:
          </span>
          <div className="space-y-2">
            {salon.services.map((serv, idx) => {
              const isSelected = selectedServiceIndex === idx;
              return (
                <div
                  key={serv.id}
                  onClick={() => setSelectedServiceIndex(idx)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#C59B27] bg-[#FAF7F2]'
                      : 'border-[#EEDCC5]/70 bg-white hover:border-[#C59B27]/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#1A2942]">
                      {serv.name}
                    </span>
                    <span className="text-xs font-bold text-[#775A00]">
                      {formatPrice(serv.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span className="line-clamp-1">{serv.description}</span>
                    <span className="inline-flex items-center gap-1 shrink-0 text-[#1A2942] font-medium mr-2">
                      <Clock className="w-3 h-3 text-[#C59B27]" />
                      {toPersianDigits(serv.durationMinutes)} دقیقه
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Date Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1A2942] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C59B27]" />
              روزهای قابل رزرو:
            </span>
            <span className="text-[11px] text-[#64748B]">
              هفته اول آبان
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {salon.availableSlots.map((slot, idx) => {
              const isSelected = selectedDateIndex === idx;
              return (
                <button
                  key={slot.date}
                  onClick={() => {
                    setSelectedDateIndex(idx);
                    setSelectedTimeSlot('');
                  }}
                  className={`flex flex-col items-center justify-center px-3.5 py-1.5 rounded-xl border transition-all shrink-0 ${
                    isSelected
                      ? 'border-[#C59B27] bg-[#FAF3E7] text-[#1A2942]'
                      : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#C59B27]'
                  }`}
                >
                  <span className="text-[11px] font-medium">{slot.dayName}</span>
                  <span className="text-sm font-bold text-[#1A2942]">
                    {slot.dayNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots conforming to spec */}
        <div>
          <span className="text-xs font-semibold text-[#1A2942] block mb-2">
            ساعت‌های رزرو آزاد (سانس‌های VIP):
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {currentDateSlots.slots.map((slotItem) => {
              const isSelected = selectedTimeSlot === slotItem.time;

              if (slotItem.booked) {
                return (
                  <div
                    key={slotItem.time}
                    className="relative py-2 px-1 text-center rounded-full bg-slate-100 border border-[#E2E8F0] text-[#64748B] text-xs cursor-not-allowed select-none overflow-hidden"
                    title="این سانس قبلاً رزرو شده است"
                  >
                    <span className="line-through opacity-60">
                      {toPersianDigits(slotItem.time)}
                    </span>
                    <div className="absolute inset-0 border-t border-slate-300 transform rotate-12 pointer-events-none" />
                  </div>
                );
              }

              return (
                <button
                  key={slotItem.time}
                  onClick={() => handleSlotClick(slotItem.time, false)}
                  className={`py-2 px-1 text-center rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#FAF3E7] text-[#1A2942] border-[1.5px] border-[#C59B27] font-bold shadow-sm'
                      : 'bg-white text-[#1A2942] border border-[#E2E8F0] hover:border-[#C59B27]'
                  }`}
                >
                  {toPersianDigits(slotItem.time)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Address and action footer */}
        <div className="pt-2 flex items-center justify-between border-t border-[#F2EDE5]">
          <div>
            <span className="text-[11px] text-[#64748B] block">مبلغ خدمت در سالن:</span>
            <span className="text-sm font-bold text-[#1A2942]">
              {formatPrice(currentService.price)}
            </span>
          </div>

          <button
            onClick={handleBooking}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#C59B27] hover:bg-[#B8860B] active:bg-[#B8860B] text-[#1A2942] font-semibold text-xs transition-all shadow-sm"
          >
            <span>رزرو نوبت قطعی</span>
            <ChevronLeft className="w-4 h-4 text-[#1A2942]" />
          </button>
        </div>
      </div>
    </div>
  );
};
