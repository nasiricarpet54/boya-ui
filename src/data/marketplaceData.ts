/**
 * BOYA Platform Data Models & Datasets
 * Based on BOYA Architecture: NestJS + TypeORM multi-tenant schema with
 * tenants (salons), specialists, service lines, bookings, reviews and support tickets.
 */

export interface ServiceLine {
  id: string;
  name: string;
  enName: string;
  emoji: string;
  description: string;
  color: string;
}

export interface SalonService {
  id: string;
  serviceLineId: string;
  name: string;
  durationMinutes: number;
  price: number;
  description: string;
  isMobileAvailable?: boolean; // قابلیت ارائه در محل مشتری (ADR Mobile Service)
}

export interface SpecialistPortfolio {
  id: string;
  title: string;
  imageUrl: string;
  category: string;
  likesCount: number;
}

export interface Specialist {
  id: string;
  salonId: string;
  name: string;
  role: string;
  avatar: string;
  verified: boolean;
  rating: number;
  reviewsCount: number;
  experienceYears: number;
  specialtyLine: string;
  bio: string;
  isMobileSpecialist: boolean; // متخصص سیار / در محل
  portfolio: SpecialistPortfolio[];
}

export interface Salon {
  id: string;
  tenantId: string; // Multi-tenant ID (RLS tenant_id)
  name: string;
  enName: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  instagram: string;
  rating: number;
  reviewsCount: number;
  coverImage: string;
  gallery: string[];
  isApproved: boolean; // Admin approval status
  isMobileServiceActive: boolean; // خدمات در منزل / محل مشتری
  workingHours: string;
  services: SalonService[];
  specialists: Specialist[];
  availableSlots: {
    date: string; // e.g. "شنبه ۵ آبان"
    dayName: string;
    dayNumber: string;
    slots: {
      time: string;
      booked: boolean;
      specialistId?: string;
    }[];
  }[];
}

export interface Booking {
  id: string;
  trackingCode: string; // ملی‌پیامک OTP / پیامک رهگیری
  tenantId: string;
  salonName: string;
  salonAddress: string;
  serviceId: string;
  serviceName: string;
  serviceLineId: string;
  specialistId: string;
  specialistName: string;
  date: string;
  time: string;
  durationMinutes: number;
  price: number;
  customerName: string;
  customerPhone: string;
  notes?: string;
  isMobileBooking: boolean; // رزرو در محل مشتری
  customerAddress?: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending';
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  title: string;
  category: 'booking' | 'salon' | 'specialist' | 'account' | 'payment';
  status: 'open' | 'in_progress' | 'resolved';
  lastReply: string;
  createdAt: string;
  messages: {
    sender: 'user' | 'support';
    text: string;
    time: string;
  }[];
}

// Service Lines (دسته‌بندی‌های اصلی خدمات زیبایی بویا مطابق با مایگریشن 1730000000003-ServiceLines)
export const SERVICE_LINES: ServiceLine[] = [
  {
    id: 'all',
    name: 'همه خدمات',
    enName: 'All Services',
    emoji: '✨',
    description: 'تمامی خدمات و سالن‌های زیبایی فعال',
    color: '#C59B27',
  },
  {
    id: 'hair',
    name: 'مو و استایل',
    enName: 'Hair & Styling',
    emoji: '💇‍♀️',
    description: 'کوتاهی، رنگ و بالیاژ، کراتین و احیای ابریشمی، شینیون',
    color: '#D4A574',
  },
  {
    id: 'nail',
    name: 'ناخن و اسپا دست',
    enName: 'Nails & Spa',
    emoji: '💅',
    description: 'کاشت ژل و پودر، لمینت، ژلیش، مانیکور روسی و پدیکور',
    color: '#B8860B',
  },
  {
    id: 'eyelash_eyebrow',
    name: 'مژه و ابرو',
    enName: 'Lashes & Brows',
    emoji: '👁️',
    description: 'اکستنشن مژه اسپایکی و مگاوالیوم، فیبروز، لیفت و لمینت',
    color: '#1A2942',
  },
  {
    id: 'skincare',
    name: 'پوست و فیشیال',
    enName: 'Skincare & Facial',
    emoji: '🫧',
    description: 'پاکسازی عمقی، هیدرافیشیال، پیلینگ، مزوتراپی و جوانسازی',
    color: '#10B981',
  },
  {
    id: 'makeup',
    name: 'میکاپ و چهره',
    enName: 'Makeup & Bridal',
    emoji: '💄',
    description: 'میکاپ تخصصی عروس، گریم سینمایی و کانتورینگ چهره',
    color: '#E11D48',
  },
  {
    id: 'massage_spa',
    name: 'اسپا و ماساژ',
    enName: 'Spa & Wellness',
    emoji: '🕯️',
    description: 'ماساژ ریلکسی، سنگ داغ، آروماتراپی و حمام سنتی',
    color: '#775A00',
  },
  {
    id: 'mobile_service',
    name: 'خدمات در محل',
    enName: 'At-Home Services',
    emoji: '🚗',
    description: 'اعزام متخصص تایید شده به منزل یا محل مورد نظر شما',
    color: '#04142C',
  },
];

