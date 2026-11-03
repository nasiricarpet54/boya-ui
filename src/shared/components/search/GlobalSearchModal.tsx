import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Sparkles,
  Star,
  Clock,
  Car,
  ChevronLeft,
  User,
  CheckCircle2,
  History,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useSalons } from '../../api/queries';
import { useModalStore } from '../../stores/modalStore';
import { SERVICE_LINES, Salon, SalonService, Specialist } from '../../data/marketplaceData';
import { formatPrice, toPersianDigits } from '../../utils/persianUtils';
import { BeautyActivityIcon } from '../ui/BeautyActivityIcon';

type SearchTab = 'all' | 'salons' | 'services' | 'specialists';

const RECENT_SEARCHES_KEY = 'boya_recent_searches';
const MAX_RECENT_SEARCHES = 6;

const POPULAR_SEARCH_TERMS = [
  'کراتین و احیا',
  'کاشت ناخن ژل',
  'پاکسازی و فیشیال پوست',
  'میکاپ تخصصی عروس',
  'اکستنشن مژه اسپایکی',
  'خدمات زیبایی در محل',
  'کوپ ژورنالی',
  'رنگ و بالیاژ',
];

function normalizePersianText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[آأإ]/g, 'ا')
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface FlattenedService {
  service: SalonService;
  salon: Salon;
  serviceLineName: string;
}

