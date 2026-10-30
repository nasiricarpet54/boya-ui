/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { SalonsScreen } from './components/SalonsScreen';
import { BookingsScreen } from './components/BookingsScreen';
import { SavedScreen } from './components/SavedScreen';
import { ProfileSupportScreen } from './components/ProfileSupportScreen';
import { SalonAdminDashboard } from './components/SalonAdminDashboard';
import { BookingModal } from './components/BookingModal';
import { SpecialistPortfolioModal } from './components/SpecialistPortfolioModal';
import {
  SALONS,
  Salon,
  SalonService,
  Specialist,
  Booking,
  INITIAL_BOOKINGS,
} from './data/marketplaceData';

export default function App() {
  // App Mode: Two-Sided Platform (Customer App vs Salon & Specialist Panel)
  const [appMode, setAppMode] = useState<'customer' | 'salon_panel'>('customer');

  // Customer Navigation: 5 tabs
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [targetServiceLine, setTargetServiceLine] = useState<string>('all');

  // City selector
  const [selectedCity, setSelectedCity] = useState<string>('تهران');

  // Viewport Frame Mode: default 390px baseline as specified in design doc
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);

  // Bookings State (shared across customer and salon panels)
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);

  // Saved / Wishlist Salons
  const [savedSalonIds, setSavedSalonIds] = useState<string[]>(['salon-1', 'salon-3']);

  // Modals State
  const [bookingData, setBookingData] = useState<{
    salon: Salon;
    service: SalonService;
    specialist: Specialist;
    date: string;
    time: string;
  } | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Specialist Portfolio Modal
  const [portfolioSpecialist, setPortfolioSpecialist] = useState<Specialist | null>(null);
  const [portfolioSalon, setPortfolioSalon] = useState<Salon | null>(null);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Booking Flow
  const handleStartBooking = (
    salon: Salon,
    service: SalonService,
    specialist: Specialist,
    date: string,
    time: string
  ) => {
    setBookingData({ salon, service, specialist, date, time });
    setIsBookingOpen(true);
  };

  const handleConfirmBooking = (appointmentData: any) => {
    const newBooking: Booking = {
      id: `bkg-${Date.now()}`,
      trackingCode: `BY-${Math.floor(100000 + Math.random() * 900000)}`,
      tenantId: appointmentData.salonId,
      salonName: appointmentData.salonName,
      salonAddress: appointmentData.salonAddress,
      serviceId: appointmentData.serviceId,
      serviceName: appointmentData.serviceName,
      serviceLineId: appointmentData.serviceLineId,
      specialistId: appointmentData.specialistId,
      specialistName: appointmentData.specialistName,
      date: appointmentData.date,
      time: appointmentData.time,
      durationMinutes: appointmentData.durationMinutes,
      price: appointmentData.price,
      customerName: appointmentData.customerName,
      customerPhone: appointmentData.customerPhone,
      customerAddress: appointmentData.customerAddress,
      notes: appointmentData.notes,
      isMobileBooking: appointmentData.isMobileBooking,
      status: 'confirmed',
      createdAt: 'امروز',
    };

    setBookings((prev) => [newBooking, ...prev]);
    showToast(`نوبت در سالن «${appointmentData.salonName}» ثبت و پیامک ارسال شد.`);
  };

  const handleCancelBooking = (id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b))
    );
    showToast('نوبت لغو گردید.');
  };

  const handleUpdateBookingStatus = (
    bookingId: string,
    newStatus: 'confirmed' | 'completed' | 'cancelled'
  ) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );
    showToast('وضعیت نوبت در پنل سالندار به‌روز شد.');
  };

  // Wishlist Handlers
  const handleToggleWishlistSalon = (salonId: string) => {
    setSavedSalonIds((prev) => {
      if (prev.includes(salonId)) {
        showToast('از نشان‌شده‌ها حذف شد.');
        return prev.filter((id) => id !== salonId);
      }
      showToast('به سالن‌های نشان‌شده افزوده شد.');
      return [...prev, salonId];
    });
  };

  // View Specialist Portfolio
  const handleViewSpecialistPortfolio = (specialist: Specialist, salon: Salon) => {
    setPortfolioSpecialist(specialist);
    setPortfolioSalon(salon);
  };

  const activeBookingsCount = bookings.filter((b) => b.status === 'confirmed').length;

  return (
    <div className="min-h-screen bg-[#E7E2DA] flex justify-center selection:bg-[#FECE57] selection:text-[#04142C]">
      {/* Container: 390px mobile viewport baseline or full desktop container */}
      <div
        className={`w-full bg-[#F5F0E8] min-h-screen text-[#1D1C17] relative flex flex-col transition-all duration-300 ${
          isMobileFrame
            ? 'max-w-[430px] shadow-[0_0_50px_rgba(0,0,0,0.15)] my-0 sm:my-6 sm:rounded-[36px] overflow-hidden border-0 sm:border-[8px] sm:border-[#1A2942]'
            : 'max-w-6xl shadow-sm'
        }`}
      >
        {/* Top Header */}
        <Header
          appMode={appMode}
          onToggleAppMode={setAppMode}
          selectedCity={selectedCity}
          onSelectCity={setSelectedCity}
          isMobileFrame={isMobileFrame}
          onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
          activeBookingsCount={activeBookingsCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 px-4 pt-4 pb-20">
          {appMode === 'salon_panel' ? (
            /* Salon & Specialist App */
            <SalonAdminDashboard
              onSwitchToCustomerApp={() => setAppMode('customer')}
              bookings={bookings}
              onUpdateBookingStatus={handleUpdateBookingStatus}
            />
          ) : (
            /* Customer App */
            <>
              {activeTab === 'home' && (
                <HomeScreen
                  onNavigateToSalons={(serviceLineId) => {
                    if (serviceLineId) setTargetServiceLine(serviceLineId);
                    setActiveTab('salons');
                  }}
                  onBookSalon={handleStartBooking}
                  onViewSpecialistPortfolio={handleViewSpecialistPortfolio}
                  savedSalonIds={savedSalonIds}
                  onToggleWishlistSalon={handleToggleWishlistSalon}
                  selectedCity={selectedCity}
                />
              )}

              {activeTab === 'salons' && (
                <SalonsScreen
                  initialServiceLine={targetServiceLine}
                  onBookSalon={handleStartBooking}
                  onViewSpecialistPortfolio={handleViewSpecialistPortfolio}
                  savedSalonIds={savedSalonIds}
                  onToggleWishlistSalon={handleToggleWishlistSalon}
                  selectedCity={selectedCity}
                />
              )}

              {activeTab === 'bookings' && (
                <BookingsScreen
                  bookings={bookings}
                  onCancelBooking={handleCancelBooking}
                  onNavigateToSalons={() => setActiveTab('salons')}
                />
              )}

              {activeTab === 'saved' && (
                <SavedScreen
                  savedSalonIds={savedSalonIds}
                  onToggleWishlistSalon={handleToggleWishlistSalon}
                  onBookSalon={handleStartBooking}
                  onViewSpecialistPortfolio={handleViewSpecialistPortfolio}
                  onNavigateToSalons={() => setActiveTab('salons')}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileSupportScreen
                  onSwitchToSalonPanel={() => setAppMode('salon_panel')}
                />
              )}
            </>
          )}
        </main>

        {/* Bottom Nav: Only in Customer App Mode */}
        {appMode === 'customer' && (
          <BottomNav
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            bookingsCount={activeBookingsCount}
            savedCount={savedSalonIds.length}
          />
        )}

        {/* Booking Form Modal */}
        <BookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          bookingData={bookingData}
          onConfirmBooking={handleConfirmBooking}
        />

        {/* Specialist Portfolio Modal */}
        <SpecialistPortfolioModal
          specialist={portfolioSpecialist}
          salon={portfolioSalon}
          isOpen={!!portfolioSpecialist}
          onClose={() => setPortfolioSpecialist(null)}
          onBookWithSpecialist={(spec, sal) => {
            const serv = sal.services[0];
            const date = sal.availableSlots[0].date;
            const time = sal.availableSlots[0].slots.find((s) => !s.booked)?.time || '۱۱:۰۰';
            handleStartBooking(sal, serv, spec, date, time);
          }}
        />

        {/* Action Toast Feedback */}
        {toastMessage && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#1A2942] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-[#C59B27]/40 flex items-center gap-2 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
