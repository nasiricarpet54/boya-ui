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
  isLoadingServerData: boolean;

  fetchServerData: () => Promise<void>;
  setLatestBookingAlert: (alert: any) => void;
  clearLatestBookingAlert: () => void;
  setSalons: (salons: any[]) => void;
  addSalon: (salon: any) => Promise<void>;
  updateSalon: (id: string | number, patch: any) => Promise<void>;
  deleteSalon: (id: string | number) => Promise<void>;
  setUsers: (users: any[]) => void;
  addUser: (user: any) => Promise<void>;
  updateUser: (id: string | number, patch: any) => Promise<void>;
  deleteUser: (id: string | number) => Promise<void>;
  setTickets: (tickets: any[]) => void;
  updateBookingStatus: (id: string | number, status: string) => Promise<void>;
  addNotification: (n: PlatformNotification) => Promise<void>;
  updateNotification: (id: string, patch: Partial<PlatformNotification>) => Promise<void>;
  toggleNotification: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  updateAdminProfile: (patch: Partial<AdminProfileData>) => Promise<void>;
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
      isLoadingServerData: false,

      fetchServerData: async () => {
        try {
          set({ isLoadingServerData: true });
          const [salonsRes, usersRes, notifsRes, adminRes, bookingsRes] = await Promise.all([
            api.get('/salons').catch(() => ({ data: null })),
            api.get('/users').catch(() => ({ data: null })),
            api.get('/notifications').catch(() => ({ data: null })),
            api.get('/admin/profile').catch(() => ({ data: null })),
            api.get('/bookings').catch(() => ({ data: null })),
          ]);

          set((state) => ({
            salons: salonsRes.data && Array.isArray(salonsRes.data) && salonsRes.data.length > 0 ? salonsRes.data : state.salons,
            users: usersRes.data && Array.isArray(usersRes.data) && usersRes.data.length > 0 ? usersRes.data : state.users,
            notifications: notifsRes.data && Array.isArray(notifsRes.data) && notifsRes.data.length > 0 ? notifsRes.data : state.notifications,
            adminProfile: adminRes.data ? adminRes.data : state.adminProfile,
            bookings: bookingsRes.data && Array.isArray(bookingsRes.data) ? bookingsRes.data : state.bookings,
          }));
        } catch (err) {
          console.error('[DATA STORE FETCH ERROR]', err);
        } finally {
          set({ isLoadingServerData: false });
        }
      },

      setLatestBookingAlert: (latestBookingAlert) => set({ latestBookingAlert }),
      clearLatestBookingAlert: () => set({ latestBookingAlert: null }),
      setSalons: (salons) => set({ salons }),

      addSalon: async (salon) => {
        try {
          const { data } = await api.post('/salons', salon);
          set((state) => ({ salons: [data || salon, ...state.salons] }));
        } catch (err) {
          console.error('Error adding salon:', err);
          set((state) => ({ salons: [salon, ...state.salons] }));
        }
      },

      updateSalon: async (id, patch) => {
        set((state) => ({
          salons: state.salons.map((s) => (String(s.id) === String(id) ? { ...s, ...patch } : s)),
        }));
        try {
          await api.patch(`/salons/${id}`, patch);
        } catch (err) {
          console.error('Error updating salon:', err);
        }
      },

      deleteSalon: async (id) => {
        set((state) => ({
          salons: state.salons.filter((s) => String(s.id) !== String(id)),
        }));
        try {
          await api.delete(`/salons/${id}`);
        } catch (err) {
          console.error('Error deleting salon:', err);
        }
      },

      setUsers: (users) => set({ users }),

      addUser: async (user) => {
        try {
          const { data } = await api.post('/users', user);
          set((state) => ({ users: [data || user, ...state.users] }));
        } catch (err) {
          console.error('Error adding user:', err);
          set((state) => ({ users: [user, ...state.users] }));
        }
      },

      updateUser: async (id, patch) => {
        set((state) => ({
          users: state.users.map((u) => (String(u.id) === String(id) ? { ...u, ...patch } : u)),
        }));
        try {
          await api.patch(`/users/${id}`, patch);
        } catch (err) {
          console.error('Error updating user:', err);
        }
      },

      deleteUser: async (id) => {
        set((state) => ({
          users: state.users.filter((u) => String(u.id) !== String(id)),
        }));
        try {
          await api.delete(`/users/${id}`);
        } catch (err) {
          console.error('Error deleting user:', err);
        }
      },

      setTickets: (tickets) => set({ tickets }),

      updateBookingStatus: async (id, status) => {
        set((state) => ({
          bookings: state.bookings.map((b) => (String(b.id) === String(id) ? { ...b, status } : b)),
        }));
        try {
          await api.patch(`/bookings/${id}/status`, { status });
        } catch (err) {
          console.error('Error updating booking status:', err);
        }
      },

      addNotification: async (n) => {
        set((state) => ({
          notifications: [n, ...state.notifications],
        }));
        try {
          await api.post('/notifications', n);
        } catch (err) {
          console.error('Error adding notification:', err);
        }
      },

      updateNotification: async (id, patch) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        }));
        try {
          await api.patch(`/notifications/${id}`, patch);
        } catch (err) {
          console.error('Error updating notification:', err);
        }
      },

      toggleNotification: async (id) => {
        const item = get().notifications.find((n) => n.id === id);
        if (!item) return;
        const newActiveState = !item.isActive;

        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, isActive: newActiveState } : n)),
        }));

        try {
          await api.patch(`/notifications/${id}`, { isActive: newActiveState });
        } catch (err) {
          console.error('Error toggling notification:', err);
        }
      },

      deleteNotification: async (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
        try {
          await api.delete(`/notifications/${id}`);
        } catch (err) {
          console.error('Error deleting notification:', err);
        }
      },

      updateAdminProfile: async (patch) => {
        set((state) => ({
          adminProfile: { ...state.adminProfile, ...patch },
        }));
        try {
          await api.patch('/admin/profile', patch);
        } catch (err) {
          console.error('Error updating admin profile:', err);
        }
      },
    }),
    {
      name: 'boya-admin-data-storage-v3',
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