// Salons / Tenants (مطابق با دیتابیس Multi-tenant پلتفرم بویا)
export const SALONS: Salon[] = [
  {
    id: 'salon-1',
    tenantId: 'tnt-tehran-elahiyeh-01',
    name: 'سالن زیبایی و عمارت گل سرخ',
    enName: 'Gol-e Sorkh Luxury Villa',
    province: 'تهران',
    city: 'تهران',
    district: 'الهیه',
    address: 'خیابان فرشته، بن‌بست نیلوفر، عمارت شماره ۱۲',
    latitude: 35.7951,
    longitude: 51.4239,
    phone: '۰۲۱-۲۲۰۰۵۵۴۴',
    instagram: '@golesorkh.beautyluxe',
    rating: 4.94,
    reviewsCount: 382,
    isApproved: true,
    isMobileServiceActive: true,
    workingHours: 'همه روزه ۹:۰۰ الی ۲۱:۰۰ (با تعیین وقت قبلی)',
    coverImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=80',
    ],
    services: [
      {
        id: 'serv-101',
        serviceLineId: 'hair',
        name: 'کراتین و احیای پروتئینه نانو ابریشمی',
        durationMinutes: 120,
        price: 3800000,
        description: 'صافی و احیای ۱۰۰٪ بدون فرمالدئید با روغن کندر و خاویار، مناسب موهای آسیب‌دیده و دکلره شده',
        isMobileAvailable: true,
      },
      {
        id: 'serv-102',
        serviceLineId: 'skincare',
        name: 'هیدرافیشیال کلینیکال و اکسیژن‌تراپی طلا',
        durationMinutes: 90,
        price: 2600000,
        description: 'پاکسازی چندمرحله‌ای، تخلیه کمدون با اولتراسونیک، تزریق سرم زعفران و ماسک ورق طلای ۲۴ عیار',
        isMobileAvailable: false,
      },
      {
        id: 'serv-103',
        serviceLineId: 'nail',
        name: 'کاشت ناخن با پودر روسی و ژلیش کهکشانی',
        durationMinutes: 90,
        price: 1100000,
        description: 'فرم‌دهی طبیعی، مانیکور دقیق روسی با سرسوهان الماسه و لاک‌ژل شاین با ماندگاری ۴۵ روزه',
        isMobileAvailable: true,
      },
      {
        id: 'serv-104',
        serviceLineId: 'eyelash_eyebrow',
        name: 'اکستنشن مژه اسپایکی و مگاوالیوم ابریشمی',
        durationMinutes: 105,
        price: 1450000,
        description: 'تارهای فوق سبک بدون احساس سنگینی، چسب گیاهی ضدحساسیت و لیفت ملایم گوشه چشم',
        isMobileAvailable: false,
      },
    ],
    specialists: [
      {
        id: 'spec-1',
        salonId: 'salon-1',
        name: 'مریم شمس‌آرا',
        role: 'مستر اسکین‌کر و فیشیالیست ارشد',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
        verified: true,
        rating: 4.96,
        reviewsCount: 142,
        experienceYears: 12,
        specialtyLine: 'skincare',
        isMobileSpecialist: false,
        bio: 'دارای مدرک بین‌المللی بیوتی تراپیست از آکادمی ژنو و مدرس فیشیال‌های جوانساز در دربار زیبایی',
        portfolio: [
          {
            id: 'port-1',
            title: 'درمان لک و شفاف‌سازی پوست با عصاره زعفران',
            imageUrl: 'https://images.unsplash.com/photo-1512290900672-1f486a42a033?auto=format&fit=crop&w=600&q=80',
            category: 'فیشیال',
            likesCount: 89,
          },
          {
            id: 'port-2',
            title: 'هیدرودرمی و بستن منافذ باز چهره',
            imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80',
            category: 'اسکین‌کر',
            likesCount: 124,
          },
        ],
      },
      {
        id: 'spec-2',
        salonId: 'salon-1',
        name: 'نازنین رادمنش',
        role: 'استایلیست ارشد مو و متخصص رنگ و لایت',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
        verified: true,
        rating: 4.92,
        reviewsCount: 118,
        experienceYears: 10,
        specialtyLine: 'hair',
        isMobileSpecialist: true,
        bio: 'متخصص ژورنال‌خوانی و تکنیک‌های آمبره روسی، بالیاژ خطی و پروتئین‌تراپی ساقه‌های آسیب‌دیده',
        portfolio: [
          {
            id: 'port-3',
            title: 'بالیاژ شنی کاراملی با احیای بوتاکس مو',
            imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
            category: 'رنگ و لایت',
            likesCount: 210,
          },
        ],
      },
    ],
    availableSlots: [
      {
        date: 'شنبه ۵ آبان',
        dayName: 'شنبه',
        dayNumber: '۰۵',
        slots: [
          { time: '۱۰:۰۰', booked: true, specialistId: 'spec-1' },
          { time: '۱۱:۳۰', booked: false, specialistId: 'spec-1' },
          { time: '۱۴:۰۰', booked: false, specialistId: 'spec-2' },
          { time: '۱۶:۰۰', booked: true, specialistId: 'spec-2' },
          { time: '۱۷:۳۰', booked: false, specialistId: 'spec-1' },
          { time: '۱۹:۰۰', booked: false, specialistId: 'spec-2' },
        ],
      },
      {
        date: 'یکشنبه ۶ آبان',
        dayName: 'یکشنبه',
        dayNumber: '۰۶',
        slots: [
          { time: '۱۰:۳۰', booked: false, specialistId: 'spec-1' },
          { time: '۱۲:۰۰', booked: false, specialistId: 'spec-2' },
          { time: '۱۴:۳۰', booked: true, specialistId: 'spec-1' },
          { time: '۱۶:۳۰', booked: false, specialistId: 'spec-2' },
          { time: '۱۸:۰۰', booked: false, specialistId: 'spec-1' },
        ],
      },
      {
        date: 'دوشنبه ۷ آبان',
        dayName: 'دوشنبه',
        dayNumber: '۰۷',
        slots: [
          { time: '۱۱:۰۰', booked: false, specialistId: 'spec-1' },
          { time: '۱۳:۰۰', booked: true, specialistId: 'spec-2' },
          { time: '۱۵:۳۰', booked: false, specialistId: 'spec-1' },
          { time: '۱۷:۳۰', booked: false, specialistId: 'spec-2' },
        ],
      },
    ],
  },
  {
    id: 'salon-2',
    tenantId: 'tnt-tehran-zaferanieh-02',
    name: 'کلینیک و مرکز تخصصی پوست و لیزر صبا',
    enName: 'Saba Aesthetic Skin Studio',
    province: 'تهران',
    city: 'تهران',
    district: 'زعفرانیه',
    address: 'خیابان مقدس اردبیلی، مجتمع تجاری پالادیوم، برج جنوبی، طبقه ۵',
    latitude: 35.8012,
    longitude: 51.4178,
    phone: '۰۲۱-۲۲۱۱۸۸۹۹',
    instagram: '@saba.derma.tehran',
    rating: 4.88,
    reviewsCount: 295,
    isApproved: true,
    isMobileServiceActive: false,
    workingHours: 'شنبه تا پنجشنبه ۱۰:۰۰ الی ۲۰:۰۰',
    coverImage: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=80',
    ],
    services: [
      {
        id: 'serv-201',
        serviceLineId: 'skincare',
        name: 'میکرونیدلینگ و مزوتراپی جوانسازی با کوکتل طلا',
        durationMinutes: 60,
        price: 2900000,
        description: 'تحریک کلاژن‌سازی فیبروبلاست‌ها، رفع جای جوش و اسکار با دستگاه نیدلینگ پزشکی',
        isMobileAvailable: false,
      },
      {
        id: 'serv-202',
        serviceLineId: 'skincare',
        name: 'کربوکسی‌تراپی تیرگی دور چشم و لیفتینگ',
        durationMinutes: 45,
        price: 1650000,
        description: 'تزریق گاز دی‌اکسید کربن پزشکی برای تحریک گردش خون و رفع تیرگی گودی زیر چشم',
        isMobileAvailable: false,
      },
      {
        id: 'serv-203',
        serviceLineId: 'makeup',
        name: 'میکاپ لایت اروپایی و گریم VIP با برندهای ارگانیک',
        durationMinutes: 75,
        price: 2400000,
        description: 'کانتورینگ متناسب با ساختار چهره، فیکس ۲۴ ساعته ضدتعریق و مژه دانه‌ای طبیعی',
        isMobileAvailable: false,
      },
    ],
    specialists: [
      {
        id: 'spec-3',
        salonId: 'salon-2',
        name: 'دکتر نگین افشار',
        role: 'پزشک پوست و زیبایی (عضو انجمن درماتولوژی)',
        avatar: 'https://images.unsplash.com/photo-1594824813501-489e217d8481?auto=format&fit=crop&w=400&q=80',
        verified: true,
        rating: 4.97,
        reviewsCount: 168,
        experienceYears: 16,
        specialtyLine: 'skincare',
        isMobileSpecialist: false,
        bio: 'بیش از ۱۵ سال تجربه در حوزه جوان‌سازی بالینی و اصلاح مشکلات ساختاری پوست و لک‌های مقاوم',
        portfolio: [
          {
            id: 'port-4',
            title: 'درمان اسکار و جوانسازی گردن و دست‌ها',
            imageUrl: 'https://images.unsplash.com/photo-1512290900672-1f486a42a033?auto=format&fit=crop&w=600&q=80',
            category: 'مزوتراپی',
            likesCount: 95,
          },
        ],
      },
    ],
    availableSlots: [
      {
        date: 'شنبه ۵ آبان',
        dayName: 'شنبه',
        dayNumber: '۰۵',
        slots: [
          { time: '۱۱:۰۰', booked: false, specialistId: 'spec-3' },
          { time: '۱۳:۳۰', booked: false, specialistId: 'spec-3' },
          { time: '۱۶:۰۰', booked: true, specialistId: 'spec-3' },
          { time: '۱۸:۰۰', booked: false, specialistId: 'spec-3' },
        ],
      },
      {
        date: 'یکشنبه ۶ آبان',
        dayName: 'یکشنبه',
        dayNumber: '۰۶',
        slots: [
          { time: '۱۰:۰۰', booked: true, specialistId: 'spec-3' },
          { time: '۱۲:۳۰', booked: false, specialistId: 'spec-3' },
          { time: '۱۵:۰۰', booked: false, specialistId: 'spec-3' },
        ],
      },
    ],
  },
  {
    id: 'salon-3',
    tenantId: 'tnt-shiraz-ghasrodasht-03',
    name: 'عمارت و اسپا پرشیا پالاس',
    enName: 'Persia Palace Hammam & Spa',
    province: 'فارس',
    city: 'شیراز',
    district: 'قصرالدشت',
    address: 'قصرالدشت، خیابان وکلا، کوچه گلستان، باغ اختصاصی پرشیا',
    latitude: 29.6293,
    longitude: 52.4938,
    phone: '۰۷۱-۳۶۲۲۴۴۰۰',
    instagram: '@persiapalace.shiraz',
    rating: 4.98,
    reviewsCount: 220,
    isApproved: true,
    isMobileServiceActive: true,
    workingHours: 'همه روزه ۱۰:۰۰ الی ۲۲:۰۰',
    coverImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80',
    ],
    services: [
      {
        id: 'serv-301',
        serviceLineId: 'massage_spa',
        name: 'آیین حمام شاهانه ایرانی با اسکراب سفیدآب و کف گلاب',
        durationMinutes: 90,
        price: 2800000,
        description: 'حمام بخار معطر، کیسه‌کشی ملایم سنتی با صابون مراغه، لیف کف گل سرخ قمصر و ماساژ سر',
        isMobileAvailable: false,
      },
      {
        id: 'serv-302',
        serviceLineId: 'massage_spa',
        name: 'ماساژ ریلکسی با روغن گرم بهارنارنج و سنگ داغ',
        durationMinutes: 75,
        price: 2300000,
        description: 'ماساژ عضلانی کل بدن با سنگ‌های آتشفشانی داغ و روغن خالص بهارنارنج باغات شیراز',
        isMobileAvailable: true,
      },
      {
        id: 'serv-303',
        serviceLineId: 'hair',
        name: 'کوپ ژورنالی و براشینگ مجلسی با دیفیوزر',
        durationMinutes: 60,
        price: 850000,
        description: 'کوتاهی لایه‌ای متناسب با فرم گردن و صورت، پیتاژ دقیق و استایل نهایی با سرم ضدوز',
        isMobileAvailable: true,
      },
    ],
    specialists: [
      {
        id: 'spec-4',
        salonId: 'salon-3',
        name: 'ستاره کیانی',
        role: 'مستر آروماتراپیست و ماساژور ارشد سنتی',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        verified: true,
        rating: 4.98,
        reviewsCount: 135,
        experienceYears: 11,
        specialtyLine: 'massage_spa',
        isMobileSpecialist: true,
        bio: 'متخصص آیین‌های آرامش‌بخش حمام سنتی و استفاده از اسانس‌های اسنشیال روغنی دردهای عضلانی',
        portfolio: [
          {
            id: 'port-5',
            title: 'فضای اسپا و تراپی سنگ داغ اختصاصی',
            imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
            category: 'اسپا و ماساژ',
            likesCount: 180,
          },
        ],
      },
    ],
    availableSlots: [
      {
        date: 'شنبه ۵ آبان',
        dayName: 'شنبه',
        dayNumber: '۰۵',
        slots: [
          { time: '۱۴:۰۰', booked: false, specialistId: 'spec-4' },
          { time: '۱۶:۳۰', booked: false, specialistId: 'spec-4' },
          { time: '۱۹:۰۰', booked: true, specialistId: 'spec-4' },
        ],
      },
    ],
  },
];

