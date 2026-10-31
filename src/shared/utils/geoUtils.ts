/**
 * Geolocation & Distance Calculation Utilities
 * High accuracy distance measurement using Haversine formula & Persian formatting
 */

import { toPersianDigits } from './persianUtils';
import { IRAN_PROVINCES, Province, CountyCity } from '../data/iranLocations';

export interface GeoCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

export interface CustomerLocationState {
  coords: GeoCoordinates | null;
  status: 'idle' | 'detecting' | 'success' | 'denied' | 'unsupported' | 'simulated';
  source: 'gps' | 'preset' | 'manual' | 'none';
  label: string; // e.g. "موقعیت GPS زنده (تهران، منطقه ۱)" or "پیش‌فرض: سعادت‌آباد"
  errorMessage?: string;
}

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Number(d.toFixed(2));
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Formats distance in Persian friendly units (meters for <1km, km with 1 decimal)
 */
export function formatDistancePersian(km: number): string {
  if (km === undefined || km === null || isNaN(km)) return '';
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${toPersianDigits(meters)} متر`;
  }
  return `${toPersianDigits(km.toFixed(1))} کیلومتر`;
}

/**
 * Request real device GPS from browser
 */
export function requestBrowserGeolocation(): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('مرورگر شما از تعیین موقعیت جغرافیایی پشتیبانی نمی‌کند.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let msg = 'دسترسی به مکان‌یاب امکان‌پذیر نشد.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'دسترسی به موقعیت مکانی (GPS) توسط کاربر رد شد. می‌توانید از موقعیت‌های شبیه‌سازی یا فیلتر استانی استفاده کنید.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'اطلاعات موقعیت مکانی در دسترس نیست.';
            break;
          case error.TIMEOUT:
            msg = 'زمان درخواست موقعیت مکانی به پایان رسید.';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Finds the nearest Iranian province & city to a given coordinate point
 */
export function findNearestIranianRegion(
  lat: number,
  lng: number
): { province: Province; county: CountyCity; distanceKm: number } | null {
  let closest: { province: Province; county: CountyCity; distanceKm: number } | null = null;
  let minDistance = Infinity;

  for (const province of IRAN_PROVINCES) {
    for (const county of province.counties) {
      const dist = calculateDistanceKm(lat, lng, county.centerLat, county.centerLng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = {
          province,
          county,
          distanceKm: dist,
        };
      }
    }
  }

  return closest;
}
