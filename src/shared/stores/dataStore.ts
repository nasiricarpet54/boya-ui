import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/apiClient';
import { normalizePhone } from '../utils/persianUtils';

export interface PlatformNotification {
  id: number;
  title: string;
  content: string;
  type: 'promotional' | 'informational' | 'alert' | 'discount';
  targetAudience: 'customer' | 'salon' | 'all';
  channel: 'in_app' | 'sms' | 'push' | 'both';
  actionUrl?: string;
  badgeText?: string;
  isActive: boolean;
  createdAt: string;
  viewsCount?: number;
  clicksCount?: number;
  smsSentCount?: number;
  expiresAt?: string;
}

export interface AdminProfileData {
  id: number;
  fullName: string;
  phone: string;
  email: string;
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
  emergencyPhone?: string;
}

export interface DataState {
  latestBookingAlert: any | null;
  salons: any[];
  bookings: any[];
  users: any[];
  tickets: any[];
  auditLogs: any[];
  notifications: PlatformNotification[];
  adminProfile: AdminProfileData | null;
  isLoadingServerData: boolean;

  fetchServerData: () => Promise<void>;
  setLatestBookingAlert: (alert: any) => void;
  clearLatestBookingAlert: () => void;
  setSalons: (salons: any[]) => void;
  setTickets: (tickets: any[]) => void;
  addSalon: (salon: any) => Promise<void>;
  updateSalon: (id: string | number, patch: any) => Promise<void>;
  deleteSalon: (id: string | number) => Promise<void>;
  addUser: (user: any) => Promise<void>;
  updateUser: (id: string | number, patch: any) => Promise<void>;
  deleteUser: (id: string | number) => Promise<void>;
  updateBookingStatus: (id: string | number, status: string) => Promise<void>;
  addNotification: (n: any) => Promise<void>;
  updateNotification: (id: string | number, patch: any) => Promise<void>;
  toggleNotification: (id: string | number) => Promise<void>;
  deleteNotification: (id: string | number) => Promise<void>;
  updateAdminProfile: (patch: Partial<AdminProfileData>) => Promise<void>;
  createSpecialist: (payload: any) => Promise<any>;
  updateSpecialist: (id: string | number, patch: any) => Promise<any>;
  deleteSpecialist: (id: string | number) => Promise<void>;
  createService: (payload: any) => Promise<any>;
  updateService: (id: string | number, patch: any) => Promise<any>;
  deleteService: (id: string | number) => Promise<void>;
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      latestBookingAlert: null,
      salons: [],
      bookings: [],
      users: [],
      tickets: [],
      auditLogs: [],
      notifications: [],
      adminProfile: null,
      isLoadingServerData: false,

      fetchServerData: async () => {
        try {
          set({ isLoadingServerData: true });
          const authState = (await import('./authStore')).useAuthStore.getState();
          const authUser = authState.user;
          const isAuth = authState.isAuthenticated;

          const staffRoles = ['super_admin', 'salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager'];
          const salonsEndpoint = isAuth && authUser && staffRoles.includes(authUser.role) ? '/managed/salons' : '/salons';
          const [salonsRes, notifsRes] = await Promise.all([
            api.get(salonsEndpoint).catch(() => ({ data: [] })),
            api.get('/notifications').catch(() => ({ data: [] })),
          ]);

          let usersData: any[] = [];
          let adminData: any = null;
          let bookingsData: any[] = [];

          if (isAuth && authUser) {
            const authRequests: Promise<any>[] = [
              api.get('/bookings').catch(() => ({ data: [] })),
            ];

            const canViewUsers = ['super_admin', 'salon_admin', 'line_manager'].includes(authUser.role);
            if (canViewUsers) {
              authRequests.push(api.get('/users').catch(() => ({ data: [] })));
            }
            if (authUser.role === 'super_admin') {
              authRequests.push(api.get('/admin/profile').catch(() => ({ data: null })));
            }

            const results = await Promise.all(authRequests);
            bookingsData = Array.isArray(results[0]?.data) ? results[0].data : [];

            let resultIndex = 1;
            if (canViewUsers) {
              usersData = Array.isArray(results[resultIndex]?.data) ? results[resultIndex].data : [];
              resultIndex++;
            }
            if (authUser.role === 'super_admin') {
              adminData = results[resultIndex]?.data || null;
            }
          }

          set({
            salons: Array.isArray(salonsRes.data) ? salonsRes.data : [],
            users: usersData,
            notifications: Array.isArray(notifsRes.data) ? notifsRes.data : [],
            adminProfile: adminData,
            bookings: bookingsData,
          });
        } catch (err) {
          console.error('[DATA STORE FETCH ERROR]', err);
        } finally {
          set({ isLoadingServerData: false });
        }
      },

