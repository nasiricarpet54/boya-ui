import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import React, { lazy, Suspense } from 'react';
import { BoyaSplashScreen } from '../components/ui/BoyaSplashScreen';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { BookingModal } from '../components/modals/BookingModal';
import { SpecialistPortfolioModal } from '../components/modals/SpecialistPortfolioModal';
import { LocationSelectorModal } from '../components/modals/LocationSelectorModal';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore, getAppModeForRole } from '../stores/authStore';
import { isStaff, isCustomerRoute } from '../constants/roles';
import { useModalStore } from '../stores/modalStore';
import { useLocationStore } from '../stores/locationStore';
import { useDataStore } from '../stores/dataStore';
import { QuickServicesModal } from '../components/modals/QuickServicesModal';
import { ServicesShowcaseModal } from '../components/modals/ServicesShowcaseModal';
import { ProtectedRoute } from '../components/guards/ProtectedRoute';
import { AuthModal } from '../components/modals/AuthModal';
import { GlobalSearchModal } from '../components/search/GlobalSearchModal';
import { PlatformNotificationsRenderer } from '../components/ui/PlatformNotificationsRenderer';

// Root layout
const Root = () => {
  const { 
    appMode, isMobileFrame, showSplashScreen, splashAppName, setShowSplashScreen,
    toastMessage, isLocationModalOpen, setIsLocationModalOpen, showToast,
    setAppMode // ✅
  } = useUIStore();
  
  const { user, isAuthenticated, verifySession } = useAuthStore();

  // Security A-07: Always verify session and role against PostgreSQL server on mount
  React.useEffect(() => {
    verifySession();
  }, [verifySession]);

  React.useEffect(() => {
    if (isAuthenticated && user) {
      setAppMode(getAppModeForRole(user.role));
    }
  }, [isAuthenticated, user, setAppMode]);

  // ROLE LOCK (server-independent enforcement): a logged-in staff member who
  // lands on a customer route (by typing the URL, a stale link or a hard
  // reload at "/") is pushed back to their own panel. Customers are never
  // redirected away. Runs on every auth change, not just at mount.
  React.useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!isStaff(user.role)) return;
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (!isCustomerRoute(pathname)) return;
    const target = user.role === 'super_admin' ? '/admin' : '/salon-admin';
    if (pathname !== target) {
      router.navigate({ to: target, replace: true });
    }
  }, [isAuthenticated, user]);

  const { 
    isBookingModalOpen, closeBookingModal, bookingData,
    isPortfolioModalOpen, closePortfolioModal, portfolioSpecialist, portfolioSalon,
    isQuickViewModalOpen, closeQuickViewModal, quickViewSalon,
    isAuthModalOpen, closeAuthModal,
    openBookingModal
  } = useModalStore();
  
  const locationState = useLocationStore();
  const { fetchServerData } = useDataStore();

  React.useEffect(() => {
    fetchServerData();
  }, [fetchServerData]);

  const handleConfirmBooking = (data: any) => {
    closeBookingModal();
    showToast(`نوبت در سالن «${data.salonName}» ثبت شد.`);
  };

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isSalonPanelMode = appMode === 'salon_panel' || (pathname.startsWith('/salon-admin') || pathname.startsWith('/salon-panel') || (pathname.startsWith('/salon') && !pathname.startsWith('/salons')));
  const isAdminMode = appMode === 'admin_panel' || pathname.startsWith('/admin');
  
  return (
    <div className="min-h-screen bg-[#E7E2DA] flex flex-col selection:bg-[#D9A2B0] selection:text-[#173B3F]">
      {isSalonPanelMode ? (
        <div className="min-h-screen w-full bg-[#F5F0E8] text-[#1D1C17] flex flex-col antialiased">
          <Header />
          <PlatformNotificationsRenderer currentPanelOverride="salon" />
          <main className="flex-1 w-full min-h-screen">
            <Outlet />
          </main>
        </div>
      ) : isAdminMode ? (
        <div className="min-h-screen w-full bg-[#F5F0E8] text-[#1D1C17] flex flex-col antialiased">
          <Header />
          <PlatformNotificationsRenderer currentPanelOverride="admin" />
          <main className="flex-1 w-full min-h-screen">
            <Outlet />
          </main>
        </div>
      ) : (
        <div className="flex justify-center w-full min-h-screen">
          <div
            className={`w-full bg-[#F7F3EE] min-h-screen text-[#1C1C1C] relative flex flex-col transition-all duration-300 ${
              isMobileFrame
                ? 'max-w-[430px] shadow-[0_0_50px_rgba(23,59,63,0.18)] my-0 sm:my-6 sm:rounded-[36px] overflow-x-hidden overflow-y-auto border-0 sm:border-[8px] sm:border-[#173B3F]'
                : 'max-w-6xl shadow-sm'
            }`}
          >
            <Header />
            <PlatformNotificationsRenderer currentPanelOverride="customer" />
            <main className="flex-1 px-4 pt-4 pb-20 overflow-y-auto">
              <Outlet />
            </main>
            {appMode === 'customer' && <BottomNav />}
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#173B3F] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-[#D9A2B0]/40 flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}
      
      {/* Global Modals rendered unconditionally to maintain stable hook execution */}
      <BookingModal isOpen={isBookingModalOpen} onClose={closeBookingModal} bookingData={bookingData} onConfirmBooking={handleConfirmBooking} />
      <SpecialistPortfolioModal isOpen={isPortfolioModalOpen} onClose={closePortfolioModal} specialist={portfolioSpecialist} salon={portfolioSalon} onBookWithSpecialist={(spec, sal, service) => {
          const serv = service || sal.services.find(s => s.serviceLineId === spec.specialtyLine) || sal.services[0];
          const date = sal.availableSlots?.[0]?.date || 'شنبه ۵ آبان';
          const time = sal.availableSlots?.[0]?.slots.find(s => !s.booked)?.time || '۱۱:۰۰';
          openBookingModal(sal, serv, spec, date, time);
      }} />
      <LocationSelectorModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} locationState={locationState.customerLocation} onUpdateLocation={locationState.setCustomerLocation} selectedProvince={locationState.selectedProvince} onSelectProvince={locationState.setSelectedProvince} selectedCity={locationState.selectedCity} onSelectCity={locationState.setSelectedCity} selectedDistrict={locationState.selectedDistrict} onSelectDistrict={locationState.setSelectedDistrict} maxDistanceKm={locationState.maxDistanceKm} onSelectMaxDistance={locationState.setMaxDistanceKm} sortByDistance={locationState.sortByDistance} onToggleSortByDistance={locationState.setSortByDistance} />
      <QuickServicesModal isOpen={isQuickViewModalOpen} onClose={closeQuickViewModal} salon={quickViewSalon} onSelectService={(service) => {
          if (quickViewSalon) {
            closeQuickViewModal();
            openBookingModal(quickViewSalon, service, quickViewSalon.specialists[0], quickViewSalon.availableSlots[0].date, quickViewSalon.availableSlots[0].slots.find(s => !s.booked)?.time || '۱۱:۰۰');
          }
      }} />
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <ServicesShowcaseModal />
      <GlobalSearchModal />
      <BoyaSplashScreen isOpen={showSplashScreen} appName={splashAppName} onFinish={() => setShowSplashScreen(false)} />
    </div>
  );
};
const rootRoute = createRootRoute({ component: Root });

