import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Salon } from '../../data/marketplaceData';
import { formatPrice, toPersianDigits } from '../../utils/persianUtils';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SalonMapProps {
  salons: { salon: Salon; distanceKm?: number }[];
  onSelectSalon?: (salon: Salon) => void;
  onBookNow?: (salon: Salon) => void;
}

export const SalonMap: React.FC<SalonMapProps> = ({ salons, onSelectSalon, onBookNow }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map centered on Tehran
      const map = L.map(mapRef.current, {
        center: [35.6892, 51.3890],
        zoom: 12,
        zoomControl: false,
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors | Boya Beauty Platform',
      }).addTo(map);

      // Add zoom control to top-left
      L.control.zoom({ position: 'topleft' }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (salons.length === 0) return;

    const latLngs: L.LatLngExpression[] = [];

    salons.forEach(({ salon, distanceKm }) => {
      const lat = Number(salon.latitude) || (35.6892 + (Math.random() - 0.5) * 0.1);
      const lng = Number(salon.longitude) || (51.3890 + (Math.random() - 0.5) * 0.1);
      latLngs.push([lat, lng]);

      // Custom HTML marker for BOYA salons
      const customIcon = L.divIcon({
        className: 'custom-boya-map-marker',
        html: `
          <div style="background-color: #173B3F; color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid #D9A2B0; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer;">
            ${salon.isVip ? '★ VIP' : 'بویا'}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      function escapeHtml(str: string = ''): string {
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      const safeName = escapeHtml(salon.name);
      const safeAddress = escapeHtml(salon.district || salon.address);
      const safeCoverImage = escapeHtml(salon.coverImage);

      const popupContent = document.createElement('div');
      popupContent.style.cssText = 'text-right; font-family: Vazirmatn, sans-serif; direction: rtl; min-width: 200px;';
      popupContent.innerHTML = `
        <div style="padding: 4px;">
          <img src="${safeCoverImage}" alt="${safeName}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 12px; margin-bottom: 8px;" />
          <h4 style="font-weight: bold; font-size: 13px; color: #173B3F; margin-bottom: 2px;">${safeName}</h4>
          <p style="font-size: 11px; color: #6C6C6C; margin-bottom: 6px;">${safeAddress}</p>
          ${distanceKm !== undefined ? `<span style="font-size: 10px; background: #EAF2EF; color: #2E5E52; padding: 2px 6px; border-radius: 6px; display: inline-block; margin-bottom: 6px;">فاصله: ${toPersianDigits(distanceKm.toFixed(1))} کیلومتر</span>` : ''}
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <button id="map-book-${salon.id}" style="flex: 1; background: #173B3F; color: white; border: none; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer;">رزرو نوبت</button>
          </div>
        </div>
      `;

      popupContent.querySelector(`#map-book-${salon.id}`)?.addEventListener('click', () => {
        if (onBookNow && salon.services?.[0] && salon.specialists?.[0]) {
          onBookNow(salon);
        }
      });

      marker.bindPopup(popupContent);
      markersLayer.addLayer(marker);
    });

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [salons, onBookNow]);

  return (
    <div className="relative w-full h-[380px] rounded-3xl overflow-hidden border border-[#E7E2DA] shadow-md">
      <div ref={mapRef} className="w-full h-full z-10" />
      <div className="absolute bottom-3 right-3 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E7E2DA] text-[11px] font-bold text-[#173B3F] shadow-sm">
        موقعیت سالن‌ها روی نقشه ({toPersianDigits(salons.length)} مرکز)
      </div>
    </div>
  );
};
