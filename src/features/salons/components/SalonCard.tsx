import React, { useState } from 'react';
import { Star, MapPin, CheckCircle2, ChevronLeft, Clock, Calendar, Car, Eye, Phone, Crown, Heart, Navigation, X, Layers, Sparkles } from 'lucide-react';
import { Salon, SalonService, Specialist } from '../../../shared/data/marketplaceData';
import { formatPrice, toPersianDigits } from '../../../shared/utils/persianUtils';
import { formatDistancePersian } from '../../../shared/utils/geoUtils';
import { BeautyActivityIcon } from '../../../shared/components/ui/BeautyActivityIcon';

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
  const [selectedServiceIndex, setSelectedServiceIndex] = useState<number>(0);
  const [selectedSpecialistIndex, setSelectedSpecialistIndex] = useState<number>(0);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [isQuickServicesModalOpen, setIsQuickServicesModalOpen] = useState<boolean>(false);

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
    <div
      className={`bg-white rounded-3xl overflow-hidden transition-all duration-300 mb-5 ${
        salon.isVip
          ? 'border-2 border-[#C99558] ring-2 ring-[#C99558]/20 shadow-[0_4px_25px_rgba(201,149,88,0.15)]'
          : 'border border-[#E7E2DA] hover:border-[#173B3F] shadow-sm'
      }`}
    >
      {/* Top Visual Image */}
      <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-[#F7F3EE]">
        <img
          src={salon.coverImage}
          alt={salon.name}
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B2626]/90 via-[#173B3F]/35 to-transparent" />

        {/* Top Badges (VIP badge highlighted & Wishlist toggle) */}
        <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5 z-10">
          {salon.isVip && (
            <span className="bg-gradient-to-r from-[#C99558] to-[#D4925A] text-[#173B3F] border border-[#FBF4EC] text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
              <Crown className="w-3.5 h-3.5 fill-[#173B3F] text-[#173B3F]" />
              <span>{salon.vipBadgeLabel || 'سالن برگزیده VIP'}</span>
            </span>
          )}
          {salon.isApproved && (
            <span className="bg-white/95 text-[#2E5E52] border border-[#6F9A8D]/40 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6F9A8D]" />
              <span>سالن تایید شده بویا</span>
            </span>
          )}
          {salon.isMobileServiceActive && (
            <span className="bg-[#173B3F]/90 backdrop-blur-md text-[#D9A2B0] border border-[#D9A2B0]/40 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Car className="w-3 h-3" />
              <span>خدمات در محل</span>
            </span>
          )}
        </div>

        {/* Wishlist Button on Top-Left */}
        <button
          onClick={onToggleWishlist}
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1C1C1C] hover:bg-white hover:text-[#B35D67] transition-all z-10 shadow-sm"
          title={isWishlisted ? 'حذف از نشان‌شده‌ها' : 'نشان کردن سالن'}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#B35D67] text-[#B35D67]' : 'text-[#6C6C6C]'}`} />
        </button>

        {/* Location & Rating */}
        <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between text-white">
          <div className="space-y-0.5">
            <h3 className="text-base sm:text-lg font-bold font-serif leading-tight">
              {salon.name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#E8F0EF]">
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
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 shrink-0">
            <Star className="w-3.5 h-3.5 text-[#C99558] fill-current" />
            <span className="text-xs font-bold text-white">
              {toPersianDigits(salon.rating.toFixed(2))}
            </span>
            <span className="text-[10px] text-[#E8F0EF]">
              ({toPersianDigits(salon.reviewsCount)})
            </span>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Specialists list with Portfolio Trigger */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#173B3F]">
              متخصصین سالن (کادر تایید شده):
            </span>
            <span className="text-[10px] text-[#6C6C6C]">
              برای مشاهده نمونه‌کار روی متخصص کلیک کنید
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {salon.specialists.map((spec, idx) => {
              const isSelected = selectedSpecialistIndex === idx;
              return (
                <div
                  key={spec.id}
                  className={`flex items-center gap-2 p-1.5 pr-2 pl-2 rounded-2xl border transition-all text-right ${
                    isSelected
                      ? 'border-[#173B3F] bg-[#E8F0EF] ring-1 ring-[#173B3F]'
                      : 'border-[#E7E2DA] bg-white hover:border-[#173B3F]/40'
                  }`}
                >
                  <button
                    onClick={() => setSelectedSpecialistIndex(idx)}
                    className="flex items-center gap-2"
                  >
                    <img
                      src={spec.avatar}
                      alt={spec.name}
                      className="w-7 h-7 rounded-full object-cover border border-[#D9A2B0]"
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-[#1C1C1C]">
                          {spec.name}
                        </span>
                        {spec.verified && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full border border-[#6F9A8D]/40 bg-[#EAF2EF] text-[9px] text-[#2E5E52] font-semibold">
                            <CheckCircle2 className="w-2.5 h-2.5 text-[#6F9A8D]" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#6C6C6C] block -mt-0.5">
                        {spec.role}
                      </span>
                    </div>
                  </button>

                  {/* Portfolio Trigger */}
                  <button
                    onClick={() => onViewSpecialistPortfolio(spec, salon)}
                    className="w-6 h-6 rounded-full bg-white border border-[#E7E2DA] text-[#173B3F] hover:bg-[#173B3F] hover:text-white flex items-center justify-center mr-1 transition-colors"
                    title="مشاهده نمونه‌کارها و سابقه"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Services Selectable Tabs with Activity Icon */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#173B3F] block">
              خدمات و لاین‌های سالن ({toPersianDigits(salon.services.length)}):
            </span>
            <button
              type="button"
              onClick={() => setIsQuickServicesModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] hover:bg-[#EAF2EF] text-[#173B3F] hover:text-[#0F3232] text-[11px] font-bold border border-[#E7E2DA] hover:border-[#173B3F] transition-all shadow-xs"
              title="مشاهده سریع لیست خدمات این سالن"
            >
              <Layers className="w-3.5 h-3.5 text-[#D9A2B0]" />
              <span>مشاهده سریع خدمات</span>
            </button>
          </div>
          <div className="space-y-2">
            {salon.services.map((serv, idx) => {
              const isSelected = selectedServiceIndex === idx;
              return (
                <div
                  key={serv.id}
                  onClick={() => setSelectedServiceIndex(idx)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[#173B3F] bg-[#E8F0EF]/60 shadow-xs'
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
                      <div className="text-[11px] text-[#6C6C6C] truncate">
                        {serv.description}
                      </div>
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

        {/* Date Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#173B3F]" />
              روزهای قابل رزرو:
            </span>
            <span className="text-[11px] text-[#6C6C6C]">
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
                  className={`flex flex-col items-center justify-center px-3.5 py-1.5 rounded-2xl border transition-all shrink-0 ${
                    isSelected
                      ? 'border-[#173B3F] bg-[#173B3F] text-white shadow-sm'
                      : 'border-[#E7E2DA] bg-white text-[#6C6C6C] hover:border-[#173B3F]'
                  }`}
                >
                  <span className={`text-[10px] font-medium ${isSelected ? 'text-[#E8F0EF]' : 'text-[#6C6C6C]'}`}>{slot.dayName}</span>
                  <span className="text-sm font-bold">
                    {slot.dayNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots conforming to spec */}
        <div>
          <span className="text-xs font-bold text-[#173B3F] block mb-2">
            ساعت‌های رزرو آزاد (سانس‌های استاندارد):
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {currentDateSlots.slots.map((slotItem) => {
              const isSelected = selectedTimeSlot === slotItem.time;

              if (slotItem.booked) {
                return (
                  <div
                    key={slotItem.time}
                    className="relative py-2 px-1 text-center rounded-xl bg-slate-100 border border-[#E7E2DA] text-[#6C6C6C] text-xs cursor-not-allowed select-none overflow-hidden"
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
                  className={`py-2 px-1 text-center rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#E8F0EF] text-[#173B3F] border-2 border-[#173B3F] font-bold shadow-xs'
                      : 'bg-white text-[#1C1C1C] border border-[#E7E2DA] hover:border-[#173B3F]'
                  }`}
                >
                  {toPersianDigits(slotItem.time)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Address and action footer */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E2DA]">
          <div>
            <span className="text-[11px] text-[#6C6C6C] block">مبلغ خدمت انتخابی:</span>
            <span className="text-base font-black text-[#173B3F]">
              {formatPrice(currentService.price)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsQuickServicesModalOpen(true)}
              className="px-3.5 py-2.5 rounded-full bg-[#FAF7F2] hover:bg-[#EAF2EF] text-[#173B3F] font-bold text-xs border border-[#E7E2DA] hover:border-[#173B3F] transition-all flex items-center gap-1.5 shadow-xs"
              title="مشاهده سریع خدمات این سالن"
            >
              <Layers className="w-3.5 h-3.5 text-[#D9A2B0]" />
              <span>مشاهده سریع خدمات</span>
            </button>

            <button
              onClick={handleBooking}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#173B3F] hover:bg-[#0F3232] active:bg-[#0B2626] text-white font-bold text-xs transition-all shadow-md shadow-[#173B3F]/20"
            >
              <span>رزرو نوبت قطعی</span>
              <ChevronLeft className="w-4 h-4 text-[#D9A2B0]" />
            </button>
          </div>
        </div>
      </div>

      {/* QUICK SERVICES PREVIEW MODAL */}
      {isQuickServicesModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsQuickServicesModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl border border-[#E7E2DA] flex flex-col animate-bounceIn text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#173B3F] text-white flex items-center justify-between border-b border-[#D9A2B0]/30 shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={salon.coverImage}
                  alt={salon.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-[#D9A2B0] shrink-0"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold font-serif text-white">{salon.name}</h4>
                    {salon.isVip && (
                      <span className="text-[9px] bg-[#D9A2B0] text-[#173B3F] px-1.5 py-0.2 rounded-md font-bold">
                        VIP
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#E8F0EF] flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3 h-3 text-[#D9A2B0]" />
                    <span>فهرست و نرخ‌نامه خدمات اصلی سالن</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickServicesModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Services List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 divide-y divide-[#E7E2DA]/60">
              <div className="flex items-center justify-between text-xs text-[#6C6C6C] pb-1">
                <span>تعداد خدمات مصوب: {toPersianDigits(salon.services.length)} سرویس</span>
                <span>همگام با تعرفه پلتفرم بویا</span>
              </div>

              <div className="space-y-3 pt-2">
                {salon.services.map((serv, idx) => (
                  <div
                    key={serv.id}
                    className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] hover:border-[#173B3F] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={serv.imageUrl || salon.coverImage}
                        alt={serv.name}
                        className="w-14 h-14 rounded-xl object-cover border border-[#E7E2DA] shrink-0 mt-0.5"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <BeautyActivityIcon activityId={serv.serviceLineId} size="sm" />
                          <h5 className="text-xs font-bold text-[#1C1C1C]">{serv.name}</h5>
                          {serv.isMobileAvailable && (
                            <span className="text-[9px] bg-[#FAF7F2] text-[#C99558] border border-[#C99558]/30 px-1.5 py-0.2 rounded-md font-bold flex items-center gap-0.5">
                              <Car className="w-2.5 h-2.5" />
                              <span>سیار</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6C6C6C] leading-relaxed line-clamp-2">
                          {serv.description}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-[#6C6C6C]">
                          <Clock className="w-3 h-3 text-[#173B3F]" />
                          <span>مدت زمان: {toPersianDigits(serv.durationMinutes)} دقیقه</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E7E2DA] gap-2 shrink-0">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-black text-[#173B3F] block">
                          {formatPrice(serv.price)}
                        </span>
                        <span className="text-[9px] text-[#2E5E52] bg-[#EAF2EF] px-1.5 py-0.2 rounded-md font-semibold inline-block">
                          تایید شده
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedServiceIndex(idx);
                          setIsQuickServicesModalOpen(false);
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1"
                      >
                        <span>انتخاب این خدمت</span>
                        <ChevronLeft className="w-3 h-3 text-[#D9A2B0]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-[#FAF7F2] border-t border-[#E7E2DA] flex items-center justify-between shrink-0">
              <span className="text-xs text-[#6C6C6C]">
                با انتخاب هر خدمت، فرم رزرو همان خدمت در کارت سالن آماده می‌شود.
              </span>
              <button
                type="button"
                onClick={() => setIsQuickServicesModalOpen(false)}
                className="px-4 py-1.5 rounded-full bg-white border border-[#E7E2DA] hover:border-[#173B3F] text-xs font-bold text-[#173B3F] shadow-xs"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