// Lazy loaded components for code-splitting and small initial bundle size
const HomeScreen = lazy(() => import('../../features/home/components/HomeScreen').then(m => ({ default: m.HomeScreen })));
const SalonsScreen = lazy(() => import('../../features/salons/components/SalonsScreen').then(m => ({ default: m.SalonsScreen })));
const BookingsScreen = lazy(() => import('../../features/booking/components/BookingsScreen').then(m => ({ default: m.BookingsScreen })));
const SavedScreen = lazy(() => import('../../features/saved/components/SavedScreen').then(m => ({ default: m.SavedScreen })));
const ProfileSupportScreen = lazy(() => import('../../features/profile/components/ProfileSupportScreen').then(m => ({ default: m.ProfileSupportScreen })));
const AdminPanel = lazy(() => import('../../features/admin/components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const SalonAdminDashboard = lazy(() => import('../../features/salon-admin/components/SalonAdminDashboard').then(m => ({ default: m.SalonAdminDashboard })));

// Stable named route components for TanStack Router
const HomeRouteComponent = () => (
  <Suspense fallback={<div className="p-10 text-center text-xs font-bold text-[#173B3F]">در حال بارگذاری...</div>}>
    <HomeScreen />
  </Suspense>
);

const SalonsRouteComponent = () => (
  <Suspense fallback={<div className="p-10 text-center text-xs font-bold text-[#173B3F]">در حال بارگذاری...</div>}>
    <SalonsScreen />
  </Suspense>
);

const BookingsRouteComponent = () => (
  <Suspense fallback={<div className="p-10 text-center text-xs font-bold text-[#173B3F]">در حال بارگذاری...</div>}>
    <ProtectedRoute allowedRoles={['customer', 'salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager', 'super_admin']}>
      <BookingsScreen />
    </ProtectedRoute>
  </Suspense>
);

const SavedRouteComponent = () => (
  <Suspense fallback={<div className="p-10 text-center text-xs font-bold text-[#173B3F]">در حال بارگذاری...</div>}>
    <ProtectedRoute allowedRoles={['customer', 'salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager', 'super_admin']}>
      <SavedScreen />
    </ProtectedRoute>
  </Suspense>
);

const ProfileRouteComponent = () => (
  <Suspense fallback={<div className="p-10 text-center text-xs font-bold text-[#173B3F]">در حال بارگذاری...</div>}>
    <ProtectedRoute allowedRoles={['customer', 'salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager', 'super_admin']}>
      <ProfileSupportScreen />
    </ProtectedRoute>
  </Suspense>
);

const SalonAdminRouteComponent = () => (
  <Suspense fallback={<div className="p-10 text-center text-xs font-bold text-[#173B3F]">در حال بارگذاری پنل سالندار...</div>}>
    <ProtectedRoute allowedRoles={['salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager']}>
      <SalonAdminDashboard />
    </ProtectedRoute>
  </Suspense>
);

const AdminRouteComponent = () => (
  <Suspense fallback={<div className="p-10 text-center text-xs font-bold text-[#173B3F]">در حال بارگذاری پنل مدیریت ارشد...</div>}>
    <ProtectedRoute allowedRoles={['super_admin']}>
      <AdminPanel />
    </ProtectedRoute>
  </Suspense>
);

import { NotFoundScreen } from '../../features/not-found/NotFoundScreen';

const NotFoundRouteComponent = () => (
  <Suspense fallback={<div className="p-10 text-center text-xs font-bold text-[#173B3F]">در حال بارگذاری...</div>}>
    <NotFoundScreen />
  </Suspense>
);

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomeRouteComponent });
const salonsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/salons', component: SalonsRouteComponent });
const bookingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/bookings', component: BookingsRouteComponent });
const savedRoute = createRoute({ getParentRoute: () => rootRoute, path: '/saved', component: SavedRouteComponent });
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile', component: ProfileRouteComponent });
const salonAdminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/salon-admin', component: SalonAdminRouteComponent });
const salonRoute = createRoute({ getParentRoute: () => rootRoute, path: '/salon', component: SalonAdminRouteComponent });
const salonPanelRoute = createRoute({ getParentRoute: () => rootRoute, path: '/salon-panel', component: SalonAdminRouteComponent });
const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: AdminRouteComponent });
const notFoundRoute = createRoute({ getParentRoute: () => rootRoute, path: '*', component: NotFoundRouteComponent });

