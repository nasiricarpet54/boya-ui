/**
 * BOYA Live Backend API Service
 * Directly communicates with the NestJS 11 + PostgreSQL 16 backend hosted at https://boya.bcshopir.ir/api/v1
 */

import { Salon, SalonService, Specialist } from '../data/marketplaceData';

const BASE_URL = 'https://boya.bcshopir.ir/api/v1';

export interface LiveHealthStatus {
  status: string;
  timestamp: string;
  latencyMs: number;
  isConnected: boolean;
}

export interface LiveBackendSalon {
  id: string;
  name: string;
  specialty?: string;
  coverImage?: string;
  address: string;
  rating: number;
  reviewCount: number;
  distanceKm?: number | null;
  discountPercent?: number | null;
  minPrice?: number;
  tags?: string[];
  isOpenNow?: boolean;
}

export interface LiveSalonDetail extends LiveBackendSalon {
  nameEn?: string;
  slug?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  workingHours?: any;
  services?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    isMobileAvailable: boolean;
  }[];
  specialists?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    bio: string;
    skills: string[];
    offersMobileService: boolean;
  }[];
  portfolio?: {
    id: string;
    imageUrl: string;
    specialistId: string;
    specialistName: string;
  }[];
}

class BoyaApiService {
  private baseUrl = BASE_URL;

  // Check health of live NestJS backend
  async checkHealth(): Promise<LiveHealthStatus> {
    const start = performance.now();
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const end = performance.now();
      const latencyMs = Math.round(end - start);

      if (response.ok) {
        const data = await response.json();
        return {
          status: data.status || 'ok',
          timestamp: data.timestamp || new Date().toISOString(),
          latencyMs,
          isConnected: true,
        };
      }
      return { status: 'error', timestamp: new Date().toISOString(), latencyMs, isConnected: false };
    } catch {
      return { status: 'offline', timestamp: new Date().toISOString(), latencyMs: 0, isConnected: false };
    }
  }

  // Fetch live salons from PostgreSQL database
  async fetchLiveSalons(): Promise<LiveBackendSalon[]> {
    try {
      const response = await fetch(`${this.baseUrl}/salons`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return [];
      const json = await response.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  // Fetch single salon detail from PostgreSQL database
  async fetchSalonDetail(salonId: string): Promise<LiveSalonDetail | null> {
    try {
      const response = await fetch(`${this.baseUrl}/salons/${salonId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  // Send real SMS OTP via Melipayamak API through the backend
  async sendOtp(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await response.json();
      return {
        success: response.ok,
        message: data.message || (response.ok ? 'کد تأیید ارسال شد.' : 'خطا در ارسال'),
      };
    } catch {
      return { success: false, message: 'خطا در ارتباط با سرور پیامک' };
    }
  }

  // Adapt live backend salon to our Salon model
  adaptLiveSalon(live: LiveSalonDetail): Salon {
    const defaultCover =
      live.coverImage ||
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=80';

    const services: SalonService[] = (live.services || []).map((s, idx) => ({
      id: s.id || `serv-${idx}`,
      serviceLineId: 'hair',
      name: s.name,
      durationMinutes: 90,
      price: s.price || 500000,
      description: s.description || 'خدمت تایید شده در دیتابیس سالن',
      isMobileAvailable: s.isMobileAvailable || false,
    }));

    const specialists: Specialist[] = (live.specialists || []).map((sp, idx) => ({
      id: sp.id || `spec-${idx}`,
      salonId: live.id,
      name: sp.fullName,
      role: sp.skills?.join('، ') || 'بیوتیشن ارشد',
      avatar:
        sp.avatarUrl ||
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      verified: true,
      rating: 4.9,
      reviewsCount: 120,
      experienceYears: 8,
      specialtyLine: 'hair',
      isMobileSpecialist: sp.offersMobileService || false,
      phone: '۰۹۱۲۰۰۰۹۹۸۸',
      bio: sp.bio || 'متخصص تایید شده در پلتفرم بویا با گواهی مهارت بین‌المللی',
      portfolio: (live.portfolio || [])
        .filter((p) => p.specialistId === sp.id)
        .map((p) => ({
          id: p.id,
          title: 'نمونه‌کار ثبت‌شده در سرور',
          imageUrl: p.imageUrl,
          category: 'خدمات تخصصی',
          likesCount: 95,
        })),
    }));

    // City and district from address
    const districtMatch = live.address.split('،')[1] || 'تهران';

    return {
      id: live.id,
      tenantId: `tnt-${live.slug || live.id.slice(0, 8)}`,
      name: live.name,
      enName: live.nameEn || 'Boya Verified Salon',
      province: 'تهران',
      city: 'تهران',
      district: districtMatch.trim(),
      address: live.address,
      latitude: live.latitude || 35.75,
      longitude: live.longitude || 51.42,
      phone: live.phone || '۰۲۱-۸۸۰۰۹۹۸۸',
      instagram: `@${live.slug || 'boya.salon'}`,
      rating: live.rating || 4.8,
      reviewsCount: live.reviewCount || 150,
      coverImage: defaultCover,
      gallery: [defaultCover],
      isApproved: true,
      isMobileServiceActive: specialists.some((s) => s.isMobileSpecialist),
      workingHours: 'همه روزه ۹:۰۰ الی ۱۹:۰۰',
      ownerName: 'مدیریت سالن',
      ownerPhone: '۰۹۱۲۳۴۵۶۷۸۹',
      createdAt: '۱۴۰۳/۰۱/۱۵',
      status: 'active',
      services: services.length > 0 ? services : [
        {
          id: `serv-default-${live.id}`,
          serviceLineId: 'hair',
          name: live.specialty || 'خدمات تخصصی زیبایی',
          durationMinutes: 60,
          price: live.minPrice || 450000,
          description: 'ارائه با مواد اولیه بهداشتی و دارای مجوز رسمی',
          isMobileAvailable: true,
        },
      ],
      specialists: specialists.length > 0 ? specialists : [
        {
          id: `spec-default-${live.id}`,
          salonId: live.id,
          name: 'متخصص ارشد سالن',
          role: live.specialty || 'بیوتیشن رسمی',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
          verified: true,
          rating: 4.9,
          reviewsCount: 88,
          experienceYears: 7,
          specialtyLine: 'hair',
          isMobileSpecialist: true,
          phone: '۰۹۱۲۳۴۵۶۷۸۹',
          bio: 'متخصص باسابقه سالن دارای مجوز رسمی بهداشت',
          portfolio: [],
        },
      ],
      availableSlots: [
        {
          date: 'شنبه ۵ آبان',
          dayName: 'شنبه',
          dayNumber: '۰۵',
          slots: [
            { time: '۱۰:۰۰', booked: false },
            { time: '۱۱:۳۰', booked: false },
            { time: '۱۴:۰۰', booked: true },
            { time: '۱۶:۳۰', booked: false },
            { time: '۱۸:۰۰', booked: false },
          ],
        },
        {
          date: 'یکشنبه ۶ آبان',
          dayName: 'یکشنبه',
          dayNumber: '۰۶',
          slots: [
            { time: '۱۰:۳۰', booked: false },
            { time: '۱۲:۰۰', booked: false },
            { time: '۱۵:۰۰', booked: false },
            { time: '۱۷:۰۰', booked: true },
          ],
        },
      ],
    };
  }
}

export const boyaApi = new BoyaApiService();
