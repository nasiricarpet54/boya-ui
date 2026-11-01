import { toPersianDigits, formatJalaliDate } from './persianUtils';

export interface TimeSlot {
  time: string;
  booked: boolean;
  specialistId?: string;
}

export interface DaySchedule {
  date: string; // e.g., "شنبه ۵ آبان"
  fullJalaliDate: string; // e.g. "۱۴۰۳/۰۸/۰۵"
  dayName: string; // e.g. "شنبه"
  dayNumber: string; // e.g. "۵"
  rawDate: Date;
  slots: TimeSlot[];
}

export const STANDARD_HOURLY_SLOTS = [
  '۰۹:۳۰',
  '۱۱:۰۰',
  '۱۲:۳۰',
  '۱۴:۰۰',
  '۱۵:۳۰',
  '۱۷:۰۰',
  '۱۸:۳۰',
  '۲۰:۰۰',
];

/**
 * Generate upcoming 30 days in Tehran timezone with standard free/booked slots
 */
export function generateUpcomingDays(daysCount = 30, existingSlots?: any[]): DaySchedule[] {
  const result: DaySchedule[] = [];
  const now = new Date();

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const formattedDayName = formatJalaliDate(d, { weekday: 'long' });
    const formattedDayNumber = formatJalaliDate(d, { day: 'numeric' });
    const formattedMonthName = formatJalaliDate(d, { month: 'long' });
    const formattedYear = formatJalaliDate(d, { year: 'numeric' });

    const shortDateLabel = `${formattedDayName} ${toPersianDigits(formattedDayNumber)} ${formattedMonthName}`;
    const fullJalaliDate = `${formattedYear}/${formatJalaliDate(d, { month: '2-digit' })}/${formatJalaliDate(d, { day: '2-digit' })}`;

    // Check if salon already provided slots for this date label/index
    let slotsForThisDay: TimeSlot[] = [];

    if (existingSlots && existingSlots[i] && existingSlots[i].slots) {
      slotsForThisDay = existingSlots[i].slots.map((s: any) => ({
        time: toPersianDigits(s.time),
        booked: Boolean(s.booked),
        specialistId: s.specialistId,
      }));
    } else {
      // Generate default slots for future day
      // Simulate 1 or 2 booked slots randomly for realistic feel, all others open/free
      const seed = (d.getDate() + i) % 3;
      slotsForThisDay = STANDARD_HOURLY_SLOTS.map((time, idx) => ({
        time,
        booked: idx === seed || (i === 0 && idx < 2), // Past hours or seed
      }));
    }

    result.push({
      date: shortDateLabel,
      fullJalaliDate,
      dayName: formattedDayName,
      dayNumber: toPersianDigits(formattedDayNumber),
      rawDate: d,
      slots: slotsForThisDay,
    });
  }

  return result;
}

/**
 * Generate slots for an arbitrary selected date
 */
export function getSlotsForArbitraryDate(dateStr: string, existingSlots?: any[]): TimeSlot[] {
  if (existingSlots && existingSlots.length > 0) {
    const match = existingSlots.find((s: any) => s.date === dateStr || s.date.includes(dateStr));
    if (match && match.slots) {
      return match.slots.map((s: any) => ({
        time: toPersianDigits(s.time),
        booked: Boolean(s.booked),
        specialistId: s.specialistId,
      }));
    }
  }

  return STANDARD_HOURLY_SLOTS.map((time) => ({
    time,
    booked: false,
  }));
}
