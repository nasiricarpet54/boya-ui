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
      {/* Salon Identification Card */}
      <div className="bg-[#1A2942] text-white rounded-3xl p-5 border border-[#C59B27]/40 shadow-lg relative overflow-hidden">
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-[#10B981] bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                <span>سالندار تایید شده (Approved Tenant)</span>
              </span>
              <span className="text-[10px] font-mono text-[#FECE57]">
                شناسه: {currentSalon.tenantId}
              </span>
            </div>
            <h1 className="text-lg font-bold font-serif text-white">
              {currentSalon.name}
            </h1>
            <p className="text-xs text-[#D6E3FF] mt-0.5">
              {currentSalon.province}، {currentSalon.district} — {currentSalon.address}
            </p>
          </div>

          <button
            onClick={onSwitchToCustomerApp}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#C59B27] hover:bg-[#B8860B] text-[#1A2942] text-xs font-bold transition-all shadow-sm shrink-0"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>مشاهده ویترین مشتری</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 mt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-[#A0AEC0] block">نوبت‌های جاری:</span>
            <span className="text-sm font-bold text-[#FECE57]">{toPersianDigits(todayBookingsCount)} نوبت</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-[#A0AEC0] block">برآورد درآمد:</span>
            <span className="text-sm font-bold text-white">{formatPrice(totalRevenue)}</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-[#A0AEC0] block">کادر متخصصین:</span>
            <span className="text-sm font-bold text-white">{toPersianDigits(currentSalon.specialists.length)} نفر</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-[#A0AEC0] block">امتیاز سالن:</span>
            <span className="text-sm font-bold text-[#10B981]">{toPersianDigits(currentSalon.rating.toFixed(2))} ★</span>
          </div>
        </div>
      </div>

      {/* Segmented Controls */}
      <div className="flex p-1 bg-white rounded-2xl border border-[#E2E8F0]">
        <button
          onClick={() => setSalonTab('schedule')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            salonTab === 'schedule'
              ? 'bg-[#1A2942] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#1A2942]'
          }`}
        >
          نوبت‌های ثبت شده ({toPersianDigits(bookings.length)})
        </button>
        <button
          onClick={() => setSalonTab('blocks')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            salonTab === 'blocks'
              ? 'bg-[#1A2942] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#1A2942]'
          }`}
        >
          مسدودسازی سانس‌ها
        </button>
        <button
          onClick={() => setSalonTab('services')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            salonTab === 'services'
              ? 'bg-[#1A2942] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#1A2942]'
          }`}
        >
          مدیریت خدمات و قیمت‌ها
        </button>
        <button
          onClick={() => setSalonTab('specialists')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            salonTab === 'specialists'
              ? 'bg-[#1A2942] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#1A2942]'
          }`}
        >
          پرسنل و نمونه‌کارها
        </button>
      </div>

      {/* TAB 1: Real-time Bookings Manager */}
      {salonTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-[#1A2942]">
              نوبت‌های مشتریان (ورودی از اپلیکیشن مشتری بویا):
            </h3>
            <span className="text-[11px] text-[#64748B]">
              به‌روزرسانی لحظه‌ای
            </span>
          </div>

          <div className="space-y-3">
            {bookings.map((bkg) => (
              <div
                key={bkg.id}
                className="bg-white rounded-2xl p-4 border border-[#EEDCC5] space-y-3 shadow-sm hover:border-[#C59B27] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1A2942]">
                        {bkg.customerName}
                      </span>
                      <span className="text-[11px] font-mono text-[#64748B]">
                        ({toPersianDigits(bkg.customerPhone)})
                      </span>
                      {bkg.isMobileBooking && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          خدمت در محل مشتری
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#775A00] block mt-1">
                      {bkg.serviceName} با متخصص {bkg.specialistName}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      bkg.status === 'confirmed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : bkg.status === 'completed'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {bkg.status === 'confirmed'
                      ? 'تایید شده'
                      : bkg.status === 'completed'
                      ? 'انجام شده'
                      : 'لغو شده'}
                  </span>
                </div>

                <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#F2EDE5] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#C59B27]" />
                    <span>
                      {bkg.date} - ساعت {toPersianDigits(bkg.time)}
                    </span>
                  </div>
                  <span className="font-bold text-[#1A2942]">
                    مبلغ: {formatPrice(bkg.price)}
                  </span>
                </div>

                {bkg.notes && (
                  <p className="text-[11px] text-[#64748B] italic">
                    ملاحظات مشتری: {bkg.notes}
                  </p>
                )}

                {/* Status action buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F2EDE5]">
                  {bkg.status !== 'completed' && (
                    <button
                      onClick={() => onUpdateBookingStatus(bkg.id, 'completed')}
                      className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      تکمیل خدمت
                    </button>
                  )}
                  {bkg.status !== 'cancelled' && (
                    <button
                      onClick={() => onUpdateBookingStatus(bkg.id, 'cancelled')}
                      className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs font-semibold"
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
          <div className="bg-white rounded-3xl p-5 border border-[#EEDCC5] space-y-3">
            <h3 className="text-sm font-bold text-[#1A2942]">
              مسدودسازی سانس‌ها (Schedule Blocks)
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              برای جلوگیری از تداخل نوبت (Double-booking)، می‌توانید سانس‌های استراحت، مرخصی متخصصین یا وقت‌های پرشده حضوری را قفل کنید.
            </p>

            <form onSubmit={handleAddBlock} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <input
                type="text"
                placeholder="تاریخ (مثال: دوشنبه ۷ آبان)"
                value={newBlockDate}
                onChange={(e) => setNewBlockDate(e.target.value)}
                className="h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#1A2942] focus:border-[#C59B27] outline-none"
              />
              <input
                type="text"
                placeholder="بازه زمانی (مثال: ۱۴:۰۰ الی ۱۵:۳۰)"
                value={newBlockTime}
                onChange={(e) => setNewBlockTime(e.target.value)}
                className="h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#1A2942] focus:border-[#C59B27] outline-none"
              />
              <input
                type="text"
                placeholder="علت مسدودسازی"
                value={newBlockReason}
                onChange={(e) => setNewBlockReason(e.target.value)}
                className="h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#1A2942] focus:border-[#C59B27] outline-none"
              />
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1A2942] text-white text-xs font-semibold hover:bg-[#04142C]"
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
                className="p-3 bg-white rounded-2xl border border-[#EEDCC5] flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-[#1A2942] block">
                    {blk.date} — {toPersianDigits(blk.time)}
                  </span>
                  <span className="text-[11px] text-[#64748B]">علت: {blk.reason}</span>
                </div>
                <button
                  onClick={() => setScheduleBlocks(scheduleBlocks.filter((b) => b.id !== blk.id))}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
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
            <h3 className="text-sm font-bold text-[#1A2942]">
              لیست خدمات و نرخ‌نامه مصوب سالن:
            </h3>
            <button
              onClick={() => setIsAddingService(!isAddingService)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#C59B27] text-[#1A2942] text-xs font-bold hover:bg-[#B8860B]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تعریف خدمت جدید</span>
            </button>
          </div>

          {/* Add Service Form */}
          {isAddingService && (
            <form onSubmit={handleAddService} className="p-4 bg-white rounded-3xl border border-[#C59B27] space-y-3">
              <h4 className="text-xs font-bold text-[#1A2942]">فرم تعریف خدمت جدید در پلتفرم بویا</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="نام خدمت (مثال: شینیون خطی ژورنالی)"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:border-[#C59B27] outline-none"
                />
                <input
                  type="number"
                  required
                  placeholder="قیمت به تومان"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(Number(e.target.value))}
                  className="h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:border-[#C59B27] outline-none"
                />
                <input
                  type="number"
                  required
                  placeholder="مدت زمان (دقیقه)"
                  value={newServiceDuration}
                  onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                  className="h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:border-[#C59B27] outline-none"
                />
                <div className="flex items-center gap-2 text-xs text-[#1A2942]">
                  <input
                    type="checkbox"
                    id="mobileServiceCheck"
                    checked={newServiceMobile}
                    onChange={(e) => setNewServiceMobile(e.target.checked)}
                    className="accent-[#C59B27] w-4 h-4"
                  />
                  <label htmlFor="mobileServiceCheck">قابل ارائه در محل مشتری (Mobile Service)</label>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#1A2942] text-white text-xs font-bold"
                >
                  ثبت و انتشار در ویترین
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingService(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs"
                >
                  انصراف
                </button>
              </div>
            </form>
          )}

          {/* Services list */}
          <div className="space-y-2.5">
            {salonServices.map((serv) => (
              <div
                key={serv.id}
                className="p-3.5 bg-white rounded-2xl border border-[#EEDCC5] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1A2942]">{serv.name}</span>
                    {serv.isMobileAvailable && (
                      <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded-full font-semibold">
                        سیار
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#64748B] block mt-0.5">
                    مدت انجام: {toPersianDigits(serv.durationMinutes)} دقیقه • {serv.description}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-[#775A00] block">
                    {formatPrice(serv.price)}
                  </span>
                  <span className="text-[10px] text-emerald-700">فعال در ویترین</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Specialists & Portfolio */}
      {salonTab === 'specialists' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#1A2942] px-1">
            کادر بیوتیشن‌ها و متخصصین فعال سالن:
          </h3>

          <div className="space-y-3">
            {currentSalon.specialists.map((spec) => (
              <div
                key={spec.id}
                className="bg-white rounded-2xl p-4 border border-[#EEDCC5] space-y-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={spec.avatar}
                    alt={spec.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#C59B27]"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#1A2942] flex items-center gap-1">
                      <span>{spec.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    </h4>
                    <span className="text-[11px] text-[#775A00]">{spec.role}</span>
                    <span className="text-[10px] text-[#64748B] block">
                      {toPersianDigits(spec.experienceYears)} سال سابقه • رضایت: {toPersianDigits(spec.rating.toFixed(2))}
                    </span>
                  </div>
                </div>

                {/* Portfolio previews */}
                <div>
                  <span className="text-[11px] font-semibold text-[#1A2942] block mb-1">
                    نمونه‌کارهای فعال در پروفایل:
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {spec.portfolio.map((p) => (
                      <div key={p.id} className="w-20 h-20 rounded-xl overflow-hidden border shrink-0">
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
