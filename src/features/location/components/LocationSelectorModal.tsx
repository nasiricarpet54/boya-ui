import React, { useState } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Compass,
  Check,
  AlertCircle,
  RotateCcw,
  Sliders,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { IRAN_PROVINCES, GPS_PRESETS, Province, CountyCity } from '../../../shared/data/iranLocations';
import {
  CustomerLocationState,
  requestBrowserGeolocation,
  findNearestIranianRegion,
  formatDistancePersian,
} from '../../../shared/utils/geoUtils';
import { toPersianDigits } from '../../../shared/utils/persianUtils';

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationState: CustomerLocationState;
  onUpdateLocation: (newState: CustomerLocationState) => void;
  selectedProvince: string;
  onSelectProvince: (province: string) => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  maxDistanceKm: number | null; // null = all distances
  onSelectMaxDistance: (km: number | null) => void;
  sortByDistance: boolean;
  onToggleSortByDistance: (enabled: boolean) => void;
}

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  isOpen,
  onClose,
  locationState,
  onUpdateLocation,
  selectedProvince,
  onSelectProvince,
  selectedCity,
  onSelectCity,
  selectedDistrict,
  onSelectDistrict,
  maxDistanceKm,
  onSelectMaxDistance,
  sortByDistance,
  onToggleSortByDistance,
}) => {
  const [activeTab, setActiveTab] = useState<'gps' | 'cascading'>('gps');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Find currently selected province object to obtain its counties
  const currentProvinceObj = IRAN_PROVINCES.find((p) => p.name === selectedProvince);
  const currentCounties: CountyCity[] = currentProvinceObj ? currentProvinceObj.counties : [];
  const currentCountyObj = currentCounties.find((c) => c.name === selectedCity);
  const currentDistricts: string[] = currentCountyObj?.districts || [];

  // Handler for browser GPS acquisition
  const handleAcquireGPS = async () => {
    setIsLocating(true);
    setGpsError(null);
    try {
      const coords = await requestBrowserGeolocation();
      const nearest = findNearestIranianRegion(coords.lat, coords.lng);

      const label = nearest
        ? `GPS دقیق (${nearest.province.name}، ${nearest.county.name})`
        : `GPS فعال (${toPersianDigits(coords.lat.toFixed(4))}°, ${toPersianDigits(coords.lng.toFixed(4))}°)`;

      onUpdateLocation({
        coords,
        status: 'success',
        source: 'gps',
        label,
      });

      if (nearest) {
        onSelectProvince(nearest.province.name);
        onSelectCity(nearest.county.name);
      }
      onToggleSortByDistance(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در فعال‌سازی GPS';
      setGpsError(msg);
      onUpdateLocation({
        coords: locationState.coords,
        status: 'denied',
        source: locationState.source,
        label: locationState.label,
        errorMessage: msg,
      });
    } finally {
      setIsLocating(false);
    }
  };

  // Handler for applying simulation preset
  const handleApplyPreset = (preset: (typeof GPS_PRESETS)[0]) => {
    onUpdateLocation({
      coords: { lat: preset.lat, lng: preset.lng },
      status: 'simulated',
      source: 'preset',
      label: `موقعیت انتخابی: ${preset.name}`,
    });
    onSelectProvince(preset.province);
    onSelectCity(preset.city);
    onSelectDistrict(preset.district);
    onToggleSortByDistance(true);
    setGpsError(null);
  };

  const handleClearLocation = () => {
    onUpdateLocation({
      coords: null,
      status: 'idle',
      source: 'none',
      label: 'موقعیت تنظیم نشده',
    });
    onToggleSortByDistance(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] w-full sm:max-w-xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl border border-[#E7E2DA] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#173B3F] text-white p-4 sm:p-5 flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#D9A2B0] border border-white/10">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-serif text-white">
                تعیین موقعیت مکانی و فیلتر مسافت
              </h2>
              <p className="text-xs text-[#E8F0EF]/80">
                مشاهده سالن‌ها بر اساس فاصله، استان، شهر و منطقه
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#E7E2DA] bg-white px-4 pt-3 gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('gps')}
            className={`pb-2.5 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'gps'
                ? 'text-[#173B3F] border-b-2 border-[#173B3F]'
                : 'text-[#6C6C6C] hover:text-[#173B3F]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 rotate-45 text-[#173B3F]" />
            <span>مکان‌یابی با GPS و دوری/نزدیکی</span>
          </button>
          <button
            onClick={() => setActiveTab('cascading')}
            className={`pb-2.5 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'cascading'
                ? 'text-[#173B3F] border-b-2 border-[#173B3F]'
                : 'text-[#6C6C6C] hover:text-[#173B3F]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#6F9A8D]" />
            <span>انتخاب استان، شهرستان و محله (۳۱ استان)</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-right">
          {activeTab === 'gps' && (
            <div className="space-y-4">
              {/* GPS Activation Card */}
              <div className="bg-white rounded-2xl border border-[#E7E2DA] p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-[#173B3F] rotate-45" />
                      مکان‌یاب هوشمند دستگاه (GPS مرورگر)
                    </span>
                    <p className="text-[11px] text-[#6C6C6C] leading-relaxed">
                      با فعال کردن مکان‌یاب، فاصله دقیق تا هر سالن بر حسب کیلومتر محاسبه شده و نزدیک‌ترین سالن‌ها به شما نمایش داده می‌شوند.
                    </p>
                  </div>
                  {locationState.coords && (
                    <span className="bg-[#E8F0EF] text-[#173B3F] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#173B3F]/20 shrink-0">
                      GPS فعال است
                    </span>
                  )}
                </div>

                {/* GPS Trigger Button */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={handleAcquireGPS}
                    disabled={isLocating}
                    className="flex-1 h-11 px-4 rounded-xl bg-[#173B3F] text-white text-xs font-bold hover:bg-[#112D30] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#173B3F]/20 disabled:opacity-50"
                  >
                    {isLocating ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>در حال دریافت مختصات دقیق ماهواره‌ای...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4 rotate-45" />
                        <span>تعیین آنی مکان من با GPS</span>
                      </>
                    )}
                  </button>

                  {locationState.coords && (
                    <button
                      onClick={handleClearLocation}
                      className="h-11 px-3 rounded-xl border border-[#E7E2DA] bg-white text-xs text-[#8A3838] hover:bg-[#FDF2F2] transition-colors"
                      title="غیرفعال کردن فیلتر GPS"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Active GPS status view */}
                {locationState.coords && (
                  <div className="bg-[#E8F0EF]/70 rounded-xl p-3 border border-[#6F9A8D]/30 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#173B3F]">{locationState.label}</p>
                      <p className="text-[10px] text-[#6C6C6C] mt-0.5">
                        مختصات: {toPersianDigits(locationState.coords.lat.toFixed(4))} شمالی،{' '}
                        {toPersianDigits(locationState.coords.lng.toFixed(4))} شرقی
                        {locationState.coords.accuracy && ` (دقت: حدود ${toPersianDigits(Math.round(locationState.coords.accuracy))} متر)`}
                      </p>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2E5E52] animate-ping" />
                  </div>
                )}

                {/* Error Banner */}
                {gpsError && (
                  <div className="bg-[#FDF2F2] border border-[#F28B82] rounded-xl p-3 text-xs text-[#8A3838] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">عدم دسترسی به مکان‌یاب مرورگر</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">{gpsError}</p>
                      <p className="text-[10px] text-[#6C6C6C] mt-1">
                        می‌توانید یکی از مراکز پیشنهادی زیر را به عنوان مکان آزمایشی انتخاب کنید.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Distance Radius Filter (شعاع مسافت) */}
              <div className="bg-white rounded-2xl border border-[#E7E2DA] p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[#173B3F]" />
                    محدودیت شعاع مسافت (فاصله تا شما)
                  </span>
                  <span className="text-xs font-bold text-[#C99558]">
                    {maxDistanceKm === null ? 'همه فواصل (نامحدود)' : `تا حداکثر ${toPersianDigits(maxDistanceKm)} کیلومتر`}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { label: 'همه فواصل', value: null },
                    { label: 'تا ۳ ک‌م', value: 3 },
                    { label: 'تا ۵ ک‌م', value: 5 },
                    { label: 'تا ۱۰ ک‌م', value: 10 },
                    { label: 'تا ۲۵ ک‌م', value: 25 },
                    { label: 'تا ۵۰ ک‌م', value: 50 },
                  ].map((option) => {
                    const isSelected = maxDistanceKm === option.value;
                    return (
                      <button
                        key={String(option.value)}
                        onClick={() => onSelectMaxDistance(option.value)}
                        className={`h-9 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-sm'
                            : 'bg-white text-[#1C1C1C] border-[#E7E2DA] hover:border-[#173B3F]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#E7E2DA]/60">
                  <span className="text-xs text-[#1C1C1C] font-semibold">
                    مرتب‌سازی نتایج بر اساس دوری و نزدیکی (نزدیک‌ترین به شما):
                  </span>
                  <button
                    onClick={() => onToggleSortByDistance(!sortByDistance)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      sortByDistance ? 'bg-[#173B3F]' : 'bg-[#E7E2DA]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        sortByDistance ? 'translate-x-0' : '-translate-x-6'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Simulation Quick-Picks (موقعیت‌های پرطرفدار برای تست سریع) */}
              <div className="bg-white rounded-2xl border border-[#E7E2DA] p-4 shadow-sm space-y-2.5">
                <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C99558]" />
                  انتخاب سریع موقعیت شبیه‌سازی (تست فاصله در شهرهای مختلف):
                </span>
                <div className="flex flex-wrap gap-2">
                  {GPS_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleApplyPreset(preset)}
                      className="px-3 py-1.5 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] text-xs text-[#1C1C1C] hover:border-[#173B3F] hover:bg-[#E8F0EF] transition-all font-medium"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cascading' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-[#E7E2DA] p-4 shadow-sm space-y-4">
                <p className="text-xs text-[#6C6C6C]">
                  پوشش سراسری کلیه ۳۱ استان کشور و شهرستان‌های تابع. برای دسترسی دقیق‌تر منطقه یا محله موردنظر را نیز انتخاب نمایید.
                </p>

                {/* 1. استان (31 استان) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#173B3F]">
                    ۱. استان ({toPersianDigits(31)} استان فعال):
                  </label>
                  <div className="relative">
                    <select
                      value={selectedProvince}
                      onChange={(e) => {
                        const newProv = e.target.value;
                        onSelectProvince(newProv);
                        // Reset city & district to 'همه'
                        onSelectCity('همه');
                        onSelectDistrict('همه');
                      }}
                      className="w-full h-11 px-3 pl-8 rounded-xl bg-white border border-[#E7E2DA] text-xs text-[#1C1C1C] font-semibold focus:border-[#173B3F] outline-none appearance-none"
                    >
                      <option value="همه">همه استان‌های کشور ({toPersianDigits(31)} استان)</option>
                      {IRAN_PROVINCES.map((prov) => (
                        <option key={prov.id} value={prov.name}>
                          {prov.name} ({toPersianDigits(prov.counties.length)} شهرستان)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-3.5 w-4 h-4 text-[#6C6C6C] pointer-events-none" />
                  </div>
                </div>

                {/* 2. شهرستان / شهر */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#173B3F]">
                    ۲. شهرستان / شهر:
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCity}
                      disabled={selectedProvince === 'همه'}
                      onChange={(e) => {
                        onSelectCity(e.target.value);
                        onSelectDistrict('همه');
                      }}
                      className="w-full h-11 px-3 pl-8 rounded-xl bg-white border border-[#E7E2DA] text-xs text-[#1C1C1C] font-semibold focus:border-[#173B3F] outline-none appearance-none disabled:bg-[#F2EFE9] disabled:text-[#999]"
                    >
                      <option value="همه">
                        {selectedProvince === 'همه' ? 'ابتدا استان را مشخص نمایید' : 'همه شهرستان‌ها'}
                      </option>
                      {currentCounties.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-3.5 w-4 h-4 text-[#6C6C6C] pointer-events-none" />
                  </div>
                </div>

                {/* 3. منطقه / محله (Districts) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#173B3F]">
                    ۳. منطقه یا محله:
                  </label>
                  {currentDistricts.length > 0 ? (
                    <div className="relative">
                      <select
                        value={selectedDistrict}
                        onChange={(e) => onSelectDistrict(e.target.value)}
                        className="w-full h-11 px-3 pl-8 rounded-xl bg-white border border-[#E7E2DA] text-xs text-[#1C1C1C] font-semibold focus:border-[#173B3F] outline-none appearance-none"
                      >
                        <option value="همه">همه مناطق و محله‌های {selectedCity}</option>
                        {currentDistricts.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-3.5 w-4 h-4 text-[#6C6C6C] pointer-events-none" />
                    </div>
                  ) : (
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="نام محله یا خیابان (اختیاری)"
                        value={selectedDistrict === 'همه' ? '' : selectedDistrict}
                        onChange={(e) => onSelectDistrict(e.target.value || 'همه')}
                        className="w-full h-11 px-3 rounded-xl bg-white border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none placeholder:text-[#999]"
                      />
                    </div>
                  )}
                </div>

                {/* Summary bar */}
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E7E2DA] text-xs text-[#173B3F] flex items-center justify-between">
                  <span>موقعیت انتخابی شما:</span>
                  <span className="font-bold">
                    {selectedProvince === 'همه'
                      ? 'کل کشور'
                      : `${selectedProvince} ${selectedCity !== 'همه' ? `> ${selectedCity}` : ''} ${
                          selectedDistrict !== 'همه' ? `> ${selectedDistrict}` : ''
                        }`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-white border-t border-[#E7E2DA] p-4 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => {
              onSelectProvince('همه');
              onSelectCity('همه');
              onSelectDistrict('همه');
              onSelectMaxDistance(null);
              onToggleSortByDistance(false);
              onUpdateLocation({
                coords: null,
                status: 'idle',
                source: 'none',
                label: 'موقعیت تنظیم نشده',
              });
            }}
            className="text-xs text-[#6C6C6C] hover:text-[#8A3838] transition-colors font-medium px-2"
          >
            پاک کردن همه فیلترهای مکانی
          </button>

          <button
            onClick={onClose}
            className="h-11 px-6 rounded-xl bg-[#173B3F] text-white text-xs font-bold hover:bg-[#112D30] transition-all flex items-center gap-1.5 shadow-md shadow-[#173B3F]/20"
          >
            <Check className="w-4 h-4" />
            <span>اعمال و مشاهده سالن‌ها</span>
          </button>
        </div>
      </div>
    </div>
  );
};
