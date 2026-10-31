/**
 * BOYA Recommendation Engine
 * Analyzes customer's previous bookings, saved salons (wishlist), and location affinity
 * to generate personalized beauty service recommendations with reasoning and confidence scores.
 */

import { Booking, Salon, SalonService, Specialist } from '../data/marketplaceData';

export interface RecommendedServiceItem {
  id: string;
  service: SalonService;
  salon: Salon;
  specialist: Specialist;
  matchScore: number; // e.g. 98, 95
  reasonCategory: 'booking_history' | 'saved_salon' | 'routine_renewal' | 'trending';
  reasonText: string;
  badgeLabel: string;
  cadenceNote?: string;
}

// Complementary service lines mapping
const COMPLEMENTARY_LINES: Record<string, { relatedLines: string[]; suggestionTitle: string }> = {
  skincare: {
    relatedLines: ['massage_spa', 'skincare', 'makeup'],
    suggestionTitle: 'تکمیل روتین شادابی چهره و رفع استرس',
  },
  hair: {
    relatedLines: ['hair', 'massage_spa', 'skincare'],
    suggestionTitle: 'مراقبت تکمیلی ساقه مو و تغذیه ریشه',
  },
  nail: {
    relatedLines: ['eyelash_eyebrow', 'nail', 'skincare'],
    suggestionTitle: 'پکیج هماهنگ دست و چهره',
  },
  eyelash_eyebrow: {
    relatedLines: ['makeup', 'skincare', 'eyelash_eyebrow'],
    suggestionTitle: 'هماهنگی نگاه و میکاپ متناسب چهره',
  },
  makeup: {
    relatedLines: ['hair', 'skincare', 'makeup'],
    suggestionTitle: 'استایل کامل مجلسی و گریم هماهنگ',
  },
  massage_spa: {
    relatedLines: ['skincare', 'massage_spa', 'hair'],
    suggestionTitle: 'آیین آرامش‌بخش کامل جسم و ذهن',
  },
  mobile_service: {
    relatedLines: ['hair', 'nail', 'skincare'],
    suggestionTitle: 'خدمات ویژه قابل ارائه در منزل شما',
  },
};

export function generatePersonalizedRecommendations(
  bookings: Booking[],
  savedSalonIds: string[],
  salons: Salon[],
  selectedCity: string = 'همه'
): RecommendedServiceItem[] {
  const recommendations: RecommendedServiceItem[] = [];
  const activeSalons = salons.filter((s) => s.isApproved && s.status === 'active');
  const seenServiceKeys = new Set<string>();

  // Extract customer booking history lines
  const bookedServiceLines = Array.from(new Set(bookings.map((b) => b.serviceLineId)));
  const bookedSalonIds = Array.from(new Set(bookings.map((b) => b.tenantId)));
  const latestBooking = bookings[0];

  // Helper to get specialist for service
  const findBestSpecialist = (salon: Salon, service: SalonService): Specialist => {
    const matched = salon.specialists.find((sp) => sp.specialtyLine === service.serviceLineId);
    return matched || salon.specialists[0];
  };

  // 1. SIGNAL 1: Routine Renewal & Repeat Cadence (بر مبنای نوبت‌های گذشته)
  if (latestBooking) {
    const salon = activeSalons.find(
      (s) => s.id === latestBooking.tenantId || s.tenantId === latestBooking.tenantId
    );
    if (salon) {
      // Recommend renewal of the booked service or a complementary one in same salon
      const service = salon.services.find((s) => s.id === latestBooking.serviceId) || salon.services[0];
      const specialist = salon.specialists.find((sp) => sp.id === latestBooking.specialistId) || salon.specialists[0];
      const key = `${salon.id}-${service.id}`;

      if (!seenServiceKeys.has(key)) {
        seenServiceKeys.add(key);
        recommendations.push({
          id: `rec-cadence-${service.id}`,
          service,
          salon,
          specialist,
          matchScore: 99,
          reasonCategory: 'routine_renewal',
          reasonText: `موعد تمدید روتین: بر اساس آخرین نوبت «${latestBooking.serviceName}»`,
          badgeLabel: 'موعد تمدید روتین زیبایی',
          cadenceNote: 'توصیه متخصص: تجدید ماهانه جهت حفظ درخشندگی و اثربخشی ماندگار',
        });
      }
    }
  }

  // 2. SIGNAL 2: Complementary services based on booked service lines
  bookedServiceLines.forEach((lineId) => {
    const rule = COMPLEMENTARY_LINES[lineId];
    if (!rule) return;

    activeSalons.forEach((salon) => {
      // Filter by city if selected
      if (selectedCity !== 'همه' && !salon.province.includes(selectedCity) && !salon.city.includes(selectedCity)) {
        return;
      }

      salon.services.forEach((service) => {
        if (rule.relatedLines.includes(service.serviceLineId)) {
          const key = `${salon.id}-${service.id}`;
          if (!seenServiceKeys.has(key)) {
            seenServiceKeys.add(key);
            const specialist = findBestSpecialist(salon, service);
            recommendations.push({
              id: `rec-comp-${service.id}`,
              service,
              salon,
              specialist,
              matchScore: 96,
              reasonCategory: 'booking_history',
              reasonText: `خدمت مکمل روتین زیبایی: ${rule.suggestionTitle}`,
              badgeLabel: 'پیشنهاد متناسب با سلیقه شما',
            });
          }
        }
      });
    });
  });

  // 3. SIGNAL 3: Saved Salons (خدمات برتر از سالن‌های نشان‌شده کاربر)
  savedSalonIds.forEach((salonId) => {
    const salon = activeSalons.find((s) => s.id === salonId);
    if (salon) {
      salon.services.forEach((service) => {
        const key = `${salon.id}-${service.id}`;
        if (!seenServiceKeys.has(key)) {
          seenServiceKeys.add(key);
          const specialist = findBestSpecialist(salon, service);
          recommendations.push({
            id: `rec-saved-${service.id}`,
            service,
            salon,
            specialist,
            matchScore: 94,
            reasonCategory: 'saved_salon',
            reasonText: `برگزیده از سالن نشان‌شده شما: «${salon.name}»`,
            badgeLabel: 'از سالن‌های محبوب شما',
          });
        }
      });
    }
  });

  // 4. SIGNAL 4: Trending and Top-Rated fallback if user has few signals
  activeSalons.forEach((salon) => {
    if (selectedCity !== 'همه' && !salon.province.includes(selectedCity) && !salon.city.includes(selectedCity)) {
      return;
    }
    salon.services.forEach((service) => {
      const key = `${salon.id}-${service.id}`;
      if (!seenServiceKeys.has(key)) {
        seenServiceKeys.add(key);
        const specialist = findBestSpecialist(salon, service);
        recommendations.push({
          id: `rec-trend-${service.id}`,
          service,
          salon,
          specialist,
          matchScore: 89,
          reasonCategory: 'trending',
          reasonText: `خدمت پرطرفدار با بالاترین امتیاز رضایت در ${salon.district}`,
          badgeLabel: 'پرفروش و محبوب کاربران',
        });
      }
    });
  });

  // Sort by matchScore descending and return top suggestions
  return recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, 6);
}
