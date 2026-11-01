
  id: string;
  name: string;
  price: number;
  duration: number; // minutes
  serviceLineId: string;
  category: string;
}

export interface TimeSlot {
  time: string;
  booked: boolean;
}

export interface AvailableSlot {
  date: string;
  slots: TimeSlot[];
}

export interface Specialist {
  id: string;
  name: string;
  role: string;
  avatar: string;
  specialtyLine: string;
  rating: number;
  reviewCount: number;
  portfolio: string[];
}

export interface Salon {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  avatar: string;
  province: string;
  city: string;
  district: string;
  address: string;
  rating: number;
  reviewCount: number;
  isVip: boolean;
  isVerified: boolean;
  hasMobileService: boolean;
  services: Service[];
  specialists: Specialist[];
  availableSlots: AvailableSlot[];
  tags: string[];
  openTime: string;
  closeTime: string;
  lat: number;
  lng: number;
}

export interface Booking {
  id: string;
  salonName: string;
  serviceName: string;
  specialistName: string;
  date: string;
  time: string;
  price: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  trackingCode: string;
}

export interface Province {
  id: string;
  name: string;
  cities: City[];
}

export interface City {
  id: string;
  name: string;
  districts: string[];
}

export type UserRole = 'customer' | 'salon_admin' | 'salon_specialist' | 'mobile_specialist' | 'line_manager' | 'super_admin';

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  avatar: string;
  isAuthenticated: boolean;
  salonId?: string; // شناسه سالن برای مدیران و متخصصین سالن
  specialistId?: string; // شناسه متخصص برای متخصصین سالن، سیار و مدیران لاین
}