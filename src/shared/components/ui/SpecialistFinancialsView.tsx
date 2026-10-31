import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  Sparkles,
  Car,
  Building2,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Receipt,
  Download
} from 'lucide-react';
import { Specialist, Booking } from '../../data/marketplaceData';
import { formatPrice, toPersianDigits } from '../../utils/persianUtils';

interface SpecialistFinancialsViewProps {
  specialist: any;
  bookings: any[];
  salonName: string;
}

interface MonthlyDataPoint {
  month: string;
  salonRevenue: number;
  mobileRevenue: number;
  totalRevenue: number;
  completedBookingsCount: number;
}

// Custom Recharts Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const salonVal = payload.find((p: any) => p.dataKey === 'salonRevenue')?.value || 0;
    const mobileVal = payload.find((p: any) => p.dataKey === 'mobileRevenue')?.value || 0;
    const total = salonVal + mobileVal;

    return (
      <div className="bg-[#173B3F] text-white p-3.5 rounded-2xl shadow-xl border border-[#D9A2B0]/40 text-xs space-y-2 min-w-[210px] animate-fadeIn">
        <div className="flex items-center justify-between border-b border-white/15 pb-1.5">
          <span className="font-bold text-sm text-[#D9A2B0]">{label}</span>
          <span className="text-[10px] text-[#E8F0EF]">گزارش درآمد</span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center text-[#E8F0EF]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#6F9A8D]" />
              <span>خدمات در سالن:</span>
            </span>
            <span className="font-bold">{formatPrice(salonVal)}</span>
          </div>

          <div className="flex justify-between items-center text-[#E8F0EF]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#D9A2B0]" />
              <span>خدمات سیار / در محل:</span>
            </span>
            <span className="font-bold">{formatPrice(mobileVal)}</span>
          </div>

          <div className="pt-1.5 border-t border-white/20 flex justify-between items-center font-bold text-white text-xs">
            <span>مجموع ناخالص ماه:</span>
            <span className="text-[#D9A2B0]">{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const SpecialistFinancialsView: React.FC<SpecialistFinancialsViewProps> = ({
  specialist,
  bookings,
  salonName,
}) => {
  const [timeRange, setTimeRange] = useState<'6months' | '3months' | 'year'>('6months');
  const [chartMode, setChartMode] = useState<'grouped' | 'stacked'>('grouped');

  // Filter bookings strictly for this specialist that are confirmed or completed
  const specialistCompletedBookings = useMemo(() => {
    return bookings.filter(
      (b: any) =>
        (b.specialistId === specialist.id) &&
        (b.status === 'completed' || b.status === 'confirmed')
    );
  }, [bookings, specialist]);

  // Current month dynamic extra revenue from real bookings
  const dynamicCurrentMonthSalonRevenue = useMemo(() => {
    return specialistCompletedBookings
      .filter((b: any) => !b.isMobileBooking)
      .reduce((sum, b: any) => sum + Number(b.price), 0);
  }, [specialistCompletedBookings]);

  const dynamicCurrentMonthMobileRevenue = useMemo(() => {
    return specialistCompletedBookings
      .filter((b: any) => b.isMobileBooking)
      .reduce((sum, b: any) => sum + Number(b.price), 0);
  }, [specialistCompletedBookings]);

  // Monthly breakdown dataset customized for this specialist
  const rawMonthlyData: MonthlyDataPoint[] = useMemo(() => {
    // Baseline factors depending on experience and rating
    const ratingValue = Number(specialist.rating) || 5;
    const experienceValue = Number(specialist.experienceYears) || 0;
    const baseMultiplier = (ratingValue / 5) * (experienceValue >= 10 ? 1.25 : 1.0);
    const isMobilePrimary = specialist.isMobileActive || specialist.user?.role === 'mobile_specialist';

    return [
      {
        month: 'اردیبهشت',
        salonRevenue: isMobilePrimary ? 4500000 : Math.round(14500000 * baseMultiplier),
        mobileRevenue: isMobilePrimary ? Math.round(18500000 * baseMultiplier) : 3200000,
        totalRevenue: 0,
        completedBookingsCount: 16,
      },
      {
        month: 'خرداد',
        salonRevenue: isMobilePrimary ? 5200000 : Math.round(17200000 * baseMultiplier),
        mobileRevenue: isMobilePrimary ? Math.round(21000000 * baseMultiplier) : 4800000,
        totalRevenue: 0,
        completedBookingsCount: 19,
      },
      {
        month: 'تیر',
        salonRevenue: isMobilePrimary ? 6800000 : Math.round(21000000 * baseMultiplier),
        mobileRevenue: isMobilePrimary ? Math.round(24500000 * baseMultiplier) : 5500000,
        totalRevenue: 0,
        completedBookingsCount: 23,
      },
      {
        month: 'مرداد',
        salonRevenue: isMobilePrimary ? 7400000 : Math.round(24800000 * baseMultiplier),
        mobileRevenue: isMobilePrimary ? Math.round(28200000 * baseMultiplier) : 6200000,
        totalRevenue: 0,
        completedBookingsCount: 27,
      },
      {
        month: 'شهریور',
        salonRevenue: isMobilePrimary ? 8100000 : Math.round(27500000 * baseMultiplier),
        mobileRevenue: isMobilePrimary ? Math.round(31500000 * baseMultiplier) : 7100000,
        totalRevenue: 0,
        completedBookingsCount: 31,
      },
      {
        month: 'مهر',
        salonRevenue: isMobilePrimary ? 7200000 : Math.round(23400000 * baseMultiplier),
        mobileRevenue: isMobilePrimary ? Math.round(26000000 * baseMultiplier) : 5900000,
        totalRevenue: 0,
        completedBookingsCount: 25,
      },
      {
        month: 'آبان (جاری)',
        salonRevenue:
          (isMobilePrimary ? 6500000 : Math.round(19500000 * baseMultiplier)) +
          dynamicCurrentMonthSalonRevenue,
        mobileRevenue:
          (isMobilePrimary ? Math.round(23000000 * baseMultiplier) : 5000000) +
          dynamicCurrentMonthMobileRevenue,
        totalRevenue: 0,
        completedBookingsCount: 22 + specialistCompletedBookings.length,
      },
    ].map((item) => ({
      ...item,
      totalRevenue: item.salonRevenue + item.mobileRevenue,
    }));
  }, [specialist, dynamicCurrentMonthSalonRevenue, dynamicCurrentMonthMobileRevenue, specialistCompletedBookings]);

  // Sliced data based on time range
  const chartData = useMemo(() => {
    if (timeRange === '3months') {
      return rawMonthlyData.slice(-3);
    }
    if (timeRange === 'year') {
      return rawMonthlyData;
    }
    return rawMonthlyData.slice(-6);
  }, [rawMonthlyData, timeRange]);

  // Aggregate Key Performance Indicators (KPIs)
  const currentMonthPoint = rawMonthlyData[rawMonthlyData.length - 1];
  const previousMonthPoint = rawMonthlyData[rawMonthlyData.length - 2];

  const totalEarningsInPeriod = chartData.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalCompletedBookings = chartData.reduce((acc, curr) => acc + curr.completedBookingsCount, 0);
  const averageTicketValue = totalCompletedBookings > 0 ? Math.round(totalEarningsInPeriod / totalCompletedBookings) : 0;

  // Percentage growth vs last month
  const growthPercent =
    previousMonthPoint && previousMonthPoint.totalRevenue > 0
      ? Math.round(((currentMonthPoint.totalRevenue - previousMonthPoint.totalRevenue) / previousMonthPoint.totalRevenue) * 100)
      : 8;

  // Payout calculation (e.g. 85% specialist share after salon platform fee)
  const specialistCommissionSharePercent = 85;
  const netSpecialistShare = Math.round((currentMonthPoint.totalRevenue * specialistCommissionSharePercent) / 100);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header and Controls */}
      <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#173B3F]" />
            <h3 className="text-sm font-bold text-[#173B3F]">
              عملکرد مالی و نمودار میله‌ای درآمد ماهیانه ({specialist.name})
            </h3>
            <span className="text-[10px] bg-[#EAF2EF] text-[#2E5E52] px-2.5 py-0.5 rounded-full font-bold border border-[#6F9A8D]/30">
              سهم خالص ۸۵٪
            </span>
          </div>
          <p className="text-xs text-[#6C6C6C] mt-1">
            تحلیل درآمدهای حاصل از سرویس‌های تکمیل‌شده به تفکیک خدمات داخل سالن و خدمات سیار (اعزام به محل مشتری)
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex p-1 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] text-xs">
            <button
              onClick={() => setTimeRange('3months')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeRange === '3months'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              ۳ ماه اخیر
            </button>
            <button
              onClick={() => setTimeRange('6months')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeRange === '6months'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              ۶ ماه اخیر
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeRange === 'year'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              کل دوره
            </button>
          </div>

          <button
            onClick={() => setChartMode(chartMode === 'grouped' ? 'stacked' : 'grouped')}
            className="px-3 py-2 rounded-2xl bg-white border border-[#E7E2DA] text-xs font-bold text-[#173B3F] hover:border-[#173B3F] transition-all flex items-center gap-1 shadow-xs"
            title="تغییر نحوه نمایش نمودار"
          >
            <Layers className="w-3.5 h-3.5 text-[#D9A2B0]" />
            <span>{chartMode === 'grouped' ? 'میله‌ای تجمیعی' : 'میله‌ای مجزا'}</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Current Month Total */}
        <div className="bg-white rounded-3xl p-4 border border-[#E7E2DA] shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#6C6C6C]">
            <span>درآمد ناخالص آبان:</span>
            <span className="text-[10px] font-bold text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>{toPersianDigits(growthPercent)}٪+ رشد</span>
            </span>
          </div>
          <p className="text-base sm:text-lg font-bold text-[#173B3F]">
            {formatPrice(currentMonthPoint.totalRevenue)}
          </p>
          <span className="text-[10px] text-[#6C6C6C] block">
            {toPersianDigits(currentMonthPoint.completedBookingsCount)} نوبت پذیرش شده
          </span>
        </div>

        {/* Card 2: Net Payout Share */}
        <div className="bg-white rounded-3xl p-4 border border-[#E7E2DA] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#6C6C6C]">
            <span>دریافتی خالص شما:</span>
            <span className="text-[10px] text-[#D9A2B0] font-bold">۸۵٪ سهم متخصص</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-[#2E5E52]">
            {formatPrice(netSpecialistShare)}
          </p>
          <span className="text-[10px] text-[#2E5E52] block">آماده واریز هفتگی پایا</span>
        </div>

        {/* Card 3: Average Ticket Value */}
        <div className="bg-white rounded-3xl p-4 border border-[#E7E2DA] shadow-xs space-y-1">
          <span className="text-xs text-[#6C6C6C] block">میانگین ارزش هر نوبت:</span>
          <p className="text-base sm:text-lg font-bold text-[#173B3F]">
            {formatPrice(averageTicketValue)}
          </p>
          <span className="text-[10px] text-[#6C6C6C] block">بر اساس تمام خدمات</span>
        </div>

        {/* Card 4: Total Period Revenue */}
        <div className="bg-white rounded-3xl p-4 border border-[#E7E2DA] shadow-xs space-y-1">
          <span className="text-xs text-[#6C6C6C] block">مجموع درآمد دوره انتخابی:</span>
          <p className="text-base sm:text-lg font-bold text-[#173B3F]">
            {formatPrice(totalEarningsInPeriod)}
          </p>
          <span className="text-[10px] text-[#6C6C6C] block">
            {toPersianDigits(totalCompletedBookings)} سرویس ثبت‌شده
          </span>
        </div>
      </div>

      {/* Main Recharts Bar Chart Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E2DA] pb-3">
          <div>
            <h4 className="text-xs font-bold text-[#173B3F] flex items-center gap-2">
              <BarChart className="w-4 h-4 text-[#173B3F]" />
              <span>نمودار میله‌ای درآمد ماهانه به تفکیک سالن و خدمات سیار</span>
            </h4>
            <span className="text-[11px] text-[#6C6C6C]">واحد مقادیر: تومان ایران (ارقام به میلیون تومان ساده‌سازی شده‌اند)</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#173B3F]">
              <span className="w-3 h-3 rounded-md bg-[#173B3F]" />
              <span>خدمات در سالن</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#D9A2B0]">
              <span className="w-3 h-3 rounded-md bg-[#D9A2B0]" />
              <span>خدمات سیار (در محل)</span>
            </span>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-80 dir-ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
              barGap={chartMode === 'grouped' ? 6 : 0}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E2DA" opacity={0.7} vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#173B3F"
                tick={{ fill: '#173B3F', fontSize: 11, fontWeight: 'bold' }}
                axisLine={{ stroke: '#E7E2DA' }}
                tickLine={false}
              />
              <YAxis
                stroke="#6C6C6C"
                tick={{ fill: '#6C6C6C', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${toPersianDigits(Math.round(val / 1000000))} م`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                height={30}
                formatter={(val) => (
                  <span className="text-xs font-bold text-[#173B3F] px-1">{val}</span>
                )}
              />

              {chartMode === 'grouped' ? (
                <>
                  <Bar
                    dataKey="salonRevenue"
                    name="درآمد خدمات سالن"
                    fill="#173B3F"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="mobileRevenue"
                    name="درآمد خدمات سیار"
                    fill="#D9A2B0"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                </>
              ) : (
                <>
                  <Bar
                    dataKey="salonRevenue"
                    name="درآمد خدمات سالن"
                    stackId="a"
                    fill="#173B3F"
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="mobileRevenue"
                    name="درآمد خدمات سیار"
                    stackId="a"
                    fill="#D9A2B0"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Details and Completed Bookings Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Settlement Account Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#D9A2B0]" />
              <span>مشخصات حساب واریز دستمزد</span>
            </h4>
            <span className="text-[10px] text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full font-bold">
              تایید شده شتاب
            </span>
          </div>

          <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-2 text-xs">
            <div className="flex justify-between items-center text-[#6C6C6C]">
              <span>بانک مقصد:</span>
              <strong className="text-[#1C1C1C]">بانک سامان (حساب تجاری بویا)</strong>
            </div>
            <div className="flex justify-between items-center text-[#6C6C6C]">
              <span>شماره شبا:</span>
              <strong className="font-mono text-[#173B3F]">IR12-0560-0849-8000-1122-3344</strong>
            </div>
            <div className="flex justify-between items-center text-[#6C6C6C]">
              <span>دوره تسویه‌حساب:</span>
              <strong className="text-[#1C1C1C]">هر دوشنبه ساعت ۱۰:۰۰ صبح</strong>
            </div>
          </div>

          <p className="text-[11px] text-[#6C6C6C] leading-relaxed">
            مبالغ خدمات به صورت مستقیم پس از کسر کارمزد زیرساخت نرم‌افزاری بویا و سهم سالن همکار به شبای فوق واریز می‌گردد.
          </p>
        </div>

        {/* Completed Bookings Ledger Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#173B3F]" />
              <span>ریز تراکنش‌های نوبت‌های اخیر ثبت‌شده ({toPersianDigits(specialistCompletedBookings.length)} رکورد)</span>
            </h4>
            <span className="text-[10px] text-[#6C6C6C]">همگام با دفتر مالی سالن</span>
          </div>

          {specialistCompletedBookings.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#6C6C6C] bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA]">
              هنوز نوبت تکمیل‌شده‌ای در کارتابل مالی این ماه شما ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {specialistCompletedBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-2.5 rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2] flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1C1C1C]">{b.customerName}</span>
                      {b.isMobileBooking ? (
                        <span className="text-[9px] bg-[#FAF7F2] text-[#C99558] border border-[#C99558]/30 px-1.5 py-0.2 rounded-md font-bold">
                          خدمت سیار
                        </span>
                      ) : (
                        <span className="text-[9px] bg-[#EAF2EF] text-[#2E5E52] border border-[#6F9A8D]/30 px-1.5 py-0.2 rounded-md font-bold">
                          در سالن
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#6C6C6C] block">
                      {b.serviceName} • {b.date}
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="font-bold text-[#173B3F] block">
                      {formatPrice(b.price)}
                    </span>
                    <span className="text-[10px] text-[#2E5E52] font-semibold">
                      سهم خالص: {formatPrice(Math.round(b.price * 0.85))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