      setLatestBookingAlert: (latestBookingAlert) => set({ latestBookingAlert }),
      clearLatestBookingAlert: () => set({ latestBookingAlert: null }),
      setSalons: (salons) => set({ salons }),
      setTickets: (tickets) => set({ tickets }),

      addSalon: async (salon) => {
        try {
          const { data } = await api.post('/salons', salon);
          if (data) {
            set((state) => ({
              salons: [data, ...state.salons.filter((s) => String(s.id) !== String(data.id))],
            }));
          }
          await get().fetchServerData();
          return data;
        } catch (err) {
          console.error('Error adding salon:', err);
          throw err;
        }
      },

      updateSalon: async (id, patch) => {
        try {
          await api.patch(`/salons/${id}`, patch);
          set((state) => ({
            salons: state.salons.map((s) => (String(s.id) === String(id) ? { ...s, ...patch } : s)),
          }));
        } catch (err) {
          console.error('Error updating salon:', err);
          throw err;
        }
      },

      deleteSalon: async (id) => {
        try {
          await api.delete(`/salons/${id}`);
          set((state) => ({
            salons: state.salons.filter((s) => String(s.id) !== String(id)),
          }));
        } catch (err) {
          console.error('Error deleting salon:', err);
          throw err;
        }
      },

      addUser: async (user) => {
        try {
          await api.post('/users', user);
          await get().fetchServerData();
        } catch (err) {
          console.error('Error adding user:', err);
        }
      },

      updateUser: async (id, patch) => {
        try {
          const { data } = await api.patch(`/users/${id}`, patch);
          set((state) => ({
            users: state.users.map((u) => (String(u.id) === String(id) ? { ...u, ...data.user } : u)),
          }));
        } catch (err) {
          console.error('Error updating user:', err);
        }
      },

      deleteUser: async (id) => {
        try {
          await api.delete(`/users/${id}`);
          set((state) => ({
            users: state.users.filter((u) => String(u.id) !== String(id)),
          }));
        } catch (err) {
          console.error('Error deleting user:', err);
        }
      },

      updateBookingStatus: async (id, status) => {
        try {
          const { data } = await api.patch(`/bookings/${id}/status`, { status });
          set((state) => ({
            bookings: state.bookings.map((b) => (String(b.id) === String(id) ? { ...b, ...data } : b)),
          }));
        } catch (err) {
          console.error('Error updating booking status:', err);
        }
      },

      addNotification: async (n) => {
        try {
          const { data } = await api.post('/notifications', n);
          set((state) => ({ notifications: [data, ...state.notifications] }));
        } catch (err) {
          console.error('Error adding notification:', err);
        }
      },

      updateNotification: async (id, patch) => {
        try {
          await api.patch(`/notifications/${id}`, patch);
          set((state) => ({
            notifications: state.notifications.map((n) => (String(n.id) === String(id) ? { ...n, ...patch } : n)),
          }));
        } catch (err) {
          console.error('Error updating notification:', err);
        }
      },

      toggleNotification: async (id) => {
        const item = get().notifications.find((n) => String(n.id) === String(id));
        if (!item) return;
        try {
          const newActive = !item.isActive;
          await api.patch(`/notifications/${id}`, { isActive: newActive });
          set((state) => ({
            notifications: state.notifications.map((n) => (String(n.id) === String(id) ? { ...n, isActive: newActive } : n)),
          }));
        } catch (err) {
          console.error('Error toggling notification:', err);
        }
      },

      deleteNotification: async (id) => {
        try {
          await api.delete(`/notifications/${id}`);
          set((state) => ({
            notifications: state.notifications.filter((n) => String(n.id) !== String(id)),
          }));
        } catch (err) {
          console.error('Error deleting notification:', err);
        }
      },

      createSpecialist: async (payload) => { const { data } = await api.post('/specialists', payload); await get().fetchServerData(); return data; },
      updateSpecialist: async (id, patch) => { const { data } = await api.patch(`/specialists/${id}`, patch); await get().fetchServerData(); return data; },
      deleteSpecialist: async (id) => { await api.delete(`/specialists/${id}`); await get().fetchServerData(); },
      createService: async (payload) => { const { data } = await api.post('/services', payload); await get().fetchServerData(); return data; },
      updateService: async (id, patch) => { const { data } = await api.patch(`/services/${id}`, patch); await get().fetchServerData(); return data; },
      deleteService: async (id) => { await api.delete(`/services/${id}`); await get().fetchServerData(); },

      updateAdminProfile: async (patch) => {
        try {
          const { data } = await api.patch('/admin/profile', patch);
          set({ adminProfile: data });
        } catch (err) {
          console.error('Error updating admin profile:', err);
        }
      },
    }),
    {
      name: 'boya-core-data-v6',
      partialize: (state) => ({ 
        latestBookingAlert: state.latestBookingAlert,
        tickets: state.tickets,
        auditLogs: state.auditLogs
      }),
    }
  )
);
