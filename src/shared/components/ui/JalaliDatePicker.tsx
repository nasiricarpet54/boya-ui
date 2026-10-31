import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar, ChevronRight, ChevronLeft, Clock, Check, X } from 'lucide-react';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { toPersianDigits, WEEKDAYS_FA, formatJalaliDate } from '../../utils/persianUtils';

export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

interface JalaliDatePickerProps {
  selectedDate?: string; // YYYY/MM/DD or ISO string
  onDateChange: (jalaliFormattedDate: string, rawDate: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  selectedDate,
  onDateChange,
  minDate,
  maxDate,
  label = 'تاریخ رزرو نوبت (شمسی)',
  placeholder = 'انتخاب تاریخ از تقویم...',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tehran timezone string
  const TEHRAN_TZ = 'Asia/Tehran';
  const nowTehran = useMemo(() => toZonedTime(new Date(), TEHRAN_TZ), []);

  // Parse or default current date in Tehran timezone
  const parsedDate = useMemo(() => {
    if (!selectedDate) return nowTehran;
    const d = new Date(selectedDate);
    return isNaN(d.getTime()) ? nowTehran : toZonedTime(d, TEHRAN_TZ);
  }, [selectedDate, nowTehran]);

  // Extract current Shamsi Year, Month (0-11), and Day using Intl
  const getCurrentShamsiParts = (d: Date) => {
    try {
      const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
        timeZone: TEHRAN_TZ,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
      const parts = formatter.formatToParts(d);
      const year = Number(parts.find((p) => p.type === 'year')?.value) || 1403;
      const month = (Number(parts.find((p) => p.type === 'month')?.value) || 8) - 1;
      const day = Number(parts.find((p) => p.type === 'day')?.value) || 1;
      return { year, month, day };
    } catch (e) {
      return { year: 1403, month: 7, day: 1 }; // Default Aban
    }
  };

  const initialShamsi = getCurrentShamsiParts(parsedDate);
  const [currentYear, setCurrentYear] = useState<number>(initialShamsi.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initialShamsi.month);

  useEffect(() => {
    const s = getCurrentShamsiParts(parsedDate);
    setCurrentYear(s.year);
    setCurrentMonth(s.month);
  }, [parsedDate]);

  // Close calendar popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate days in the current Shamsi month (31 for months 0-5, 30 for months 6-10, 29/30 for month 11)
  const daysInMonth = useMemo(() => {
    if (currentMonth < 6) return 31;
    if (currentMonth < 11) return 30;
    // Esfand leap year check in Jalali
    const isLeapYear = ((currentYear % 33) % 4) === 1;
    return isLeapYear ? 30 : 29;
  }, [currentYear, currentMonth]);

  // Calculate day of week for the 1st of current Shamsi month
  const firstDayOfWeekOffset = useMemo(() => {
    // Construct approximate date for 1st of current Shamsi month
    // Shamsi year 1403 starts ~ March 20, 2024
    const approxGregYear = currentYear + 621;
    const approxMonth = (currentMonth + 2) % 12 + 1;
    const testDate = new Date(Date.UTC(approxGregYear, approxMonth, 21));
    const day = testDate.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    // Convert to Saturday-first offset (0 = Sat, 1 = Sun, 2 = Mon, 3 = Tue, 4 = Wed, 5 = Thu, 6 = Fri)
    return (day + 1) % 7;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const monthFormatted = String(currentMonth + 1).padStart(2, '0');
    const dayFormatted = String(dayNum).padStart(2, '0');
    const jalaliStr = `${currentYear}/${monthFormatted}/${dayFormatted}`;
    
    // Create Date object corresponding to selected Jalali date
    const approxGregYear = currentYear + 621;
    const approxGregMonth = (currentMonth + 2) % 12;
    const rawDate = new Date(approxGregYear, approxGregMonth, dayNum, 12, 0, 0);

    onDateChange(jalaliStr, rawDate);
    setIsOpen(false);
  };

  const formattedDisplayDate = useMemo(() => {
    if (!selectedDate) return '';
    return formatJalaliDate(selectedDate, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDate]);

  return (
    <div className={`relative w-full text-right ${className}`} ref={containerRef} dir="rtl">
      {label && (
        <label className="block text-xs font-bold text-[#173B3F] mb-1.5 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#D9A2B0]" />
          <span>{label}</span>
        </label>
      )}

      {/* Input Field Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-label="انتخاب تاریخ رزرو"
        className={`w-full h-11 px-3.5 rounded-2xl bg-white border flex items-center justify-between text-xs transition-all focus-visible:ring-2 focus-visible:ring-[#173B3F] outline-none ${
          isOpen
            ? 'border-[#173B3F] ring-2 ring-[#173B3F]/20'
            : 'border-[#E7E2DA] hover:border-[#173B3F]'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className="w-4 h-4 text-[#173B3F] shrink-0" />
          <span className={`font-bold truncate ${formattedDisplayDate ? 'text-[#1C1C1C]' : 'text-[#6C6C6C]'}`}>
            {formattedDisplayDate ? toPersianDigits(formattedDisplayDate) : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full font-bold border border-[#6F9A8D]/30">
            زمان تهران
          </span>
        </div>
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 w-full sm:w-80 bg-white rounded-3xl p-4 border border-[#E7E2DA] shadow-2xl animate-in zoom-in-95 duration-200 space-y-3">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-2.5">
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="ماه بعدی"
              className="p-1.5 rounded-xl hover:bg-[#FAF7F2] text-[#173B3F] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="text-center font-serif text-sm font-bold text-[#173B3F]">
              <span>{PERSIAN_MONTHS[currentMonth]}</span>{' '}
              <span className="font-mono text-xs">{toPersianDigits(currentYear)}</span>
            </div>

            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="ماه قبلی"
              className="p-1.5 rounded-xl hover:bg-[#FAF7F2] text-[#173B3F] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels (Week starts on Saturday - شنبه) */}
          <div className="grid grid-cols-7 text-center gap-1 text-[11px] font-bold text-[#6C6C6C] pb-1 border-b border-[#E7E2DA]/50">
            {WEEKDAYS_FA.map((wd) => (
              <div key={wd.id} className={wd.id === 'fri' ? 'text-[#B35D67]' : ''}>
                {wd.short}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Empty offset cells for start of month */}
            {Array.from({ length: firstDayOfWeekOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="h-8" />
            ))}

            {/* Month Day Cells */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const isToday =
                initialShamsi.year === currentYear &&
                initialShamsi.month === currentMonth &&
                initialShamsi.day === dayNum;

              // Check if selected
              const isSelectedDay =
                selectedDate &&
                getCurrentShamsiParts(parsedDate).day === dayNum &&
                getCurrentShamsiParts(parsedDate).month === currentMonth &&
                getCurrentShamsiParts(parsedDate).year === currentYear;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 rounded-xl font-bold transition-all flex items-center justify-center text-xs ${
                    isSelectedDay
                      ? 'bg-[#173B3F] text-white shadow-sm ring-2 ring-[#173B3F]/30'
                      : isToday
                      ? 'bg-[#EAF2EF] text-[#2E5E52] border border-[#6F9A8D]'
                      : 'hover:bg-[#FAF7F2] text-[#1C1C1C]'
                  }`}
                >
                  {toPersianDigits(dayNum)}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-[#E7E2DA] flex items-center justify-between text-[11px]">
            <span className="text-[#6C6C6C] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#173B3F]" />
              <span>منطقه زمانی رسمی ایران (Tehran)</span>
            </span>

            <button
              type="button"
              onClick={() => {
                const s = getCurrentShamsiParts(nowTehran);
                handleSelectDay(s.day);
              }}
              className="text-[#173B3F] font-bold hover:underline"
            >
              امروز
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
