import { create } from 'zustand';
import {
  Salon,
  Booking,
  PlatformUser,
  SupportTicket,
  AuditLogItem,
  INITIAL_SALONS,
  INITIAL_BOOKINGS,
  INITIAL_USERS,
  INITIAL_TICKETS,
  INITIAL_AUDIT_LOGS,
} from '../data/marketplaceData';

interface DataState {
  salons: Salon[];
  bookings: Booking[];
  users: PlatformUser[];
  tickets: SupportTicket[];
  auditLogs: AuditLogItem[];
  latestBookingAlert: any | null;

  setSalons: (salons: Salon[]) => void;
  setBookings: (bookings: Booking[]) => void;
  setUsers: (users: PlatformUser[]) => void;
  setTickets: (tickets: SupportTicket[]) => void;
  setAuditLogs: (logs: AuditLogItem[]) => void;
  setLatestBookingAlert: (alert: any) => void;
  
  updateBookingStatus: (bookingId: string, status: Booking['status']) => void;
  addBooking: (booking: Booking) => void;
  addAuditLog: (log: AuditLogItem) => void;
  updateSalon: (salonId: string, updates: Partial<Salon>) => void;
  
  logAction: (action: string, actorName: string, actorRole: string, details: string, level?: AuditLogItem['level']) => void;
  confirmBooking: (appointmentData: any) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  salons: INITIAL_SALONS,
  bookings: INITIAL_BOOKINGS,
  users: INITIAL_USERS,
  tickets: INITIAL_TICKETS,
  auditLogs: INITIAL_AUDIT_LOGS,
  latestBookingAlert: null,

  setSalons: (salons) => set({ salons }),
  setBookings: (bookings) => set({ bookings }),
  setUsers: (users) => set({ users }),
  setTickets: (tickets) => set({ tickets }),
  setAuditLogs: (auditLogs) => set({ auditLogs }),
  setLatestBookingAlert: (latestBookingAlert) => set({ latestBookingAlert }),

  updateBookingStatus: (bookingId, status) => {
    const targetBooking = get().bookings.find(b => b.id === bookingId);
    set((state) => ({
      bookings: state.bookings.map(b => b.id === bookingId ? { ...b, status } : b)
    }));
    
    if (targetBooking) {
      set({
        latestBookingAlert: {
          id: `alert-${Date.now()}`,
          bookingId,
          salonName: targetBooking.salonName,
          serviceName: targetBooking.serviceName,
          status,
          time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        }
      });
    }
  },
  
  addBooking: (booking) => set((state) => ({
    bookings: [booking, ...state.bookings]
  })),

  addAuditLog: (log) => set((state) => ({
    auditLogs: [log, ...state.auditLogs]
  })),

  updateSalon: (salonId, updates) => set((state) => ({
    salons: state.salons.map(s => s.id === salonId ? { ...s, ...updates } : s)
  })),

  logAction: (action, actorName, actorRole, details, level = 'info') => {
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
    set((state) => ({ auditLogs: [newLog, ...state.auditLogs] }));
  },

  confirmBooking: (appointmentData) => {
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

    get().addBooking(newBooking);
    get().logAction(
      'BOOKING_CREATED_SMS_DISPATCHED',
      appointmentData.customerName,
      'customer',
      `ثبت نوبت خدمت «${appointmentData.serviceName}» در ${appointmentData.salonName} و ارسال پیامک به ${appointmentData.customerPhone}`
    );
  }
}));