const routeTree = rootRoute.addChildren([indexRoute, salonsRoute, bookingsRoute, savedRoute, profileRoute, salonAdminRoute, salonRoute, salonPanelRoute, adminRoute, notFoundRoute]);

const basepath = typeof window !== 'undefined' && window.location.pathname.startsWith('/app') ? '/app' : '';
export const router = createRouter({ 
  routeTree, 
  basepath,
  defaultErrorComponent: ({ error, reset }: { error: any; reset: () => void }) => (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="bg-white p-8 rounded-3xl border border-[#E7E2DA] shadow-lg max-w-md w-full">
        <div className="w-16 h-16 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[#173B3F] mb-2 font-serif">خطا در بارگذاری بخش مورد نظر</h2>
        <p className="text-xs text-[#6C6C6C] mb-6 leading-relaxed">
          {error?.message || 'مشکلی در بارگذاری رخ داده است.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="bg-[#173B3F] text-white px-6 py-2.5 rounded-2xl text-xs font-bold hover:bg-[#122e31] transition-all cursor-pointer"
          >
            تلاش مجدد
          </button>
          <a
            href="/"
            className="bg-[#D9A2B0]/30 text-[#173B3F] border border-[#D9A2B0] px-6 py-2.5 rounded-2xl text-xs font-bold hover:bg-[#D9A2B0]/50 transition-all cursor-pointer"
          >
            بازگشت به خانه
          </a>
        </div>
      </div>
    </div>
  ),
});

declare module '@tanstack/react-router' { interface Register { router: typeof router; } }
