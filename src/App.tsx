/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, AppExperienceMode } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { SalonsScreen } from './components/SalonsScreen';
import { BookingsScreen } from './components/BookingsScreen';
import { SavedScreen } from './components/SavedScreen';
import { ProfileSupportScreen } from './components/ProfileSupportScreen';
import { SalonAdminDashboard } from './components/SalonAdminDashboard';
import { BookingModal } from './components/BookingModal';
import { SpecialistPortfolioModal } from './components/SpecialistPortfolioModal';
import { LocationSelectorModal } from './components/LocationSelectorModal';
import { BoyaSplashScreen } from './components/BoyaSplashScreen';
import { AdminPanel } from './components/admin/AdminPanel';
import { boyaApi } from './services/boyaApi';
import { CustomerLocationState } from './utils/geoUtils';
import {
  INITIAL_SALONS,
  Salon,
  SalonService,
  Specialist,
  Booking,
  INITIAL_BOOKINGS,
  PlatformUser,
  INITIAL_USERS,
  SupportTicket,
  INITIAL_TICKETS,
  AuditLogItem,
  INITIAL_AUDIT_LOGS,
} from './data/marketplaceData';

export default function App() {
  // Master Switcher: 3 Distinct Systems (Customer App vs Salon & Specialist App vs Super Admin Web Panel)
  const [appMode, setAppMode] = useState<AppExperienceMode>('customer');
  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(true);
  const [splashAppName, setSplashAppName] = useState<string>('ورود به اپلیکیشن هوشمند مشتریان بویا');

  const handleSwitchAppMode = (mode: AppExperienceMode) => {
    const names: Record<AppExperienceMode, string> = {
      customer: 'ورود به اپلیکیشن هوشمند مشتریان بویا',
      salon_panel: 'ورود به پنل جامع سالندار و متخصصین بویا',
      admin_panel: 'ورود به سامانه نظارتی ادمین کل (Super Admin)',
    };
    setSplashAppName(names[mode]);
    setShowSplashScreen(true);
    setAppMode(mode);
  };

  // Customer Navigation: 5 tabs
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [targetServiceLine, setTargetServiceLine] = useState<string>('all');

  // Iranian 31 Provinces & City Cascading Filter + GPS Geolocation State
  const [selectedProvince, setSelectedProvince] = useState<string>('تهران');
  const [selectedCity, setSelectedCity] = useState<string>('تهران');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('همه');
  const [customerLocation, setCustomerLocation] = useState<CustomerLocationState>({
    coords: { lat: 35.7951, lng: 51.4239 },
    status: 'simulated',
    source: 'preset',
    label: 'موقعیت آزمایشی: تهران (الهیه)',
  });
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [sortByDistance, setSortByDistance] = useState<boolean>(true);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  // Viewport Frame Mode: default 390px baseline for mobile apps
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);

  // Live Backend Connection Status
  const [liveBackendStatus, setLiveBackendStatus] = useState<{ isConnected: boolean; latencyMs: number }>({
    isConnected: true,
    latencyMs: 32,
  });

  // Shared Core Platform States (Live Reactive Store)
  const [salons, setSalons] = useState<Salon[]>(INITIAL_SALONS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [users, setUsers] = useState<PlatformUser[]>(INITIAL_USERS);
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [latestBookingAlert, setLatestBookingAlert] = useState<{
    id: string;
    bookingId: string;
    salonName: string;
    serviceName: string;
    status: 'confirmed' | 'completed' | 'cancelled' | 'pending';
    time: string;
  } | null>(null);

  // Real-time PostgreSQL Connection on Mount
  useEffect(() => {
    async function syncWithLiveDatabase() {
      const health = await boyaApi.checkHealth();
      setLiveBackendStatus({ isConnected: health.isConnected, latencyMs: health.latencyMs });

      if (health.isConnected) {
        try {
          const liveList = await boyaApi.fetchLiveSalons();
          if (liveList && liveList.length > 0) {
            const detailedSalons = await Promise.all(
              liveList.map(async (l) => {
                const detail = await boyaApi.fetchSalonDetail(l.id);
                return boyaApi.adaptLiveSalon(detail || l);
              })
            );
            setSalons((prev) => {
              const liveIds = new Set(detailedSalons.map((s) => s.id));
              const rest = prev.filter((s) => !liveIds.has(s.id));
              return [...detailedSalons, ...rest];
            });
          }
        } catch {
          // Keep local fallback store
        }
      }
    }
    syncWithLiveDatabase();
  }, []);

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

  // Helper to add audit log
  const logAction = (action: string, actorName: string, actorRole: string, details: string, level: 'info' | 'warning' | 'security' = 'info') => {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      action,
      actorName,
      actorRole,
      details,
      ipAddress: '127.0.0.1 (Local UI)',
      timestamp: 'هم‌اکنون',
      level,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // --- Customer Booking Flow ---
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
    const trackingCode = `BY-${Math.floor(100000 + Math.random() * 900000)}`;
    const newBooking: Booking = {
      id: `bkg-${Date.now()}`,
      trackingCode,
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
    logAction(
      'BOOKING_CREATED_SMS_DISPATCHED',
      appointmentData.customerName,
      'customer',
      `ثبت نوبت خدمت «${appointmentData.serviceName}» در ${appointmentData.salonName} و ارسال پیامک به ${appointmentData.customerPhone}`
    );
    showToast(`نوبت در سالن «${appointmentData.salonName}» ثبت و پیامک ملی‌پیامک صادر شد.`);
  };

  const handleCancelBooking = (id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b))
    );
    logAction('BOOKING_CANCELLED', 'کاربر', 'customer', `لغو نوبت با شناسه ${id}`, 'warning');
    showToast('نوبت لغو گردید.');
  };

  // --- Salon Admin Status Updates ---
  const handleUpdateBookingStatus = (
    bookingId: string,
    newStatus: 'confirmed' | 'completed' | 'cancelled'
  ) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );
    if (targetBooking) {
      setLatestBookingAlert({
        id: `alert-${Date.now()}`,
        bookingId,
        salonName: targetBooking.salonName,
        serviceName: targetBooking.serviceName,
        status: newStatus,
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      });
    }
    logAction(
      'BOOKING_STATUS_UPDATED',
      'مدیریت سالن و متخصص',
      'salon_owner',
      `تغییر وضعیت نوبت ${bookingId} به ${newStatus}`
    );
    showToast('وضعیت نوبت در سامانه به‌روزرسانی شد.');
  };

  const handleUpdateSalon = (salonId: string, updates: Partial<Salon>) => {
    setSalons((prev) =>
      prev.map((s) => (s.id === salonId ? { ...s, ...updates } : s))
    );
    showToast('اطلاعات سالن با موفقیت به‌روزرسانی شد.');
  };

  // --- Admin Panel Handlers ---
  const handleApproveTenant = (tenantId: string) => {
    setSalons((prev) =>
      prev.map((s) => (s.id === tenantId ? { ...s, isApproved: true, status: 'active' } : s))
    );
    const targetSalon = salons.find((s) => s.id === tenantId);
    logAction(
      'TENANT_APPROVED',
      'مهندس حسینی (Super Admin)',
      'super_admin',
      `تایید رسمی پرونده سالن «${targetSalon?.name || tenantId}» و فعال‌سازی در اپ مشتری`,
      'security'
    );
    showToast('سالن با موفقیت تایید و در اپلیکیشن مشتریان منتشر گردید.');
  };

  const handleRejectTenant = (tenantId: string) => {
    setSalons((prev) =>
      prev.map((s) => (s.id === tenantId ? { ...s, isApproved: false, status: 'suspended' } : s))
    );
    logAction(
      'TENANT_REJECTED',
      'مهندس حسینی (Super Admin)',
      'super_admin',
      `رد مدارک سالن ${tenantId}`,
      'warning'
    );
    showToast('پرونده سالن رد گردید.');
  };

  const handleToggleTenantStatus = (tenantId: string) => {
    setSalons((prev) =>
      prev.map((s) => {
        if (s.id === tenantId) {
          const nextStatus = s.status === 'active' ? 'suspended' : 'active';
          logAction(
            'TENANT_STATUS_TOGGLED',
            'Super Admin',
            'super_admin',
            `تغییر وضعیت سالن ${s.name} به ${nextStatus}`,
            'warning'
          );
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
    showToast('وضعیت سالن به‌روز شد.');
  };

  // Search Ranking & VIP Configuration Handler
  const handleUpdateSalonPriority = (salonId: string, updates: Partial<Salon>) => {
    setSalons((prev) =>
      prev.map((s) => (s.id === salonId ? { ...s, ...updates } : s))
    );
    const target = salons.find((s) => s.id === salonId);
    const vipText = updates.isVip !== undefined ? (updates.isVip ? 'ارتقا به سالن VIP' : 'حذف وضعیت VIP') : '';
    const priorityText = updates.displayPriority !== undefined ? `رتبه اولویت ${updates.displayPriority}` : '';
    logAction(
      'SALON_SEARCH_RANKING_UPDATED',
      'مهندس حسینی (Super Admin)',
      'super_admin',
      `به‌روزرسانی رتبه و اولویت نمایش سالن «${target?.name || salonId}»: ${vipText} ${priorityText}`,
      'security'
    );
    showToast(`ترتیب نمایش سالن «${target?.name || salonId}» در نتایج جستجو به‌روز شد.`);
  };

  const handleUpdateUserRole = (userId: string, newRole: any) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          logAction(
            'USER_ROLE_CHANGED',
            'Super Admin',
            'super_admin',
            `تغییر نقش کاربر ${u.name} به ${newRole}`,
            'security'
          );
          return { ...u, role: newRole };
        }
        return u;
      })
    );
    showToast('نقش کاربر تغییر یافت.');
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.status === 'active' ? 'suspended' : 'active';
          logAction('USER_STATUS_TOGGLED', 'Super Admin', 'super_admin', `تغییر وضعیت کاربر ${u.name} به ${nextStatus}`, 'warning');
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
    showToast('وضعیت دسترسی کاربر تغییر یافت.');
  };

  const handleAddUser = (newUser: PlatformUser) => {
    setUsers((prev) => [newUser, ...prev]);
    logAction('USER_CREATED', 'Super Admin', 'super_admin', `ثبت کاربر جدید ${newUser.name} با نقش ${newUser.role}`);
    showToast('کاربر جدید با موفقیت اضافه شد.');
  };

  const handleToggleSpecialistVerified = (specialistId: string) => {
    setSalons((prev) =>
      prev.map((sal) => ({
        ...sal,
        specialists: sal.specialists.map((sp) => {
          if (sp.id === specialistId) {
            const nextVerified = !sp.verified;
            logAction(
              'SPECIALIST_VERIFICATION_TOGGLED',
              'Super Admin',
              'super_admin',
              `تغییر وضعیت تاییدیه متخصص ${sp.name} به ${nextVerified ? 'تایید شده' : 'لغو تایید'}`
            );
            return { ...sp, verified: nextVerified };
          }
          return sp;
        }),
      }))
    );
    showToast('نشان تاییدیه رسمی متخصص به‌روز شد.');
  };

  const handleReplyTicket = (ticketId: string, replyText: string, newStatus: 'in_progress' | 'resolved' = 'in_progress') => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updated: SupportTicket = {
            ...t,
            status: newStatus,
            lastReply: replyText,
            messages: [
              ...t.messages,
              {
                sender: 'admin',
                senderName: 'مدیر ارشد سامانه بویا (Admin)',
                text: replyText,
                time: 'هم‌اکنون',
              },
            ],
          };
          logAction('SUPPORT_TICKET_REPLIED', 'Admin Desk', 'admin', `پاسخ به تیکت شماره ${ticketId}`);
          return updated;
        }
        return t;
      })
    );
    showToast('پاسخ تیکت ارسال و به کاربر ابلاغ گردید.');
  };

  // Wishlist toggle
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
  const pendingApprovalsCount = salons.filter((s) => !s.isApproved).length;

  return (
    <div className="min-h-screen bg-[#E7E2DA] flex flex-col selection:bg-[#D9A2B0] selection:text-[#173B3F]">
      {/* If Admin Panel Mode: Render the full-screen desktop web dashboard */}
      {appMode === 'admin_panel' ? (
        <div className="flex flex-col h-screen">
          <Header
            appMode={appMode}
            onToggleAppMode={handleSwitchAppMode}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            selectedProvince={selectedProvince}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
            hasGpsActive={!!customerLocation.coords}
            isMobileFrame={isMobileFrame}
            onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
            activeBookingsCount={activeBookingsCount}
            pendingApprovalsCount={pendingApprovalsCount}
            liveBackendStatus={liveBackendStatus}
          />

          <div className="flex-1 overflow-hidden">
            <AdminPanel
              salons={salons}
              bookings={bookings}
              users={users}
              tickets={tickets}
              auditLogs={auditLogs}
              onApproveTenant={handleApproveTenant}
              onRejectTenant={handleRejectTenant}
              onToggleTenantStatus={handleToggleTenantStatus}
              onUpdateSalonPriority={handleUpdateSalonPriority}
              onUpdateUserRole={handleUpdateUserRole}
              onToggleUserStatus={handleToggleUserStatus}
              onAddUser={handleAddUser}
              onToggleSpecialistVerified={handleToggleSpecialistVerified}
              onReplyTicket={handleReplyTicket}
              onSwitchToCustomerApp={() => handleSwitchAppMode('customer')}
              onSwitchToSalonApp={() => handleSwitchAppMode('salon_panel')}
            />
          </div>
        </div>
      ) : (
        /* Customer App or Salon App in standard layout (Mobile Viewport or Desktop) */
        <div className="flex justify-center w-full min-h-screen">
          <div
            className={`w-full bg-[#F7F3EE] min-h-screen text-[#1C1C1C] relative flex flex-col transition-all duration-300 ${
              isMobileFrame
                ? 'max-w-[430px] shadow-[0_0_50px_rgba(23,59,63,0.18)] my-0 sm:my-6 sm:rounded-[36px] overflow-hidden border-0 sm:border-[8px] sm:border-[#173B3F]'
                : 'max-w-6xl shadow-sm'
            }`}
          >
            {/* Top Header */}
            <Header
              appMode={appMode}
              onToggleAppMode={handleSwitchAppMode}
              selectedCity={selectedCity}
              onSelectCity={setSelectedCity}
              selectedProvince={selectedProvince}
              onOpenLocationModal={() => setIsLocationModalOpen(true)}
              hasGpsActive={!!customerLocation.coords}
              isMobileFrame={isMobileFrame}
              onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
              activeBookingsCount={activeBookingsCount}
              pendingApprovalsCount={pendingApprovalsCount}
              liveBackendStatus={liveBackendStatus}
            />

            {/* Main Content Area */}
            <main className="flex-1 px-4 pt-4 pb-20">
              {appMode === 'salon_panel' ? (
                /* Salon & Specialist App */
                <SalonAdminDashboard
                  onSwitchToCustomerApp={() => setAppMode('customer')}
                  bookings={bookings}
                  onUpdateBookingStatus={handleUpdateBookingStatus}
                  onUpdateSalon={handleUpdateSalon}
                  salons={salons}
                />
              ) : (
                /* Customer App */
                <>
                  {activeTab === 'home' && (
                    <HomeScreen
                      salons={salons}
                      bookings={bookings}
                      onNavigateToSalons={(serviceLineId) => {
                        if (serviceLineId) setTargetServiceLine(serviceLineId);
                        setActiveTab('salons');
                      }}
                      onBookSalon={handleStartBooking}
                      onViewSpecialistPortfolio={handleViewSpecialistPortfolio}
                      savedSalonIds={savedSalonIds}
                      onToggleWishlistSalon={handleToggleWishlistSalon}
                      selectedCity={selectedCity}
                      selectedProvince={selectedProvince}
                      customerLocation={customerLocation}
                      onOpenLocationModal={() => setIsLocationModalOpen(true)}
                    />
                  )}

                  {activeTab === 'salons' && (
                    <SalonsScreen
                      salons={salons}
                      initialServiceLine={targetServiceLine}
                      onBookSalon={handleStartBooking}
                      onViewSpecialistPortfolio={handleViewSpecialistPortfolio}
                      savedSalonIds={savedSalonIds}
                      onToggleWishlistSalon={handleToggleWishlistSalon}
                      selectedProvince={selectedProvince}
                      onSelectProvince={setSelectedProvince}
                      selectedCity={selectedCity}
                      onSelectCity={setSelectedCity}
                      selectedDistrict={selectedDistrict}
                      onSelectDistrict={setSelectedDistrict}
                      customerLocation={customerLocation}
                      onUpdateCustomerLocation={setCustomerLocation}
                      maxDistanceKm={maxDistanceKm}
                      onSelectMaxDistance={setMaxDistanceKm}
                      sortByDistance={sortByDistance}
                      onToggleSortByDistance={setSortByDistance}
                      onOpenLocationModal={() => setIsLocationModalOpen(true)}
                    />
                  )}

                  {activeTab === 'bookings' && (
                    <BookingsScreen
                      bookings={bookings}
                      onCancelBooking={handleCancelBooking}
                      onNavigateToSalons={() => setActiveTab('salons')}
                      latestAlert={latestBookingAlert}
                      onUpdateBookingStatus={handleUpdateBookingStatus}
                    />
                  )}

                  {activeTab === 'saved' && (
                    <SavedScreen
                      salons={salons}
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

            {/* Location & GPS Selector Modal (31 Iranian Provinces, Counties, Districts & Haversine Distance) */}
            <LocationSelectorModal
              isOpen={isLocationModalOpen}
              onClose={() => setIsLocationModalOpen(false)}
              locationState={customerLocation}
              onUpdateLocation={setCustomerLocation}
              selectedProvince={selectedProvince}
              onSelectProvince={setSelectedProvince}
              selectedCity={selectedCity}
              onSelectCity={setSelectedCity}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={setSelectedDistrict}
              maxDistanceKm={maxDistanceKm}
              onSelectMaxDistance={setMaxDistanceKm}
              sortByDistance={sortByDistance}
              onToggleSortByDistance={setSortByDistance}
            />

            {/* Action Toast Feedback */}
            {toastMessage && (
              <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#173B3F] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-[#D9A2B0]/40 flex items-center gap-2 animate-bounce">
                <span className="w-2 h-2 rounded-full bg-[#6F9A8D]" />
                <span>{toastMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Animated BOYA Splash Screen & Loading Entrance Sequence */}
      <BoyaSplashScreen
        isOpen={showSplashScreen}
        appName={splashAppName}
        onFinish={() => setShowSplashScreen(false)}
      />
    </div>
  );
}