interface FlattenedSpecialist {
  specialist: Specialist;
  salon: Salon;
  specialtyLineName: string;
}

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchModalOpen,
    searchInitialQuery,
    closeSearchModal,
    openBookingModal,
    openPortfolioModal,
    openQuickViewModal,
  } = useModalStore();

  const navigate = useNavigate();
  const { data: salons = [] } = useSalons();

  const [query, setQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [selectedServiceLineId, setSelectedServiceLineId] = useState<string>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Sync initial query when opened
  useEffect(() => {
    if (isSearchModalOpen) {
      if (searchInitialQuery) {
        setQuery(searchInitialQuery);
      }
      setActiveTab('all');
      setSelectedServiceLineId('all');
      setFocusedIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);

      // Load recent searches
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch {
        // ignore storage errors
      }
    }
  }, [isSearchModalOpen, searchInitialQuery]);

  // Global keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const { isSearchModalOpen, openSearchModal, closeSearchModal } = useModalStore.getState();
        if (isSearchModalOpen) {
          closeSearchModal();
        } else {
          openSearchModal();
        }
      } else if (e.key === 'Escape' && isSearchModalOpen) {
        e.preventDefault();
        closeSearchModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, closeSearchModal]);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter((s) => s !== term);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearAllRecent = () => {
    try {
      setRecentSearches([]);
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
  };

  // Only consider active & approved salons
  const activeSalons = useMemo(() => {
    return (salons || []).filter((salon: any) =>
      salon?.isApproved !== false &&
      salon?.isActive !== false &&
      (salon?.publicationStatus == null || salon.publicationStatus === 'active') &&
      (salon?.status == null || salon.status === 'active')
    );
  }, [salons]);

  // Map category line name helper
  const getLineName = (id: string) => {
    const found = SERVICE_LINES.find((l) => l.id === id);
    return found ? found.name : id;
  };

  // Filter salons, services, specialists based on query and selected category
  const searchResults = useMemo(() => {
    const normalizedQuery = normalizePersianText(query);
    const hasQuery = normalizedQuery.length > 0;
    const isCategoryFiltered = selectedServiceLineId !== 'all';

    // 1. Salons
    const matchingSalons = activeSalons.filter((salon) => {
      if (isCategoryFiltered) {
        const hasLineService = salon.services?.some((s: SalonService) => s.serviceLineId === selectedServiceLineId);
        const hasLineSpecialist = salon.specialists?.some((sp: Specialist) => sp.specialtyLine === selectedServiceLineId);
        if (!hasLineService && !hasLineSpecialist) return false;
      }

      if (!hasQuery) return isCategoryFiltered;

      const normName = normalizePersianText(salon.name);
      const normCity = normalizePersianText(salon.city);
      const normDistrict = normalizePersianText(salon.district);
      const normProvince = normalizePersianText(salon.province);
      const normAddress = normalizePersianText(salon.address);
      const normVip = normalizePersianText(salon.vipBadgeLabel || '');
      const normOwner = normalizePersianText(salon.ownerName || '');

      return (
        normName.includes(normalizedQuery) ||
        normCity.includes(normalizedQuery) ||
        normDistrict.includes(normalizedQuery) ||
        normProvince.includes(normalizedQuery) ||
        normAddress.includes(normalizedQuery) ||
        normVip.includes(normalizedQuery) ||
        normOwner.includes(normalizedQuery) ||
        salon.services?.some((s: SalonService) => normalizePersianText(s.name).includes(normalizedQuery)) ||
        salon.specialists?.some((sp: Specialist) => normalizePersianText(sp.name).includes(normalizedQuery))
      );
    });

    // 2. Services
    const matchingServices: FlattenedService[] = [];
    activeSalons.forEach((salon) => {
      (salon.services || []).forEach((service: SalonService) => {
        if (isCategoryFiltered && service.serviceLineId !== selectedServiceLineId) {
          return;
        }

        const lineName = getLineName(service.serviceLineId);
        if (!hasQuery) {
          if (isCategoryFiltered) {
            matchingServices.push({ service, salon, serviceLineName: lineName });
          }
          return;
        }

        const normName = normalizePersianText(service.name);
        const normDesc = normalizePersianText(service.description || '');
        const normLine = normalizePersianText(lineName);
        const normSalon = normalizePersianText(salon.name);
        const normDistrict = normalizePersianText(salon.district || '');

        if (
          normName.includes(normalizedQuery) ||
          normDesc.includes(normalizedQuery) ||
          normLine.includes(normalizedQuery) ||
          normSalon.includes(normalizedQuery) ||
          normDistrict.includes(normalizedQuery)
        ) {
          matchingServices.push({ service, salon, serviceLineName: lineName });
        }
      });
    });

    // 3. Specialists
    const matchingSpecialists: FlattenedSpecialist[] = [];
    activeSalons.forEach((salon) => {
      (salon.specialists || []).forEach((specialist: Specialist) => {
        if (isCategoryFiltered && specialist.specialtyLine !== selectedServiceLineId) {
          return;
        }

        const lineName = getLineName(specialist.specialtyLine);
        if (!hasQuery) {
          if (isCategoryFiltered) {
            matchingSpecialists.push({ specialist, salon, specialtyLineName: lineName });
          }
          return;
        }

        const normName = normalizePersianText(specialist.name);
        const normBio = normalizePersianText(specialist.bio || '');
        const normLine = normalizePersianText(lineName);
        const normSalon = normalizePersianText(salon.name);
        const normRole = normalizePersianText(specialist.role || '');

        if (
          normName.includes(normalizedQuery) ||
          normBio.includes(normalizedQuery) ||
          normLine.includes(normalizedQuery) ||
          normSalon.includes(normalizedQuery) ||
          normRole.includes(normalizedQuery)
        ) {
          matchingSpecialists.push({ specialist, salon, specialtyLineName: lineName });
        }
      });
    });

    return {
      salons: matchingSalons,
      services: matchingServices,
      specialists: matchingSpecialists,
      totalCount: matchingSalons.length + matchingServices.length + matchingSpecialists.length,
    };
  }, [activeSalons, query, selectedServiceLineId]);

  if (!isSearchModalOpen) return null;

  // Handlers for user interactions
  const handleSelectSalon = (salon: Salon) => {
    saveRecentSearch(salon.name);
    closeSearchModal();
    navigate({ to: '/salons', search: { q: salon.name } });
  };

  const handleQuickViewSalon = (salon: Salon, e: React.MouseEvent) => {
    e.stopPropagation();
    saveRecentSearch(salon.name);
    closeSearchModal();
    openQuickViewModal(salon);
  };

  const handleBookService = (item: FlattenedService, e?: React.MouseEvent) => {
    e?.stopPropagation();
    saveRecentSearch(item.service.name);
    closeSearchModal();

    // Pick specialist matching the service line or first specialist
    const matchedSpec =
      item.salon.specialists?.find((sp) => sp.specialtyLine === item.service.serviceLineId) ||
      item.salon.specialists?.[0];

    const firstDate = item.salon.availableSlots?.[0]?.date || 'شنبه ۵ آبان';
    const firstTime =
      item.salon.availableSlots?.[0]?.slots?.find((s) => !s.booked)?.time || '۱۱:۰۰';

    if (matchedSpec) {
      openBookingModal(item.salon, item.service, matchedSpec, firstDate, firstTime);
    } else {
      openQuickViewModal(item.salon);
    }
  };

  const handleSelectSpecialist = (item: FlattenedSpecialist, e?: React.MouseEvent) => {
    e?.stopPropagation();
    saveRecentSearch(item.specialist.name);
    closeSearchModal();
    openPortfolioModal(item.specialist, item.salon);
  };

  const handleSelectPopularOrRecent = (term: string) => {
    setQuery(term);
    saveRecentSearch(term);
    inputRef.current?.focus();
  };

  const handleSelectCategory = (lineId: string) => {
    if (selectedServiceLineId === lineId) {
      setSelectedServiceLineId('all');
    } else {
      setSelectedServiceLineId(lineId);
    }
  };

  const hasSearchTerm = query.trim().length > 0 || selectedServiceLineId !== 'all';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="جستجوی سراسری سالن‌ها، خدمات و متخصصین بویا"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-[#173B3F]/70 backdrop-blur-md animate-fadeIn"
      dir="rtl"
      onClick={closeSearchModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#FAF7F2] h-full sm:h-auto sm:max-h-[88vh] rounded-none sm:rounded-3xl border-0 sm:border border-[#E7E2DA] flex flex-col overflow-hidden shadow-2xl transition-all"
      >
        {/* Search Header Bar */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#E7E2DA] sticky top-0 z-20">
          <div className="relative flex items-center">
            <Search className="absolute right-4 w-5 h-5 text-[#173B3F]/50 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی سالن، نوع خدمت، نام متخصص، منطقه یا شهر..."
              aria-label="عبارت جستجو"
              className="w-full h-12 pr-12 pl-24 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] focus:border-[#173B3F] focus:bg-white focus:ring-2 focus:ring-[#173B3F]/10 outline-none text-xs sm:text-sm font-medium text-[#173B3F] placeholder:text-[#6C6C6C]/60 transition-all"
            />
            <div className="absolute left-3 flex items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  aria-label="پاک کردن متن"
                  className="p-1 rounded-full text-[#6C6C6C] hover:text-[#173B3F] hover:bg-[#E7E2DA]/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={closeSearchModal}
                aria-label="بستن پنجره جستجو"
                className="hidden sm:inline-flex items-center px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#E7E2DA] text-[11px] font-mono text-[#6C6C6C] hover:text-[#173B3F]"
              >
                Esc
              </button>
              <button
                type="button"
                onClick={closeSearchModal}
                aria-label="بستن پنجره جستجو"
                className="sm:hidden p-1.5 rounded-full text-[#173B3F] hover:bg-[#FAF7F2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Specialty Line Filters Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-3 pt-1 pb-0.5">
            <button
              onClick={() => setSelectedServiceLineId('all')}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedServiceLineId === 'all'
                  ? 'bg-[#173B3F] text-white border-[#173B3F]'
                  : 'bg-[#FAF7F2] text-[#6C6C6C] border-[#E7E2DA] hover:border-[#173B3F]/30 hover:text-[#173B3F]'
              }`}
            >
              همه لاین‌ها
            </button>
            {SERVICE_LINES.map((line) => {
              const isSelected = selectedServiceLineId === line.id;
              return (
                <button
                  key={line.id}
                  onClick={() => handleSelectCategory(line.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-[#173B3F] text-white border-[#173B3F]'
                      : 'bg-[#FAF7F2] text-[#6C6C6C] border-[#E7E2DA] hover:border-[#173B3F]/30 hover:text-[#173B3F]'
                  }`}
                >
                  <BeautyActivityIcon activityId={line.id as any} className="w-3.5 h-3.5" />
                  <span>{line.name}</span>
                </button>
              );
            })}
          </div>

          {/* Results Tabs when searching */}
          {hasSearchTerm && (
            <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-[#E7E2DA] text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`pb-1 font-bold transition-colors border-b-2 flex items-center gap-1 ${
                  activeTab === 'all'
                    ? 'border-[#173B3F] text-[#173B3F]'
                    : 'border-transparent text-[#6C6C6C] hover:text-[#173B3F]'
                }`}
              >
                <span>همه نتایج</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#173B3F]/10 text-[#173B3F]">
                  {toPersianDigits(searchResults.totalCount)}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('salons')}
                className={`pb-1 font-bold transition-colors border-b-2 flex items-center gap-1 ${
                  activeTab === 'salons'
                    ? 'border-[#173B3F] text-[#173B3F]'
                    : 'border-transparent text-[#6C6C6C] hover:text-[#173B3F]'
                }`}
              >
                <span>سالن‌ها</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#173B3F]/10 text-[#173B3F]">
                  {toPersianDigits(searchResults.salons.length)}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('services')}
                className={`pb-1 font-bold transition-colors border-b-2 flex items-center gap-1 ${
                  activeTab === 'services'
                    ? 'border-[#173B3F] text-[#173B3F]'
                    : 'border-transparent text-[#6C6C6C] hover:text-[#173B3F]'
                }`}
              >
                <span>خدمات</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#173B3F]/10 text-[#173B3F]">
                  {toPersianDigits(searchResults.services.length)}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('specialists')}
                className={`pb-1 font-bold transition-colors border-b-2 flex items-center gap-1 ${
                  activeTab === 'specialists'
                    ? 'border-[#173B3F] text-[#173B3F]'
                    : 'border-transparent text-[#6C6C6C] hover:text-[#173B3F]'
                }`}
              >
                <span>متخصصین</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#173B3F]/10 text-[#173B3F]">
                  {toPersianDigits(searchResults.specialists.length)}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6"
        >
          {/* Empty Search State: Popular & Recent */}
          {!hasSearchTerm && (
            <div className="space-y-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#6C6C6C]" />
                      <span>جستجوهای اخیر</span>
                    </span>
                    <button
                      onClick={clearAllRecent}
                      className="text-[11px] text-[#6C6C6C] hover:text-rose-600 transition-colors"
                    >
                      پاک کردن همه
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, index) => (
                      <div
                        key={index}
                        onClick={() => handleSelectPopularOrRecent(term)}
                        className="group inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E7E2DA] hover:border-[#173B3F] rounded-xl text-xs text-[#173B3F] cursor-pointer transition-all shadow-2xs"
                      >
                        <span>{term}</span>
                        <button
                          onClick={(e) => removeRecentSearch(term, e)}
                          aria-label={`حذف ${term} از تاریخچه`}
                          className="text-[#6C6C6C] hover:text-rose-600 p-0.5 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C99558]" />
                  <span>جستجوهای پرطرفدار</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCH_TERMS.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectPopularOrRecent(term)}
                      className="px-3 py-1.5 bg-white border border-[#E7E2DA] hover:border-[#173B3F] hover:bg-[#FAF7F2] rounded-xl text-xs text-[#173B3F] font-medium transition-all shadow-2xs"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Browse Categories Overview */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-[#173B3F] block">
                  دسترسی سریع به لاین‌های تخصصی بویا
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SERVICE_LINES.map((line) => (
                    <button
                      key={line.id}
                      onClick={() => handleSelectCategory(line.id)}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-[#E7E2DA] hover:border-[#173B3F] hover:shadow-xs transition-all text-right group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] flex items-center justify-center text-[#173B3F] group-hover:bg-[#173B3F] group-hover:text-white transition-colors">
                        <BeautyActivityIcon activityId={line.id as any} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#173B3F] truncate">{line.name}</div>
                        <div className="text-[10px] text-[#6C6C6C] truncate">{line.enName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Has Active Results */}
          {hasSearchTerm && (
            <>
              {/* No results notice */}
              {searchResults.totalCount === 0 && (
                <div className="text-center py-12 px-4 bg-white rounded-3xl border border-[#E7E2DA]">
                  <Search className="w-10 h-10 text-[#6C6C6C]/40 mx-auto mb-3" />
                  <p className="text-sm font-bold text-[#173B3F] mb-1">
                    نتیجه‌ای برای «{query || getLineName(selectedServiceLineId)}» یافت نشد.
                  </p>
                  <p className="text-xs text-[#6C6C6C]">
                    لطفاً املای کلمات را بررسی کنید یا عبارت عمومی‌تری جستجو نمایید.
                  </p>
                </div>
              )}

              {/* 1. Salons Section */}
              {(activeTab === 'all' || activeTab === 'salons') && searchResults.salons.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
                      <span>سالن‌های زیبایی</span>
                      <span className="text-[10px] text-[#6C6C6C]">
                        ({toPersianDigits(searchResults.salons.length)})
                      </span>
                    </h3>
                    {activeTab === 'all' && searchResults.salons.length > 3 && (
                      <button
                        onClick={() => setActiveTab('salons')}
                        className="text-[11px] font-bold text-[#C99558] hover:underline"
                      >
                        مشاهده همه ({toPersianDigits(searchResults.salons.length)})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {(activeTab === 'all' ? searchResults.salons.slice(0, 3) : searchResults.salons).map((salon) => (
                      <div
                        key={salon.id}
                        onClick={() => handleSelectSalon(salon)}
                        className="p-3.5 bg-white rounded-2xl border border-[#E7E2DA] hover:border-[#173B3F] hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-[#E7E2DA] shrink-0">
                            <img
                              src={salon.coverImage}
                              alt={salon.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {salon.isVip && (
                              <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#C99558] border border-white" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-[#173B3F] truncate group-hover:text-[#0F3232]">
                                {salon.name}
                              </h4>
                              {salon.vipBadgeLabel && (
                                <span className="text-[9px] font-bold text-[#C99558] bg-[#C99558]/10 px-1.5 py-0.5 rounded">
                                  {salon.vipBadgeLabel}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6C6C6C] flex items-center gap-1.5 mt-1">
                              <span>{salon.city} · {salon.district}</span>
                              <span>·</span>
                              <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {toPersianDigits(salon.rating || 5)}
                              </span>
                              <span>·</span>
                              <span>{toPersianDigits(salon.services?.length || 0)} خدمت</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => handleQuickViewSalon(salon, e)}
                            className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA] hover:bg-[#173B3F] hover:text-white hover:border-[#173B3F] text-[11px] font-bold text-[#173B3F] transition-all"
                          >
                            خدمات سریع
                          </button>
                          <ChevronLeft className="w-4 h-4 text-[#6C6C6C] group-hover:text-[#173B3F] group-hover:-translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 2. Services Section */}
              {(activeTab === 'all' || activeTab === 'services') && searchResults.services.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
                      <span>خدمات زیبایی</span>
                      <span className="text-[10px] text-[#6C6C6C]">
                        ({toPersianDigits(searchResults.services.length)})
                      </span>
                    </h3>
                    {activeTab === 'all' && searchResults.services.length > 4 && (
                      <button
                        onClick={() => setActiveTab('services')}
                        className="text-[11px] font-bold text-[#C99558] hover:underline"
                      >
                        مشاهده همه ({toPersianDigits(searchResults.services.length)})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {(activeTab === 'all' ? searchResults.services.slice(0, 4) : searchResults.services).map((item, idx) => (
                      <div
                        key={`${item.salon.id}-${item.service.id}-${idx}`}
                        onClick={() => handleBookService(item)}
                        className="p-3.5 bg-white rounded-2xl border border-[#E7E2DA] hover:border-[#173B3F] hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] flex items-center justify-center text-[#173B3F] shrink-0 group-hover:bg-[#173B3F] group-hover:text-[#D9A2B0] transition-colors">
                            <BeautyActivityIcon activityId={item.service.serviceLineId as any} className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-[#173B3F] truncate">
                                {item.service.name}
                              </h4>
                              {item.service.isMobileAvailable && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#2E5E52] bg-[#2E5E52]/10 px-1.5 py-0.5 rounded">
                                  <Car className="w-2.5 h-2.5" />
                                  در محل
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6C6C6C] flex items-center gap-1.5 mt-1">
                              <span className="font-medium text-[#173B3F]">{item.salon.name}</span>
                              <span>·</span>
                              <span>{item.serviceLineName}</span>
                              <span>·</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-[#6C6C6C]" />
                                {toPersianDigits(item.service.durationMinutes)} دقیقه
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-left">
                            <div className="text-xs sm:text-sm font-extrabold text-[#173B3F]">
                              {formatPrice(item.service.price)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleBookService(item, e)}
                            className="px-3 py-1.5 rounded-xl bg-[#D9A2B0] hover:bg-[#E6B5C0] text-[#173B3F] text-xs font-bold transition-all shadow-xs"
                          >
                            رزرو نوبت
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 3. Specialists Section */}
              {(activeTab === 'all' || activeTab === 'specialists') && searchResults.specialists.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
                      <span>متخصصین و آرایشگران</span>
                      <span className="text-[10px] text-[#6C6C6C]">
                        ({toPersianDigits(searchResults.specialists.length)})
                      </span>
                    </h3>
                    {activeTab === 'all' && searchResults.specialists.length > 3 && (
                      <button
                        onClick={() => setActiveTab('specialists')}
                        className="text-[11px] font-bold text-[#C99558] hover:underline"
                      >
                        مشاهده همه ({toPersianDigits(searchResults.specialists.length)})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(activeTab === 'all' ? searchResults.specialists.slice(0, 4) : searchResults.specialists).map((item, idx) => (
                      <div
                        key={`${item.salon.id}-${item.specialist.id}-${idx}`}
                        onClick={(e) => handleSelectSpecialist(item, e)}
                        className="p-3.5 bg-white rounded-2xl border border-[#E7E2DA] hover:border-[#173B3F] hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-[#E7E2DA] shrink-0 bg-[#FAF7F2] flex items-center justify-center font-bold text-xs text-[#173B3F]">
                            {item.specialist.avatar ? (
                              <img
                                src={item.specialist.avatar}
                                alt={item.specialist.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <User className="w-6 h-6 text-[#173B3F]/40" />
                            )}
                            {item.specialist.verified && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#173B3F] text-white flex items-center justify-center">
                                <CheckCircle2 className="w-2.5 h-2.5 text-[#D9A2B0]" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-[#173B3F] truncate">
                              {item.specialist.name}
                            </h4>
                            <div className="text-[11px] text-[#6C6C6C] mt-0.5 truncate">
                              <span>{item.specialtyLineName}</span>
                              <span> · </span>
                              <span>{item.salon.name}</span>
                            </div>
                            <div className="text-[10px] text-[#6F9A8D] font-bold mt-1 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{toPersianDigits(item.specialist.rating || 5)}</span>
                              <span>·</span>
                              <span>{toPersianDigits(item.specialist.experienceYears || 3)} سال سابقه</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleSelectSpecialist(item, e)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA] hover:bg-[#173B3F] hover:text-white hover:border-[#173B3F] text-[11px] font-bold text-[#173B3F] transition-all shrink-0"
                        >
                          نمونه‌کارها
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#E7E2DA] flex items-center justify-between text-xs text-[#6C6C6C]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2E5E52] animate-pulse" />
            <span className="text-[11px]">جستجوی لحظه‌ای در سراسر پایگاه داده بویا</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                closeSearchModal();
                navigate({ to: '/salons' });
              }}
              className="text-[11px] font-bold text-[#173B3F] hover:underline"
            >
              مشاهده فهرست کامل سالن‌ها
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
