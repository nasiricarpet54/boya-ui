/**
 * BOYA Comprehensive Beauty Platform Data Models & State
 * Reflecting the NestJS Backend, Flutter Mobile Apps (Customer & Salon),
 * and Next.js 14 Web Admin Panel.
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
  isMobileAvailable?: boolean;
  imageUrl?: string;
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
  isMobileSpecialist: boolean;
  phone: string;
  portfolio: SpecialistPortfolio[];
}

export interface Salon {
  id: string;
  tenantId: string; // Multi-tenant RLS tenant_id
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
  isMobileServiceActive: boolean;
  workingHours: string;
  ownerName: string;
  ownerPhone: string;
  createdAt: string;
  status: 'active' | 'pending' | 'suspended';
  // VIP & Search Ranking Management
  isVip?: boolean;
  displayPriority?: number; // 1, 2, 3... (lower number = higher placement in search)
  vipBadgeLabel?: string; // e.g. "سالن برگزیده VIP", "همکار طلایی بویا"
  vipExpiryDate?: string;
  services: SalonService[];
  specialists: Specialist[];
  availableSlots: {
    date: string;
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
  trackingCode: string;
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
  isMobileBooking: boolean;
  customerAddress?: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending';
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  title: string;
  userName: string;
  userPhone: string;
  userRole: 'customer' | 'salon_owner' | 'specialist';
  category: 'booking' | 'salon' | 'specialist' | 'account' | 'payment';
  status: 'open' | 'in_progress' | 'resolved';
  lastReply: string;
  createdAt: string;
  messages: {
    sender: 'user' | 'support' | 'admin';
    senderName: string;
    text: string;
    time: string;
  }[];
}

export interface PlatformUser {
  id: string;
  name: string;
  phone: string;
  role: 'super_admin' | 'salon_owner' | 'specialist' | 'customer';
  tenantId?: string;
  tenantName?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  avatar?: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  level: 'info' | 'warning' | 'security';
}

export interface ScheduleBlockItem {
  id: string;
  salonId: string;
  date: string;
  timeRange: string;
  reason: string;
}

// ------------------- INITIAL DATA -------------------

export const SERVICE_LINES: ServiceLine[] = [
  {
    id: 'all',
    name: 'همه خدمات',
    enName: 'All Services',
    emoji: '✨',
    description: 'تمامی لاین‌های خدمات زیبایی فعال در پلتفرم بویا',
    color: '#173B3F',
  },
  {
    id: 'hair',
    name: 'مو و استایل',
    enName: 'Hair & Styling',
    emoji: '💇‍♀️',
    description: 'کوتاهی، رنگ و بالیاژ، کراتین و احیا، شینیون ژورنالی',
    color: '#173B3F',
  },
  {
    id: 'nail',
    name: 'ناخن و اسپا دست',
    enName: 'Nails & Spa',
    emoji: '💅',
    description: 'کاشت ژل و پودر، لمینت ناخن، مانیکور روسی و پدیکور VIP',
    color: '#D9A2B0',
  },
  {
    id: 'eyelash_eyebrow',
    name: 'مژه و ابرو',
    enName: 'Lashes & Brows',
    emoji: '👁️',
    description: 'اکستنشن مژه اسپایکی، فیبروز و میکروبلیدینگ، لیفت و لمینت',
    color: '#173B3F',
  },
  {
    id: 'skincare',
    name: 'پوست و فیشیال',
    enName: 'Skincare & Facial',
    emoji: '🫧',
    description: 'پاکسازی عمقی، هیدرافیشیال، پیلینگ، مزوتراپی و جوانسازی',
    color: '#6F9A8D',
  },
  {
    id: 'makeup',
    name: 'میکاپ و چهره',
    enName: 'Makeup & Bridal',
    emoji: '💄',
    description: 'میکاپ تخصصی عروس، گریم سینمایی و کانتورینگ متناسب چهره',
    color: '#D9A2B0',
  },
  {
    id: 'massage_spa',
    name: 'اسپا و ماساژ',
    enName: 'Spa & Wellness',
    emoji: '🕯️',
    description: 'ماساژ ریلکسی، سنگ داغ، آروماتراپی و حمام سنتی ایرانی',
    color: '#5E8B95',
  },
  {
    id: 'mobile_service',
    name: 'خدمات در محل',
    enName: 'At-Home Services',
    emoji: '🚗',
    description: 'اعزام متخصص مجهز با تجهیزات بهداشتی به آدرس مشتری',
    color: '#C99558',
  },
];

export const INITIAL_SALONS: Salon[] = [
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
    ownerName: 'خانم گلناز فرهمند',
    ownerPhone: '۰۹۱۲۱۱۱۴۴۵۵',
    createdAt: '۱۴۰۳/۰۴/۱۵',
    status: 'active',
    isVip: true,
    displayPriority: 1,
    vipBadgeLabel: 'سالن برگزیده VIP',
    vipExpiryDate: '۱۴۰۳/۱۲/۲۹',
    coverImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=80', // سالن اصلی و استایلینگ
      'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1000&q=80', // ایستگاه‌های رنگ و مو
      'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=80', // اتاق اختصاصی فیشیال VIP
      'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=1000&q=80', // بار تخصصی مانیکور و پدیکور
      'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=1000&q=80', // لانژ انتظار و پذیرایی مهمانان
    ],
    services: [
      {
        id: 'serv-101',
        serviceLineId: 'hair',
        name: 'کراتین و احیای پروتئینه نانو ابریشمی',
        durationMinutes: 120,
        price: 3800000,
        description: 'صافی و احیای ۱۰۰٪ بدون فرمالدئید با روغن کندر و خاویار، مناسب موهای آسیب‌دیده',
        isMobileAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'serv-102',
        serviceLineId: 'skincare',
        name: 'هیدرافیشیال کلینیکال و اکسیژن‌تراپی طلا',
        durationMinutes: 90,
        price: 2600000,
        description: 'پاکسازی چندمرحله‌ای، تخلیه کمدون با اولتراسونیک، تزریق سرم زعفران و ماسک طلا',
        isMobileAvailable: false,
        imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'serv-103',
        serviceLineId: 'nail',
        name: 'کاشت ناخن با پودر روسی و ژلیش کهکشانی',
        durationMinutes: 90,
        price: 1100000,
        description: 'فرم‌دهی طبیعی، مانیکور دقیق روسی با سرسوهان الماسه و لاک‌ژل شاین با ماندگاری بالا',
        isMobileAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'serv-104',
        serviceLineId: 'eyelash_eyebrow',
        name: 'اکستنشن مژه اسپایکی و مگاوالیوم ابریشمی',
        durationMinutes: 105,
        price: 1450000,
        description: 'تارهای فوق سبک بدون احساس سنگینی، چسب گیاهی ضدحساسیت و لیفت ملایم گوشه چشم',
        isMobileAvailable: false,
        imageUrl: 'https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=600&q=80',
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
        phone: '۰۹۱۲۳۴۵۱۱۲۰',
        bio: 'دارای مدرک بین‌المللی بیوتی تراپیست از آکادمی ژنو و مدرس فیشیال‌های جوانساز با متدهای روز اروپا',
        portfolio: [
          {
            id: 'port-1',
            title: 'درمان لک و شفاف‌سازی پوست با عصاره زعفران',
            imageUrl: 'https://images.unsplash.com/photo-1512290900672-1f486a42a033?auto=format&fit=crop&w=600&q=80',
            category: 'فیشیال',
            likesCount: 148,
          },
          {
            id: 'port-2',
            title: 'هیدرودرمی و بستن منافذ باز چهره',
            imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80',
            category: 'اسکین‌کر',
            likesCount: 194,
          },
          {
            id: 'port-1-3',
            title: 'پیلینگ کربن هالیوودی و روشن‌کنندگی عمقی',
            imageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=600&q=80',
            category: 'پاکسازی کلینیکال',
            likesCount: 165,
          },
          {
            id: 'port-1-4',
            title: 'ماسک ورقه‌ای طلا ۲۴ عیار و لیفتینگ گردن',
            imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
            category: 'جوانسازی',
            likesCount: 220,
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
        phone: '۰۹۱۲۴۵۶۷۷۸۸',
        bio: 'متخصص ژورنال‌خوانی و تکنیک‌های آمبره روسی، بالیاژ خطی و بوتاکس مو با تضمین سلامت ساقه',
        portfolio: [
          {
            id: 'port-3',
            title: 'بالیاژ شنی کاراملی با احیای بوتاکس مو',
            imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
            category: 'رنگ و لایت',
            likesCount: 285,
          },
          {
            id: 'port-2-2',
            title: 'کراتین احیاکننده نانو ابریشمی موهای دکلره',
            imageUrl: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80',
            category: 'احیا و تراپی',
            likesCount: 215,
          },
          {
            id: 'port-2-3',
            title: 'شینیون اروپایی عروس با بافت هلندی',
            imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&q=80',
            category: 'شینیون و استایل',
            likesCount: 310,
          },
        ],
      },
      {
        id: 'spec-nail-1',
        salonId: 'salon-1',
        name: 'سارا محمدی',
        role: 'مستر آرتیست ناخن و طراحی دیزاین ژورنالی',
        avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80',
        verified: true,
        rating: 4.95,
        reviewsCount: 188,
        experienceYears: 8,
        specialtyLine: 'nail',
        isMobileSpecialist: true,
        phone: '۰۹۱۲۷۷۷۸۸۹۹',
        bio: 'دارای سرتیفیکیت مانیکور روسی از مسکو، متخصص کاشت فیگور، ژلیش مغناطیسی و دیزاین مینیمال',
        portfolio: [
          {
            id: 'port-n-1',
            title: 'کاشت بیبی بومر با ژلیش کهکشانی',
            imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80',
            category: 'کاشت ژل',
            likesCount: 312,
          },
          {
            id: 'port-n-2',
            title: 'مانیکور کمبی روسی و لمینت استحکام ناخن',
            imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80',
            category: 'مانیکور روسی',
            likesCount: 224,
          },
          {
            id: 'port-n-3',
            title: 'فرنچ کلاسیک گلد با پدیکور VIP اسپا',
            imageUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=600&q=80',
            category: 'پدیکور و اسپا',
            likesCount: 189,
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
          { time: '۱۹:۰۰', booked: false, specialistId: 'spec-nail-1' },
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
          { time: '۱۶:۳۰', booked: false, specialistId: 'spec-nail-1' },
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
          { time: '۱۵:۳۰', booked: false, specialistId: 'spec-nail-1' },
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
    ownerName: 'دکتر صبا معتمدی',
    ownerPhone: '۰۹۱۲۲۲۳۳۴۴۵',
    createdAt: '۱۴۰۳/۰۵/۱۰',
    status: 'active',
    isVip: false,
    displayPriority: 10,
    coverImage: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=80', // کلینیک و اتاق استریل پوست
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80', // اتاق لیزر و دستگاه‌های هایفو
      'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80', // فضای پذیرش و مشاوره تخصصی
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
        imageUrl: 'https://images.unsplash.com/photo-1512290900672-1f486a42a033?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'serv-202',
        serviceLineId: 'skincare',
        name: 'کربوکسی‌تراپی تیرگی دور چشم و لیفتینگ',
        durationMinutes: 45,
        price: 1650000,
        description: 'تزریق گاز دی‌اکسید کربن پزشکی برای تحریک گردش خون و رفع تیرگی گودی زیر چشم',
        isMobileAvailable: false,
        imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80',
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
        phone: '۰۹۱۲۹۹۸۸۷۷۶',
        bio: 'بیش از ۱۵ سال تجربه در جوان‌سازی بالینی، تزریق مزوژل‌های ساختاری و اصلاح لک‌های مقاوم پوستی',
        portfolio: [
          {
            id: 'port-4',
            title: 'درمان اسکار و جوانسازی گردن و دست‌ها',
            imageUrl: 'https://images.unsplash.com/photo-1512290900672-1f486a42a033?auto=format&fit=crop&w=600&q=80',
            category: 'مزوتراپی',
            likesCount: 135,
          },
          {
            id: 'port-4-2',
            title: 'لیفتینگ غیرجراحی صورت با آر‌اف فرکشنال',
            imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80',
            category: 'لیفت کلینیکال',
            likesCount: 178,
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
    ownerName: 'آقای بهزاد شایان',
    ownerPhone: '۰۹۱۷۱۱۱۲۲۳۳',
    createdAt: '۱۴۰۳/۰۶/۰۱',
    status: 'active',
    isVip: true,
    displayPriority: 2,
    vipBadgeLabel: 'همکار طلایی بویا',
    vipExpiryDate: '۱۴۰۴/۰۱/۱۵',
    coverImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80', // تالار ماساژ و حمام سنتی
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=80', // حوضچه اسپا و تخت‌های سنگ داغ
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1000&q=80', // فضای ریلکسیشن و چای سنتی
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
        imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'serv-302',
        serviceLineId: 'massage_spa',
        name: 'ماساژ ریلکسی با روغن گرم بهارنارنج و سنگ داغ',
        durationMinutes: 75,
        price: 2300000,
        description: 'ماساژ عضلانی کل بدن با سنگ‌های آتشفشانی داغ و روغن خالص بهارنارنج شیراز',
        isMobileAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80',
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
        phone: '۰۹۱۷۸۸۸۵۵۴۴',
        bio: 'متخصص آیین‌های آرامش‌بخش حمام سنتی و استفاده از اسانس‌های اسنشیال روغنی دردهای عضلانی',
        portfolio: [
          {
            id: 'port-5',
            title: 'فضای اسپا و تراپی سنگ داغ اختصاصی',
            imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
            category: 'اسپا و ماساژ',
            likesCount: 230,
          },
          {
            id: 'port-5-2',
            title: 'ماساژ آروماتراپی با اسانس طبیعی بهارنارنج',
            imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80',
            category: 'آروماتراپی',
            likesCount: 195,
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
  {
    id: 'salon-4',
    tenantId: 'tnt-isfahan-mardavij-04',
    name: 'عمارت و استودیو زیبایی پرنسس اصفهان',
    enName: 'Princess Luxury Studio Isfahan',
    province: 'اصفهان',
    city: 'اصفهان',
    district: 'مرداویج',
    address: 'خیابان مرداویج، ملاصدرا، پلاک ۲۴',
    latitude: 32.6184,
    longitude: 51.6687,
    phone: '۰۳۱-۳۶۶۶۷۷۸۸',
    instagram: '@princess.isfahan.beautyluxe',
    rating: 4.89,
    reviewsCount: 112,
    isApproved: false, // In Approvals Queue!
    isMobileServiceActive: true,
    workingHours: 'همه روزه ۱۰:۰۰ الی ۲۰:۰۰',
    ownerName: 'مهتاب صفوی',
    ownerPhone: '۰۹۱۳۴۴۴۵۵۶۶',
    createdAt: '۱۴۰۳/۰۷/۲۸',
    status: 'pending',
    isVip: false,
    displayPriority: 20,
    coverImage: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1000&q=80', // عمارت عروس و اتاق میکاپ
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=80', // لاین شینیون و استایل
    ],
    services: [
      {
        id: 'serv-401',
        serviceLineId: 'hair',
        name: 'شینیون و استایلینگ عروس کلاسیک و اروپایی',
        durationMinutes: 90,
        price: 2200000,
        description: 'شینیون‌های خطی ماندگار با متریال ضد رطوبت و نصب تور و تاج اختصاصی',
        isMobileAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&q=80',
      },
    ],
    specialists: [
      {
        id: 'spec-5',
        salonId: 'salon-4',
        name: 'مهسا نوریان',
        role: 'استایلیست ارشد شینیون و بافت ژورنالی',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        verified: false,
        rating: 4.85,
        reviewsCount: 48,
        experienceYears: 8,
        specialtyLine: 'hair',
        isMobileSpecialist: true,
        phone: '۰۹۱۳۷۷۷۸۸۹۹',
        bio: 'مدرس تخصصی شینیون و استایل مو در آکادمی‌های معتبر اصفهان، برنده مسابقات استایلینگ ۱۳۹۹',
        portfolio: [
          {
            id: 'port-501',
            title: 'شینیون مدرن با تکنیک اس براش',
            imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&q=80',
            category: 'شینیون عروس',
            likesCount: 160,
          },
          {
            id: 'port-502',
            title: 'بافت مکزیکی و بافت فرانسوی با موی اضافه',
            imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
            category: 'بافت تخصصی',
            likesCount: 112,
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
          { time: '۱۰:۰۰', booked: false, specialistId: 'spec-5' },
          { time: '۱۳:۰۰', booked: false, specialistId: 'spec-5' },
        ],
      },
    ],
  },
];

export const SALONS = INITIAL_SALONS;

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
  {
    id: 'bkg-102',
    trackingCode: 'BY-552190',
    tenantId: 'tnt-tehran-elahiyeh-01',
    salonName: 'سالن زیبایی و عمارت گل سرخ',
    salonAddress: 'تهران، الهیه، خیابان فرشته، بن‌بست نیلوفر، پلاک ۱۲',
    serviceId: 'serv-101',
    serviceName: 'کراتین و احیای پروتئینه نانو ابریشمی',
    serviceLineId: 'hair',
    specialistId: 'spec-2',
    specialistName: 'نازنین رادمنش',
    date: 'شنبه ۵ آبان',
    time: '۱۶:۰۰',
    durationMinutes: 120,
    price: 3800000,
    customerName: 'نگار رضوی',
    customerPhone: '۰۹۱۲۹۹۹۸۸۷۷',
    notes: 'موهای تا روی شانه، دکلره شده',
    isMobileBooking: true,
    customerAddress: 'تهران، زعفرانیه، خیابان آصف، برج آسمان',
    status: 'confirmed',
    createdAt: '۱۴۰۳/۰۸/۰۱',
  },
];

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'tkt-401',
    title: 'درخواست تغییر سانس نوبت فیشیال روز یکشنبه',
    userName: 'شادی بهرامی',
    userPhone: '۰۹۱۲۳۴۵۶۷۸۹',
    userRole: 'customer',
    category: 'booking',
    status: 'resolved',
    lastReply: 'نوبت شما با موفقیت به ساعت ۱۴:۳۰ منتقل گردید.',
    createdAt: '۲ روز پیش',
    messages: [
      {
        sender: 'user',
        senderName: 'شادی بهرامی',
        text: 'سلام، امکان دارد ساعت نوبت یکشنبه من را از ساعت ۱۱ به ۱۴:۳۰ تغییر دهید؟',
        time: '۱۰:۳۰',
      },
      {
        sender: 'support',
        senderName: 'پشتیبانی فنی بویا',
        text: 'سلام سرکار خانم بهرامی. با سالن گل سرخ هماهنگ شد و اسلات ۱۴:۳۰ با خانم شمس‌آرا برای شما ثبت گردید.',
        time: '۱۱:۰۵',
      },
    ],
  },
  {
    id: 'tkt-402',
    title: 'درخواست راهنمایی جهت فعال‌سازی درگاه زرین‌پال در فاز ۲',
    userName: 'گلناز فرهمند',
    userPhone: '۰۹۱۲۱۱۱۴۴۵۵',
    userRole: 'salon_owner',
    category: 'payment',
    status: 'in_progress',
    lastReply: 'مدارک پایانه پذیرندگی سالن شما در دست استعلام بانکی است.',
    createdAt: 'دیروز',
    messages: [
      {
        sender: 'user',
        senderName: 'سالندار: گل سرخ الهیه',
        text: 'با سلام، برای فعال‌سازی پرداخت آنلاین Zarinpal چه مدارک صنفی باید در پنل بارگذاری کنیم؟',
        time: '۱۴:۲۰',
      },
      {
        sender: 'admin',
        senderName: 'مدیر کل سامانه (Admin)',
        text: 'سلام و احترام. در فاز ۱ پلتفرم ویترین رایگان است. جهت آماده‌سازی فاز ۲، تصویر پروانه کسب معتبر سالن را در بخش مدارک بارگذاری فرمایید.',
        time: '۱۵:۰۰',
      },
    ],
  },
];

export const INITIAL_USERS: PlatformUser[] = [
  {
    id: 'usr-1',
    name: 'مهندس حسینی (مدیر کل بویا)',
    phone: '۰۹۱۲۰۰۰۱۱۰۰',
    role: 'super_admin',
    status: 'active',
    createdAt: '۱۴۰۲/۱۱/۰۱',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'usr-2',
    name: 'گلناز فرهمند',
    phone: '۰۹۱۲۱۱۱۴۴۵۵',
    role: 'salon_owner',
    tenantId: 'tnt-tehran-elahiyeh-01',
    tenantName: 'سالن زیبایی و عمارت گل سرخ',
    status: 'active',
    createdAt: '۱۴۰۳/۰۴/۱۵',
  },
  {
    id: 'usr-3',
    name: 'دکتر صبا معتمدی',
    phone: '۰۹۱۲۲۲۳۳۴۴۵',
    role: 'salon_owner',
    tenantId: 'tnt-tehran-zaferanieh-02',
    tenantName: 'کلینیک پوست و لیزر صبا',
    status: 'active',
    createdAt: '۱۴۰۳/۰۵/۱۰',
  },
  {
    id: 'usr-4',
    name: 'مریم شمس‌آرا',
    phone: '۰۹۱۲۳۴۵۱۱۲۰',
    role: 'specialist',
    tenantId: 'tnt-tehran-elahiyeh-01',
    tenantName: 'سالن زیبایی و عمارت گل سرخ',
    status: 'active',
    createdAt: '۱۴۰۳/۰۴/۲۰',
  },
  {
    id: 'usr-5',
    name: 'شادی بهرامی',
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    role: 'customer',
    status: 'active',
    createdAt: '۱۴۰۳/۰۶/۱۲',
  },
  {
    id: 'usr-6',
    name: 'مهتاب صفوی (متقاضی جدید سالن)',
    phone: '۰۹۱۳۴۴۴۵۵۶۶',
    role: 'salon_owner',
    tenantId: 'tnt-isfahan-mardavij-04',
    tenantName: 'عمارت پرنسس اصفهان',
    status: 'active',
    createdAt: '۱۴۰۳/۰۷/۲۸',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'log-101',
    action: 'BOOKING_CREATED_SMS_SENT',
    actorName: 'سیستم ملی‌پیامک (Melipayamak API)',
    actorRole: 'system',
    details: 'پیامک تایید نوبت با کد رهگیری BY-883921 با موفقیت به شماره ۰۹۱۲۳۴۵۶۷۸۹ تحویل شد.',
    ipAddress: '185.143.232.10',
    timestamp: '۱۰ دقیقه پیش',
    level: 'info',
  },
  {
    id: 'log-102',
    action: 'TENANT_ONBOARDING_SUBMITTED',
    actorName: 'مهتاب صفوی',
    actorRole: 'salon_owner',
    details: 'ثبت پرونده سالن جدید «عمارت پرنسس اصفهان» جهت بررسی و تایید مدارک در صف مدیریت.',
    ipAddress: '5.200.14.92',
    timestamp: '۴۵ دقیقه پیش',
    level: 'warning',
  },
  {
    id: 'log-103',
    action: 'RLS_SECURITY_AUDIT_VERIFIED',
    actorName: 'NestJS RLS Guard (ADR-001)',
    actorRole: 'security_definer',
    details: 'تطابق کامل GUC app.current_tenant_id روی جداول رزروها و متخصصین با کاربر beauty_app.',
    ipAddress: '127.0.0.1 (Docker Network)',
    timestamp: '۲ ساعت پیش',
    level: 'security',
  },
  {
    id: 'log-104',
    action: 'SPECIALIST_INVITE_TOKEN_GENERATED',
    actorName: 'گلناز فرهمند (مدیر سالن گل سرخ)',
    actorRole: 'salon_owner',
    details: 'تولید توکن دعوت متخصص جدید با الگوریتم SHA-256 و انقضای ۷ روزه (ADR-010).',
    ipAddress: '2.144.18.73',
    timestamp: '۴ ساعت پیش',
    level: 'info',
  },
];
