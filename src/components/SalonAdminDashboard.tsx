import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Users,
  Scissors,
  DollarSign,
  TrendingUp,
  Car,
  Image,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  UserCheck
} from 'lucide-react';
import { SALONS, Salon, SalonService, Specialist, Booking } from '../data/marketplaceData';
import { formatPrice, toPersianDigits } from '../utils/persianUtils';
import { BeautyActivityIcon } from './BeautyActivityIcon';

interface SalonAdminDashboardProps {
  onSwitchToCustomerApp: () => void;
  bookings: Booking[];
  onUpdateBookingStatus: (bookingId: string, newStatus: 'confirmed' | 'completed' | 'cancelled') => void;
}

export const SalonAdminDashboard: React.FC<SalonAdminDashboardProps> = ({
  onSwitchToCustomerApp,
  bookings,
  onUpdateBookingStatus,
}) => {
  const currentSalon = SALONS[0]; // Gol-e Sorkh Luxury Villa
  const [salonTab, setSalonTab] = useState<'schedule' | 'services' | 'specialists' | 'blocks'>('schedule');

  // Local state for services
  const [salonServices, setSalonServices] = useState<SalonService[]>(currentSalon.services);
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState(1500000);
  const [newServiceDuration, setNewServiceDuration] = useState(60);
  const [newServiceMobile, setNewServiceMobile] = useState(true);

  // Local state for schedule blocks (ADR-001 & Migration CreateScheduleBlocks)
  const [scheduleBlocks, setScheduleBlocks] = useState([
    { id: 'blk-1', date: 'شنبه ۵ آبان', time: '۱۲:۰۰ الی ۱۳:۰۰', reason: 'ضدعفونی تجهیزات و استراحت' },
    { id: 'blk-2', date: 'یکشنبه ۶ آبان', time: '۱۴:۰۰ الی ۱۵:۰۰', reason: 'جلسه هماهنگی کادر تخصصی' },
  ]);
  const [newBlockDate, setNewBlockDate] = useState('دوشنبه ۷ آبان');
  const [newBlockTime, setNewBlockTime] = useState('۱۳:۰۰ الی ۱۴:۰۰');
  const [newBlockReason, setNewBlockReason] = useState('رزرو اختصاصی VIP');

  // Stats
  const totalRevenue = bookings.reduce((sum, b) => (b.status !== 'cancelled' ? sum + b.price : sum), 0);
  const todayBookingsCount = bookings.length;

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    const newServ: SalonService = {
      id: `serv-${Date.now()}`,
      serviceLineId: 'hair',
      name: newServiceName.trim(),
      durationMinutes: Number(newServiceDuration),
      price: Number(newServicePrice),
      description: 'سرویس ثبت شده توسط مدیریت سالن در پلتفرم بویا',
      isMobileAvailable: newServiceMobile,
    };

    setSalonServices([...salonServices, newServ]);
    setIsAddingService(false);
    setNewServiceName('');
  };

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleBlocks([
      ...scheduleBlocks,
      {
        id: `blk-${Date.now()}`,
        date: newBlockDate,
        time: newBlockTime,
        reason: newBlockReason,
      },
    ]);
  };

  return (
    <div className="space-y-5 pb-24 animate-fadeIn">
      {/* Salon Identification Card with Official Deep Petrol Theme */}
      <div className="bg-[#173B3F] text-white rounded-3xl p-5 border border-[#6F9A8D]/40 shadow-lg relative overflow-hidden">
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-[#E8F0EF] bg-[#0F3232] px-2 py-0.5 rounded-full border border-[#6F9A8D]/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#6F9A8D]" />
                <span>سالندار تایید شده (Approved Tenant)</span>
              </span>
              <span className="text-[10px] font-mono text-[#D9A2B0]">
                شناسه: {currentSalon.tenantId}
              </span>
            </div>
            <h1 className="text-lg font-bold font-serif text-white">
              {currentSalon.name}
            </h1>
            <p className="text-xs text-[#E8F0EF] mt-0.5">
              {currentSalon.province}، {currentSalon.district} — {currentSalon.address}
            </p>
          </div>

          <button
            onClick={onSwitchToCustomerApp}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D9A2B0] hover:bg-[#E6B5C0] text-[#173B3F] text-xs font-bold transition-all shadow-sm shrink-0"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>مشاهده ویترین مشتری</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 mt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-[#E8F0EF]/80 block">نوبت‌های جاری:</span>
            <span className="text-sm font-bold text-[#D9A2B0]">{toPersianDigits(todayBookingsCount)} نوبت</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-[#E8F0EF]/80 block">برآورد درآمد:</span>
            <span className="text-sm font-bold text-white">{formatPrice(totalRevenue)}</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-[#E8F0EF]/80 block">کادر متخصصین:</span>
            <span className="text-sm font-bold text-white">{toPersianDigits(currentSalon.specialists.length)} نفر</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-[#E8F0EF]/80 block">امتیاز سالن:</span>
            <span className="text-sm font-bold text-[#6F9A8D]">{toPersianDigits(currentSalon.rating.toFixed(2))} ★</span>
          </div>
        </div>
      </div>

      {/* Segmented Controls */}
      <div className="flex p-1 bg-white rounded-2xl border border-[#E7E2DA] shadow-sm">
        <button
          onClick={() => setSalonTab('schedule')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            salonTab === 'schedule'
              ? 'bg-[#173B3F] text-white shadow-sm'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          نوبت‌های ثبت شده ({toPersianDigits(bookings.length)})
        </button>
        <button
          onClick={() => setSalonTab('blocks')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            salonTab === 'blocks'
              ? 'bg-[#173B3F] text-white shadow-sm'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          مسدودسازی سانس‌ها
        </button>
        <button
          onClick={() => setSalonTab('services')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            salonTab === 'services'
              ? 'bg-[#173B3F] text-white shadow-sm'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          مدیریت خدمات و قیمت‌ها
        </button>
        <button
          onClick={() => setSalonTab('specialists')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            salonTab === 'specialists'
              ? 'bg-[#173B3F] text-white shadow-sm'
              : 'text-[#6C6C6C] hover:text-[#173B3F]'
          }`}
        >
          پرسنل و نمونه‌کارها
        </button>
      </div>

      {/* TAB 1: Real-time Bookings Manager */}
      {salonTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-[#173B3F]">
              نوبت‌های مشتریان (ورودی از اپلیکیشن مشتری بویا):
            </h3>
            <span className="text-[11px] text-[#6C6C6C]">
              به‌روزرسانی لحظه‌ای
            </span>
          </div>

          <div className="space-y-3">
            {bookings.map((bkg) => (
              <div
                key={bkg.id}
                className="bg-white rounded-2xl p-4 border border-[#E7E2DA] space-y-3 shadow-sm hover:border-[#173B3F] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <BeautyActivityIcon activityId={bkg.serviceLineId} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1C1C1C]">
                          {bkg.customerName}
                        </span>
                        <span className="text-[11px] font-mono text-[#6C6C6C]">
                          ({toPersianDigits(bkg.customerPhone)})
                        </span>
                        {bkg.isMobileBooking && (
                          <span className="text-[10px] font-bold text-[#173B3F] bg-[#E8F0EF] px-2 py-0.5 rounded-full border border-[#173B3F]/20">
                            خدمت در محل مشتری
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-[#173B3F] block mt-0.5">
                        {bkg.serviceName} با متخصص {bkg.specialistName}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      bkg.status === 'confirmed'
                        ? 'bg-[#EAF2EF] text-[#2E5E52] border border-[#6F9A8D]/40'
                        : bkg.status === 'completed'
                        ? 'bg-[#EDF4F5] text-[#24545F] border border-[#5E8B95]/40'
                        : 'bg-[#F8ECEE] text-[#B35D67] border border-[#B35D67]/40'
                    }`}
                  >
                    {bkg.status === 'confirmed'
                      ? 'تایید شده'
                      : bkg.status === 'completed'
                      ? 'انجام شده'
                      : 'لغو شده'}
                  </span>
                </div>

                <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E7E2DA] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#1C1C1C]">
                    <Clock className="w-3.5 h-3.5 text-[#173B3F]" />
                    <span>
                      {bkg.date} - ساعت {toPersianDigits(bkg.time)}
                    </span>
                  </div>
                  <span className="font-bold text-[#173B3F]">
                    مبلغ: {formatPrice(bkg.price)}
                  </span>
                </div>

                {bkg.notes && (
                  <p className="text-[11px] text-[#6C6C6C] italic">
                    ملاحظات مشتری: {bkg.notes}
                  </p>
                )}

                {/* Status action buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#E7E2DA]/60">
                  {bkg.status !== 'completed' && (
                    <button
                      onClick={() => onUpdateBookingStatus(bkg.id, 'completed')}
                      className="px-3.5 py-1 rounded-full bg-[#6F9A8D] hover:bg-[#5a8075] text-white text-xs font-bold shadow-xs"
                    >
                      تکمیل خدمت
                    </button>
                  )}
                  {bkg.status !== 'cancelled' && (
                    <button
                      onClick={() => onUpdateBookingStatus(bkg.id, 'cancelled')}
                      className="px-3.5 py-1 rounded-full bg-[#F8ECEE] text-[#B35D67] hover:bg-[#f2dde0] text-xs font-semibold"
                    >
                      ثبت عدم حضور / لغو
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Schedule Blocks (قفل کردن سانس‌ها) */}
      {salonTab === 'blocks' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-[#173B3F]">
              مسدودسازی سانس‌ها (Schedule Blocks)
            </h3>
            <p className="text-xs text-[#6C6C6C] leading-relaxed">
              برای جلوگیری از تداخل نوبت (Double-booking)، می‌توانید سانس‌های استراحت، مرخصی متخصصین یا وقت‌های پرشده حضوری را قفل کنید.
            </p>

            <form onSubmit={handleAddBlock} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <input
                type="text"
                placeholder="تاریخ (مثال: دوشنبه ۷ آبان)"
                value={newBlockDate}
                onChange={(e) => setNewBlockDate(e.target.value)}
                className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none"
              />
              <input
                type="text"
                placeholder="بازه زمانی (مثال: ۱۴:۰۰ الی ۱۵:۳۰)"
                value={newBlockTime}
                onChange={(e) => setNewBlockTime(e.target.value)}
                className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none"
              />
              <input
                type="text"
                placeholder="علت مسدودسازی"
                value={newBlockReason}
                onChange={(e) => setNewBlockReason(e.target.value)}
                className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none"
              />
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] shadow-sm"
                >
                  افزودن بلاک زمانی به تقویم
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-2">
            {scheduleBlocks.map((blk) => (
              <div
                key={blk.id}
                className="p-3 bg-white rounded-2xl border border-[#E7E2DA] flex items-center justify-between text-xs shadow-xs"
              >
                <div>
                  <span className="font-bold text-[#173B3F] block">
                    {blk.date} — {toPersianDigits(blk.time)}
                  </span>
                  <span className="text-[11px] text-[#6C6C6C]">علت: {blk.reason}</span>
                </div>
                <button
                  onClick={() => setScheduleBlocks(scheduleBlocks.filter((b) => b.id !== blk.id))}
                  className="text-xs text-[#B35D67] hover:underline font-bold"
                >
                  حذف بلاک
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Services & Pricing Management */}
      {salonTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-[#173B3F]">
              لیست خدمات و نرخ‌نامه مصوب سالن:
            </h3>
            <button
              onClick={() => setIsAddingService(!isAddingService)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#D9A2B0]" />
              <span>تعریف خدمت جدید</span>
            </button>
          </div>

          {/* Add Service Form */}
          {isAddingService && (
            <form onSubmit={handleAddService} className="p-4 bg-white rounded-3xl border border-[#173B3F] space-y-3 shadow-sm">
              <h4 className="text-xs font-bold text-[#173B3F]">فرم تعریف خدمت جدید در پلتفرم بویا</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="نام خدمت (مثال: شینیون خطی ژورنالی)"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                />
                <input
                  type="number"
                  required
                  placeholder="قیمت به تومان"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(Number(e.target.value))}
                  className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                />
                <input
                  type="number"
                  required
                  placeholder="مدت زمان (دقیقه)"
                  value={newServiceDuration}
                  onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                  className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                />
                <div className="flex items-center gap-2 text-xs text-[#1C1C1C]">
                  <input
                    type="checkbox"
                    id="mobileServiceCheck"
                    checked={newServiceMobile}
                    onChange={(e) => setNewServiceMobile(e.target.checked)}
                    className="accent-[#173B3F] w-4 h-4"
                  />
                  <label htmlFor="mobileServiceCheck">قابل ارائه در محل مشتری (Mobile Service)</label>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232]"
                >
                  ثبت و انتشار در ویترین
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingService(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs text-[#6C6C6C]"
                >
                  انصراف
                </button>
              </div>
            </form>
          )}

          {/* Services list with BeautyActivityIcon */}
          <div className="space-y-2.5">
            {salonServices.map((serv) => (
              <div
                key={serv.id}
                className="p-3.5 bg-white rounded-2xl border border-[#E7E2DA] flex items-center justify-between text-xs shadow-xs hover:border-[#173B3F] transition-all"
              >
                <div className="flex items-center gap-3">
                  <BeautyActivityIcon activityId={serv.serviceLineId} size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1C1C1C]">{serv.name}</span>
                      {serv.isMobileAvailable && (
                        <span className="text-[9px] bg-[#E8F0EF] text-[#173B3F] px-1.5 py-0.2 rounded-full font-bold">
                          سیار
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#6C6C6C] block mt-0.5">
                      مدت انجام: {toPersianDigits(serv.durationMinutes)} دقیقه • {serv.description}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-[#173B3F] block">
                    {formatPrice(serv.price)}
                  </span>
                  <span className="text-[10px] text-[#2E5E52] font-semibold">فعال در ویترین</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Specialists & Portfolio */}
      {salonTab === 'specialists' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#173B3F] px-1">
            کادر بیوتیشن‌ها و متخصصین فعال سالن:
          </h3>

          <div className="space-y-3">
            {currentSalon.specialists.map((spec) => (
              <div
                key={spec.id}
                className="bg-white rounded-2xl p-4 border border-[#E7E2DA] space-y-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={spec.avatar}
                    alt={spec.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#D9A2B0]"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1">
                      <span>{spec.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#6F9A8D]" />
                    </h4>
                    <span className="text-[11px] text-[#173B3F] font-bold">{spec.role}</span>
                    <span className="text-[10px] text-[#6C6C6C] block">
                      {toPersianDigits(spec.experienceYears)} سال سابقه • رضایت: {toPersianDigits(spec.rating.toFixed(2))}
                    </span>
                  </div>
                </div>

                {/* Portfolio previews */}
                <div>
                  <span className="text-[11px] font-semibold text-[#1C1C1C] block mb-1">
                    نمونه‌کارهای فعال در پروفایل:
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {spec.portfolio.map((p) => (
                      <div key={p.id} className="w-20 h-20 rounded-xl overflow-hidden border border-[#E7E2DA] shrink-0">
                        <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
