import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE_PATH = path.resolve(__dirname, '../../server-data/platform_store.json');

/**
 * SECURITY NOTE: This store is now strictly for UI metadata and non-critical read-only/cache data.
 * All primary entities (Users, Salons, Bookings, Services, Specialists) are stored and managed
 * exclusively in the PostgreSQL database to ensure data integrity and prevent divergence.
 */
interface PlatformServerData {
  notifications: any[];
  adminProfile: any;
}

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'جشنواره تخفیف پاییزی سالن‌های VIP بویا',
    content: 'تا ۲۰٪ تخفیف ویژه رزرو لاین‌های رنگ و کوتاهی مو در منتخب‌ترین سالن‌های تهران، شیراز و اصفهان. فرصت محدود تا پایان آبان!',
    type: 'promotional',
    targetAudience: 'customer',
    channel: 'in_app',
    badgeText: 'تخفیف ویژه',
    actionUrl: '/salons',
    actionText: 'مشاهده سالن‌های تخفیف‌دار',
    isActive: true,
    createdAt: '۱۴۰۳/۰۸/۱۰',
    expiresAt: '۱۴۰۳/۰۸/۳۰',
    viewsCount: 1420,
    clicksCount: 388,
    smsSentCount: 0,
  },
  {
    id: 'notif-2',
    title: 'بروزرسانی مهم: قابلیت جدید مسدودسازی سانس‌ها برای بیوتیشن‌ها',
    content: 'مدیران گرامی سالن‌ها و متخصصین محترم، اکنون می‌توانید سانس‌های استراحت یا نوبت‌های تلفنی خود را مستقیماً در تقویم مسدود کنید تا تداخل نوبت ایجاد نشود.',
    type: 'informational',
    targetAudience: 'salon',
    channel: 'in_app',
    badgeText: 'قابلیت جدید',
    actionUrl: '/salon-admin',
    actionText: 'بررسی پنل زمان‌بندی',
    isActive: true,
    createdAt: '۱۴۰۳/۰۸/۰۸',
    expiresAt: '۱۴۰۳/۰۹/۱۵',
    viewsCount: 245,
    clicksCount: 112,
    smsSentCount: 58,
  },
];

const DEFAULT_ADMIN_PROFILE = {
  id: 1,
  fullName: 'مهندس حسینی',
  phone: '09123456789',
  email: 'admin@boya.ir',
  emergencyPhone: '09351234567',
  positionTitle: 'مدیر ارشد پلتفرم و ناظر عالی کل بویا',
  adminCode: 'SA-1001',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  bio: 'مدیر توسعه محصول، نظارت بر استانداردهای احراز هویت سالن‌ها، امنیت پایگاه‌داده و مدیریت زنجیره خدمات زیبایی پلتفرم بویا در ۳۱ استان کشور.',
  province: 'تهران',
  city: 'تهران',
  securityAlertSms: true,
  newSalonsNotifySms: true,
  weeklyReportsEmail: true,
  twoFactorEnabled: true,
};

export function loadServerData(): PlatformServerData {
  try {
    const dirPath = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        notifications: parsed.notifications || DEFAULT_NOTIFICATIONS,
        adminProfile: parsed.adminProfile || DEFAULT_ADMIN_PROFILE,
      };
    }
  } catch (err) {
    console.error('[SERVER DB LOAD ERROR]', err);
  }

  // Fallback defaults
  const initialData: PlatformServerData = {
    notifications: DEFAULT_NOTIFICATIONS,
    adminProfile: DEFAULT_ADMIN_PROFILE,
  };

  saveServerData(initialData);
  return initialData;
}

export function saveServerData(data: PlatformServerData): void {
  try {
    const dirPath = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SERVER DB SAVE ERROR]', err);
  }
}