// Initial mock bookings
export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bkg-101',
    trackingCode: 'BY-883921',
    tenantId: 'tnt-tehran-elahiyeh-01',
    salonName: 'سالن زیبایی و عمارت گل سرخ',
    salonAddress: 'تهران، الهیه، خیابان فرشته، بن‌بست نیلوفر، پلاک ۱۲',
    serviceId: 'serv-102',
    serviceName: 'هیدرافیشیال کلینیکال و اکسیژن‌تراپی طلا',
    serviceLineId: 'skincare',
    specialistId: 'spec-1',
    specialistName: 'مریم شمس‌آرا',
    date: 'یکشنبه ۶ آبان',
    time: '۱۴:۳۰',
    durationMinutes: 90,
    price: 2600000,
    customerName: 'شادی بهرامی',
    customerPhone: '۰۹۱۲۳۴۵۶۷۸۹',
    notes: 'پوست حساس به اسید سالیسیلیک - فشار بخار ملایم',
    isMobileBooking: false,
    status: 'confirmed',
    createdAt: '۱۴۰۳/۰۸/۰۲',
  },
];

// Initial mock support tickets (مطابق با ماژول SupportTickets در backend)
export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'tkt-401',
    title: 'تغییر زمان نوبت هیدرافیشیال روز یکشنبه',
    category: 'booking',
    status: 'resolved',
    lastReply: 'نوبت شما با موفقیت به ساعت ۱۴:۳۰ منتقل گردید.',
    createdAt: '۲ روز پیش',
    messages: [
      {
        sender: 'user',
        text: 'سلام، امکان دارد ساعت نوبت یکشنبه من را از ساعت ۱۱ به ۱۴:۳۰ تغییر دهید؟',
        time: '۱۰:۳۰',
      },
      {
        sender: 'support',
        text: 'سلام سرکار خانم بهرامی. با سالن گل سرخ هماهنگ شد و اسلات ۱۴:۳۰ با خانم شمس‌آرا برای شما ثبت گردید.',
        time: '۱۱:۰۵',
      },
    ],
  },
  {
    id: 'tkt-402',
    title: 'سوال درباره خدمات در محل برای ۵ نفر (پکیج ساقدوش)',
    category: 'specialist',
    status: 'in_progress',
    lastReply: 'در حال بررسی رزرو تیم استایلیست سیار برای تاریخ پنجشنبه هستیم.',
    createdAt: 'امروز',
    messages: [
      {
        sender: 'user',
        text: 'برای مراسم نامزدی آیا متخصصین رنگ و میکاپ به منزل ما در نیاوران اعزام می‌شوند؟',
        time: '۰۹:۱۵',
      },
      {
        sender: 'support',
        text: 'بله، لاین Mobile Service بویا با کادر مجهز در منزل شما حاضر خواهد شد. جزییات پکیج در دست ارسال است.',
        time: '۰۹:۴۰',
      },
    ],
  },
];
