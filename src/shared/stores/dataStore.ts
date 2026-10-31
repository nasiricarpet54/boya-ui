import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  INITIAL_SALONS,
  INITIAL_USERS,
  INITIAL_BOOKINGS,
  INITIAL_TICKETS,
  INITIAL_AUDIT_LOGS,
} from '../data/marketplaceData';
import api from '../api/apiClient';

export interface PlatformNotification {
  id: string;
  title: string;
  content: string;
  type: 'promotional' | 'informational' | 'alert' | 'discount';
  targetAudience: 'customer' | 'salon' | 'all';
  channel: 'in_app' | 'sms' | 'push' | 'both';
  actionUrl?: string;
  actionText?: string;
  badgeText?: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  viewsCount: number;
  clicksCount: number;
  smsSentCount?: number;
}

export interface AdminProfileData {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  emergencyPhone?: string;
  positionTitle: string;
  adminCode: string;
  avatarUrl: string;
  bio: string;
  province: string;
  city: string;
  securityAlertSms: boolean;
  newSalonsNotifySms: boolean;
  weeklyReportsEmail: boolean;
  twoFactorEnabled: boolean;
}

export interface DataState {
  latestBookingAlert: any | null;
  salons: any[];
  bookings: any[];
  users: any[];
  tickets: any[];
  auditLogs: any[];
  notifications: PlatformNotification[];
  adminProfile: AdminProfileData;
  setLatestBookingAlert: (alert: any) => void;
  clearLatestBookingAlert: () => void;
  setSalons: (salons: any[]) => void;
  addSalon: (salon: any) => void;
  updateSalon: (id: string | number, patch: any) => void;
  deleteSalon: (id: string | number) => void;
  setUsers: (users: any[]) => void;
  addUser: (user: any) => void;
  updateUser: (id: string | number, patch: any) => void;
  deleteUser: (id: string | number) => void;
  setTickets: (tickets: any[]) => void;
  updateBookingStatus: (id: string | number, status: string) => void;
  addNotification: (n: PlatformNotification) => void;
  updateNotification: (id: string, patch: Partial<PlatformNotification>) => void;
  toggleNotification: (id: string) => void;
  deleteNotification: (id: string) => void;
  updateAdminProfile: (patch: Partial<AdminProfileData>) => void;
}

const DEFAULT_NOTIFICATIONS: PlatformNotification[] = [
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

const DEFAULT_ADMIN_PROFILE: AdminProfileData = {
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

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      latestBookingAlert: null,
      salons: INITIAL_SALONS,
      bookings: INITIAL_BOOKINGS,
      users: INITIAL_USERS,
      tickets: INITIAL_TICKETS,
      auditLogs: INITIAL_AUDIT_LOGS,
      notifications: DEFAULT_NOTIFICATIONS,
      adminProfile: DEFAULT_ADMIN_PROFILE,
      setLatestBookingAlert: (latestBookingAlert) => set({ latestBookingAlert }),
      clearLatestBookingAlert: () => set({ latestBookingAlert: null }),
      setSalons: (salons) => set({ salons }),
      addSalon: (salon) => {
        set((state) => ({ salons: [salon, ...state.salons] }));
        api.post('/salons', salon).catch(() => {});
      },
      updateSalon: (id, patch) => {
        set((state) => ({
          salons: state.salons.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }));
        api.patch(`/salons/${id}`, patch).catch(() => {});
      },
      deleteSalon: (id) => {
        set((state) => ({
          salons: state.salons.filter((s) => s.id !== id),
        }));
        api.delete(`/salons/${id}`).catch(() => {});
      },
      setUsers: (users) => set({ users }),
      addUser: (user) => {
        set((state) => ({ users: [user, ...state.users] }));
        api.post('/users', user).catch(() => {});
      },
      updateUser: (id, patch) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        }));
        api.patch(`/users/${id}`, patch).catch(() => {});
      },
      deleteUser: (id) => {
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
        }));
        api.delete(`/users/${id}`).catch(() => {});
      },
      setTickets: (tickets) => set({ tickets }),
      updateBookingStatus: (id, status) => {
        set((state) => ({
          bookings: state.bookings.map((b) => (b.id === id ? { ...b, status } : b)),
        }));
        api.patch(`/bookings/${id}/status`, { status }).catch(() => {});
      },
      addNotification: (n) => {
        set((state) => ({
          notifications: [n, ...state.notifications],
        }));
        api.post('/notifications', n).catch(() => {});
      },
      updateNotification: (id, patch) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        }));
        api.patch(`/notifications/${id}`, patch).catch(() => {});
      },
      toggleNotification: (id) => {
        set((state) => {
          const updated = state.notifications.map((n) => (n.id === id ? { ...n, isActive: !n.isActive } : n));
          const item = updated.find((n) => n.id === id);
          if (item) api.patch(`/notifications/${id}`, { isActive: item.isActive }).catch(() => {});
          return { notifications: updated };
        });
      },
      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
        api.delete(`/notifications/${id}`).catch(() => {});
      },
      updateAdminProfile: (patch) => {
        set((state) => ({
          adminProfile: { ...state.adminProfile, ...patch },
        }));
        api.patch('/admin/profile', patch).catch(() => {});
      },
    }),
    {
      name: 'boya-admin-data-storage-v2',
      partialize: (state) => ({
        salons: state.salons,
        users: state.users,
        bookings: state.bookings,
        tickets: state.tickets,
        auditLogs: state.auditLogs,
        notifications: state.notifications,
        adminProfile: state.adminProfile,
      }),
    }
  )
);
