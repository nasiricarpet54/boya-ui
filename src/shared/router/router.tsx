import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import React, { lazy, Suspense } from 'react';
import { BoyaSplashScreen } from '../components/ui/BoyaSplashScreen';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { BookingModal } from '../components/modals/BookingModal';
import { SpecialistPortfolioModal } from '../components/modals/SpecialistPortfolioModal';
import { LocationSelectorModal } from '../components/modals/LocationSelectorModal';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { useLocationStore } from '../stores/locationStore';
import { QuickServicesModal } from '../components/modals/QuickServicesModal';
import { ProtectedRoute } from '../components/guards/ProtectedRoute';
import { AuthModal } from '../components/modals/AuthModal';

// Root layout
const Root = () => {
  const { 
    appMode, isMobileFrame, showSplashScreen, splashAppName, setShowSplashScreen,
    toastMessage, isLocationModalOpen, setIsLocationModalOpen, showToast
  } = useUIStore();
  
  const { 
    isBookingModalOpen, closeBookingModal, bookingData,
    isPortfolioModalOpen, closePortfolioModal, portfolioSpecialist, portfolioSalon,
    isQuickViewModalOpen, closeQuickViewModal, quickViewSalon,
    isAuthModalOpen, closeAuthModal,
    openBookingModal
  } = useModalStore();
  
  const locationState = useLocationStore();

  const handleConfirmBooking = (data: any) => {
    closeBookingModal();
    showToast(`نوبت در سالن «${data.salonName}» ثبت شد.`);
  };

  const isAdminMode = appMode === 'admin_panel' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

  if (isAdminMode) {
    return (
      <div className="min-h-screen w-full bg-[#F5F0E8] text-[#1D1C17] flex flex-col antialiased selection:bg-[#D9A2B0] selection:text-[#173B3F]">
        <main className="flex-1 w-full min-h-screen">
          <Outlet />
        </main>
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#173B3F] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-[#D9A2B0]/40 flex items-center gap-2 animate-bounce">
            <span>{toastMessage}</span>
          </div>
        )}
        <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
        <BoyaSplashScreen isOpen={showSplashScreen} appName={splashAppName} onFinish={() => setShowSplashScreen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E7E2DA] flex flex-col selection:bg-[#D9A2B0] selection:text-[#173B3F]">
      <div className="flex justify-center w-full min-h-screen">
        <div
          className={`w-full bg-[#F7F3EE] min-h-screen text-[#1C1C1C] relative flex flex-col transition-all duration-300 ${
            isMobileFrame
              ? 'max-w-[430px] shadow-[0_0_50px_rgba(23,59,63,0.18)] my-0 sm:my-6 sm:rounded-[36px] overflow-hidden border-0 sm:border-[8px] sm:border-[#173B3F]'
              : 'max-w-6xl shadow-sm'
          }`}
        >
          <Header />
          <main className="flex-1 px-4 pt-4 pb-20 overflow-y-auto">
            <Outlet />
          </main>
          {appMode === 'customer' && <BottomNav />}
          {toastMessage && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#173B3F] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-[#D9A2B0]/40 flex items-center gap-2 animate-bounce">
              <span>{toastMessage}</span>
            </div>
          )}
        </div>
      </div>
      
      <BookingModal isOpen={isBookingModalOpen} onClose={closeBookingModal} bookingData={bookingData} onConfirmBooking={handleConfirmBooking} />
      <SpecialistPortfolioModal isOpen={isPortfolioModalOpen} onClose={closePortfolioModal} specialist={portfolioSpecialist} salon={portfolioSalon} onBookWithSpecialist={(spec, sal) => {
          const serv = sal.services[0];
          const date = sal.availableSlots[0].date;
          const time = sal.availableSlots[0].slots.find(s => !s.booked)?.time || '۱۱:۰۰';
          openBookingModal(sal, serv, spec, date, time);
      }} />
      <LocationSelectorModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} locationState={locationState.customerLocation} onUpdateLocation={locationState.setCustomerLocation} selectedProvince={locationState.selectedProvince} onSelectProvince={locationState.setSelectedProvince} selectedCity={locationState.selectedCity} onSelectCity={locationState.setSelectedCity} selectedDistrict={locationState.selectedDistrict} onSelectDistrict={locationState.setSelectedDistrict} maxDistanceKm={locationState.maxDistanceKm} onSelectMaxDistance={locationState.setMaxDistanceKm} sortByDistance={locationState.sortByDistance} onToggleSortByDistance={locationState.setSortByDistance} />
      <QuickServicesModal isOpen={isQuickViewModalOpen} onClose={closeQuickViewModal} salon={quickViewSalon} onSelectService={(service) => {
          if (quickViewSalon) {
            closeQuickViewModal();
            // Default to first specialist for quick booking from this modal
            openBookingModal(quickViewSalon, service, quickViewSalon.specialists[0], quickViewSalon.availableSlots[0].date, quickViewSalon.availableSlots[0].slots.find(s => !s.booked)?.time || '۱۱:۰۰');
          }
      }} />
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
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

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <Suspense fallback={<div className="p-10 text-center">...</div>}><HomeScreen /></Suspense> });
const salonsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/salons', component: () => <Suspense fallback={<div className="p-10 text-center">...</div>}><SalonsScreen /></Suspense> });
const bookingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/bookings', component: () => <Suspense fallback={<div className="p-10 text-center">...</div>}><ProtectedRoute><BookingsScreen /></ProtectedRoute></Suspense> });
const savedRoute = createRoute({ getParentRoute: () => rootRoute, path: '/saved', component: () => <Suspense fallback={<div className="p-10 text-center">...</div>}><ProtectedRoute><SavedScreen /></ProtectedRoute></Suspense> });
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile', component: () => <Suspense fallback={<div className="p-10 text-center">...</div>}><ProtectedRoute><ProfileSupportScreen /></ProtectedRoute></Suspense> });
const salonAdminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/salon-admin', component: () => <Suspense fallback={<div className="p-10 text-center">...</div>}><ProtectedRoute allowedRoles={['salon_admin', 'super_admin', 'salon_specialist', 'mobile_specialist', 'line_manager']}><SalonAdminDashboard /></ProtectedRoute></Suspense> });
const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: () => <Suspense fallback={<div className="p-10 text-center">...</div>}><ProtectedRoute allowedRoles={['super_admin']}><AdminPanel /></ProtectedRoute></Suspense> });

const routeTree = rootRoute.addChildren([indexRoute, salonsRoute, bookingsRoute, savedRoute, profileRoute, salonAdminRoute, adminRoute]);
export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' { interface Register { router: typeof router; } }
