import { useQuery } from '@tanstack/react-query';
import api from './apiClient';
import { useAuthStore } from '../stores/authStore';

const isExplicitlyInactive = (item: any, checkStatus = true) =>
  item?.isActive === false || item?.active === false ||
  (item?.publicationStatus != null && item.publicationStatus !== 'active') ||
  (checkStatus && item?.status != null && item.status !== 'active');

/**
 * Filter customer-facing published salons.
 * Note: Does NOT mutate or overwrite the global admin dataStore.salons.
 *
 * F-11: `salons.status` is internal admin business state (`pending` means the
 * salon is awaiting review). Public visibility is already decided server-side
 * by `/api/salons`, which filters on `isApproved = true`. Re-gating on
 * `status !== 'active'` here hid every approved salon whose status defaulted
 * to `pending` — the marketplace came up empty. Pass `false` so the salon
 * filter ignores `status` and trusts the server's `isApproved` decision.
 */
const filterPublishedSalons = (items: any[]) => items
  .filter((salon) => salon?.isApproved !== false && !isExplicitlyInactive(salon, false))
  .map((salon) => ({
    ...salon,
    services: (Array.isArray(salon.services) ? salon.services : []).filter(
      (service: any) => service?.isAvailable !== false && service?.available !== false && !isExplicitlyInactive(service),
    ),
    specialists: (Array.isArray(salon.specialists) ? salon.specialists : []).filter(
      (specialist: any) => specialist?.verified !== false && specialist?.isVerified !== false &&
        specialist?.isActive !== false && !isExplicitlyInactive(specialist),
    ),
  }));

/**
 * Customer-facing query hook.
 * Fetches published, active salons. Does NOT overwrite or interfere with admin dataStore.
 */
export const useSalons = () => {
  return useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const { data } = await api.get('/salons');
      if (!Array.isArray(data)) {
        throw new Error('Invalid salons response: expected an array');
      }
      return filterPublishedSalons(data);
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });
};

/**
 * Administrative query hook for super_admin / salon_admin dashboards.
 * Preserves all unapproved, pending, and inactive salons so approval views remain completely accurate.
 */
export const useAdminSalons = () => {
  return useQuery({
    queryKey: ['admin-salons'],
    queryFn: async () => {
      const { data } = await api.get('/managed/salons');
      if (!Array.isArray(data)) {
        throw new Error('Invalid managed salons response: expected an array');
      }
      return data;
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
};

export const useManagedSalons = useAdminSalons;

/**
 * Fetch detailed salon information with its full services and specialists.
 */
export const useSalonDetail = (id: string | number) => {
  return useQuery({
    queryKey: ['salon', String(id)],
    queryFn: async () => {
      const { data } = await api.get(`/salons/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60,
  });
};

/**
 * Public showcase of per-service sample-work images ("نمونه‌کار خدمات").
 * Each row is one service with its `portfolio` array embedded; group by
 * salonId on the client. Independent (owner-rooted) services have salonId null.
 */
export const useServicesPortfolio = () => {
  return useQuery({
    queryKey: ['services-portfolio'],
    queryFn: async () => {
      const { data } = await api.get('/services-portfolio');
      if (!Array.isArray(data)) return [];
      return data as Array<{
        id: number;
        salonId: number | null;
        ownerId: number | null;
        serviceLineId: string;
        name: string;
        price: string | number;
        durationMinutes: number;
        isMobileAvailable: boolean;
        imageUrl: string | null;
        publicationStatus: string;
        portfolio: Array<{ id: number; imageUrl: string; title: string | null }>;
      }>;
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });
};

/**
 * Query hook for user bookings.
 * Only executes when the user is authenticated, avoiding 401 Unauthorized errors for guests.
 * Does NOT fall back to stale mock data on network errors, ensuring PostgreSQL state integrity.
 * Errors trigger React Query's isError state so UI can show proper retry banners.
 */
export const useBookings = () => {
  const { isAuthenticated, user } = useAuthStore();

  return useQuery({
    queryKey: ['bookings', user?.id || 'guest'],
    queryFn: async () => {
      // If user is not authenticated, do not request protected bookings endpoint
      if (!isAuthenticated || !user) {
        return [];
      }
      try {
        const { data } = await api.get('/bookings');
        if (!Array.isArray(data)) {
          throw new Error('Invalid bookings response: expected an array');
        }
        return data;
      } catch (err: any) {
        // If unauthenticated or token expired, gracefully return empty bookings
        if (err.response?.status === 401) {
          return [];
        }
        // Genuine network/server error: surface it for React Query isError
        const errorMsg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'خطا در دریافت لیست نوبت‌ها از پایگاه داده';
        console.error('[USE_BOOKINGS_ERROR]', errorMsg);
        throw new Error(errorMsg);
      }
    },
    enabled: isAuthenticated && !!user,
    initialData: !isAuthenticated ? [] : undefined,
    retry: 1,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
};

/**
 * Staff management query hook for salon administrators and line managers.
 */
export const useStaff = () => {
  const { isAuthenticated, user } = useAuthStore();
  const isStaff = isAuthenticated && !!user && ['super_admin', 'salon_admin', 'line_manager'].includes(user.role);

  return useQuery({
    queryKey: ['staff', user?.id || 'guest'],
    queryFn: async () => {
      if (!isStaff) return [];
      try {
        const { data } = await api.get('/line-manager/staff');
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: !!isStaff,
    retry: false,
    staleTime: 1000 * 30,
  });
};
