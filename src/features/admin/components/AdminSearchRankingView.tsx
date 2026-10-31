import React, { useState } from 'react';
import {
  Crown,
  ArrowUp,
  ArrowDown,
  Pin,
  Sparkles,
  Sliders,
  CheckCircle2,
  Search,
  Eye,
  Star,
  MapPin,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Salon } from '../../../shared/data/marketplaceData';
import { IRAN_PROVINCES } from '../../../shared/data/iranLocations';
import { toPersianDigits } from '../../../shared/utils/persianUtils';
import { sortSalonsForSearchResults } from '../../../shared/utils/salonRanking';

interface AdminSearchRankingViewProps {
  salons: Salon[];
  onUpdateSalonPriority: (salonId: string, updates: Partial<Salon>) => void;
  onReorderSalons?: (newOrderedSalons: Salon[]) => void;
}

export const AdminSearchRankingView: React.FC<AdminSearchRankingViewProps> = ({
  salons,
  onUpdateSalonPriority,
  onReorderSalons,
}) => {
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [testSearchQuery, setTestSearchQuery] = useState<string>('');
  const [editingSalonId, setEditingSalonId] = useState<string | null>(null);
  const [customBadgeInput, setCustomBadgeInput] = useState<string>('');

  // Salons sorted by current search ranking logic
  const sortedSalons = sortSalonsForSearchResults(salons);

  const filteredSalons = sortedSalons.filter((s) => {
    if (cityFilter !== 'all' && !s.province.includes(cityFilter) && !s.city.includes(cityFilter)) {
      return false;
    }
    return true;
  });

  const vipSalonsCount = salons.filter((s) => s.isVip).length;
  const topRankedSalon = sortedSalons[0];

  // Move salon up in priority
  const handleMoveUp = (salon: Salon, currentIndex: number) => {
    if (currentIndex <= 0) return;
    const prevSalon = filteredSalons[currentIndex - 1];
    
    // Swap or recalculate priority
    const currentPriority = salon.displayPriority ?? (currentIndex + 1);
    const prevPriority = prevSalon.displayPriority ?? currentIndex;

    // Ensure salon moves above prevSalon
    const newPriority = Math.max(1, prevPriority - 1);
    onUpdateSalonPriority(salon.id, {
      isVip: true, // promote to VIP if moving to top
      displayPriority: newPriority,
    });
    // Adjust prevSalon to have higher number
    onUpdateSalonPriority(prevSalon.id, {
      displayPriority: newPriority + 1,
    });
  };

  // Move salon down in priority
  const handleMoveDown = (salon: Salon, currentIndex: number) => {
    if (currentIndex >= filteredSalons.length - 1) return;
    const nextSalon = filteredSalons[currentIndex + 1];

    const currentPriority = salon.displayPriority ?? (currentIndex + 1);
    const nextPriority = nextSalon.displayPriority ?? (currentIndex + 2);

    onUpdateSalonPriority(salon.id, {
      displayPriority: nextPriority + 1,
    });
    onUpdateSalonPriority(nextSalon.id, {
      displayPriority: currentPriority,
    });
  };

  // Quick Pin to Top (رتبه ۱ مطلق)
  const handlePinToTop = (salonId: string) => {
    onUpdateSalonPriority(salonId, {
      isVip: true,
      displayPriority: 1,
      vipBadgeLabel: 'سالن برگزیده VIP بویا',
    });

    // Shift other VIP salons down
    salons
      .filter((s) => s.id !== salonId && s.isVip)
      .forEach((s, idx) => {
        onUpdateSalonPriority(s.id, {
          displayPriority: idx + 2,
        });
      });
  };

  // Toggle VIP Status
  const handleToggleVip = (salon: Salon) => {
    const nextVip = !salon.isVip;
    onUpdateSalonPriority(salon.id, {
      isVip: nextVip,
      displayPriority: nextVip ? 1 : 99,
      vipBadgeLabel: nextVip ? (salon.vipBadgeLabel || 'سالن برگزیده VIP') : undefined,
    });
  };

  // Save custom badge label
  const handleSaveCustomBadge = (salonId: string) => {
    onUpdateSalonPriority(salonId, {
      vipBadgeLabel: customBadgeInput.trim() || 'سالن برگزیده VIP',
    });
    setEditingSalonId(null);
  };

  // Customer Preview Filter
  const customerPreviewSalons = sortedSalons.filter((s) => {
    if (cityFilter !== 'all' && !s.province.includes(cityFilter) && !s.city.includes(cityFilter)) {
      return false;
    }
    if (testSearchQuery.trim()) {
      const q = testSearchQuery.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(q);
      const matchDistrict = s.district.toLowerCase().includes(q);
      const matchService = s.services.some((srv) => srv.name.toLowerCase().includes(q));
      if (!matchName && !matchDistrict && !matchService) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Explanation Banner */}
      <div className="bg-white rounded-3xl p-6 border border-[#E7E2DA] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBF4EC] border border-[#C99558]/40 text-[#8C5526] text-xs font-bold mb-2">
            <Crown className="w-4 h-4 text-[#C99558]" />
            <span>مدیریت موتور چیدمان و سئوی نتایج جستجو (Search Ranking & VIP Engine)</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#173B3F] font-serif">
            مدیریت ترتیب نمایش سالن‌ها و اولویت‌بندی سالن‌های VIP
          </h2>
          <p className="text-xs text-[#6C6C6C] mt-1 max-w-2xl leading-relaxed">
            سالن‌هایی که نشان VIP دارند همواره در صدر نتایج جستجوی مشتریان قرار می‌گیرند. شما می‌توانید رتبه ترتیبی سالن‌های VIP را جابجا کنید، سالن‌های جدید را با یک کلیک پین نمایید یا نشان اختصاصی برای آن‌ها تعریف کنید.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-10 px-3.5 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] text-xs font-bold text-[#173B3F] focus:border-[#173B3F] outline-none shadow-xs"
          >
            <option value="all">همه ۳۱ استان و شهرستان‌ها</option>
            {IRAN_PROVINCES.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E7E2DA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#6C6C6C] block">تعداد سالن‌های VIP فعال</span>
            <span className="text-xl font-extrabold text-[#8C5526] flex items-center gap-1.5 mt-0.5">
              <Crown className="w-5 h-5 text-[#C99558]" />
              <span>{toPersianDigits(vipSalonsCount)} سالن</span>
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#FBF4EC] text-[#C99558] text-xs font-bold">
            صدرنشین
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E2DA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#6C6C6C] block">رتبه ۱ در نتایج جستجو</span>
            <span className="text-sm font-bold text-[#173B3F] truncate max-w-[150px] block mt-1">
              {topRankedSalon ? topRankedSalon.name : '—'}
            </span>
          </div>
          <span className="w-8 h-8 rounded-xl bg-[#173B3F] text-[#D9A2B0] flex items-center justify-center font-bold text-xs">
            #۱
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E2DA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#6C6C6C] block">وضعیت الگوریتم جستجو</span>
            <span className="text-xs font-bold text-[#2E5E52] flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-4 h-4 text-[#6F9A8D]" />
              <span>VIP Priority Active</span>
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#EAF2EF] text-[#2E5E52] text-[10px] font-bold border border-[#6F9A8D]/40">
            روشن
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E2DA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#6C6C6C] block">کل سالن‌های تایید شده</span>
            <span className="text-xl font-extrabold text-[#173B3F] mt-0.5 block">
              {toPersianDigits(salons.length)} مرکز
            </span>
          </div>
          <span className="px-2 py-1 rounded-lg bg-slate-100 text-[#6C6C6C] text-xs font-semibold">
            پوشش کشوری
          </span>
        </div>
      </div>

      {/* Main Ranking Table & Management */}
      <div className="bg-white rounded-3xl border border-[#E7E2DA] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E7E2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2]">
          <div>
            <h3 className="text-sm font-bold text-[#173B3F] font-serif flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#173B3F]" />
              <span>جدول رتبه‌بندی و ترتیب نمایش در اپلیکیشن بویا</span>
            </h3>
            <p className="text-[11px] text-[#6C6C6C] mt-0.5">
              ترتیب سطرهای زیر عیناً تقدم و تاخر سالن‌ها در صفحه جستجوی مشتریان را تعیین می‌کند.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF4EC] text-[#8C5526] border border-[#C99558]/30 font-semibold">
              <Crown className="w-3 h-3 text-[#C99558]" />
              <span>سالن‌های VIP در بالاترین ردیف‌ها قرار دارند</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2]/80 text-[#173B3F] border-b border-[#E7E2DA] font-bold">
              <tr>
                <th className="p-3.5 w-16 text-center">رتبه</th>
                <th className="p-3.5">وضعیت VIP</th>
                <th className="p-3.5">سالن زیبایی</th>
                <th className="p-3.5">موقعیت و شهر</th>
                <th className="p-3.5">نشان ویژه (VIP Badge)</th>
                <th className="p-3.5 text-center">اولویت عددی</th>
                <th className="p-3.5 text-center">تنظیم ترتیب</th>
                <th className="p-3.5 text-center">عملیات سریع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2DA]/60">
              {filteredSalons.map((salon, index) => {
                const isEditingThis = editingSalonId === salon.id;

                return (
                  <tr
                    key={salon.id}
                    className={`transition-colors ${
                      salon.isVip
                        ? 'bg-[#FFFDF9] hover:bg-[#FAF7F2]'
                        : 'hover:bg-[#FAF7F2]/40'
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-bold text-xs ${
                          index === 0
                            ? 'bg-[#C99558] text-[#173B3F] ring-2 ring-[#C99558]/30 shadow-xs'
                            : index === 1
                            ? 'bg-[#173B3F] text-[#D9A2B0]'
                            : index === 2
                            ? 'bg-[#0F3232] text-white'
                            : 'bg-slate-100 text-[#6C6C6C]'
                        }`}
                      >
                        {toPersianDigits(index + 1)}
                      </span>
                    </td>

                    {/* VIP Toggle Switch */}
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleVip(salon)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shadow-xs ${
                          salon.isVip
                            ? 'bg-gradient-to-r from-[#C99558] to-[#D4925A] text-[#173B3F] border border-[#FBF4EC]'
                            : 'bg-slate-100 hover:bg-slate-200 text-[#6C6C6C] border border-slate-200'
                        }`}
                      >
                        <Crown
                          className={`w-3.5 h-3.5 ${
                            salon.isVip ? 'fill-[#173B3F] text-[#173B3F]' : 'text-slate-400'
                          }`}
                        />
                        <span>{salon.isVip ? 'VIP فعال' : 'عادی'}</span>
                      </button>
                    </td>

                    {/* Salon Info */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={salon.coverImage}
                          alt={salon.name}
                          className="w-10 h-10 rounded-xl object-cover border border-[#E7E2DA]"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#173B3F] text-xs">
                              {salon.name}
                            </span>
                            {salon.isVip && (
                              <Crown className="w-3.5 h-3.5 text-[#C99558] fill-[#C99558]" />
                            )}
                          </div>
                          <span className="text-[10px] text-[#6C6C6C] block font-mono">
                            {salon.tenantId} · {toPersianDigits(salon.rating.toFixed(2))} ★
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="p-3.5">
                      <span className="text-[#1C1C1C] font-medium block">
                        {salon.city}، {salon.district}
                      </span>
                      <span className="text-[10px] text-[#6C6C6C] block truncate max-w-[140px]">
                        {salon.address}
                      </span>
                    </td>

                    {/* VIP Badge Title */}
                    <td className="p-3.5">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={customBadgeInput}
                            onChange={(e) => setCustomBadgeInput(e.target.value)}
                            placeholder="عنوان نشان VIP..."
                            className="h-8 px-2 rounded-lg border border-[#173B3F] text-xs w-36 outline-none bg-white"
                          />
                          <button
                            onClick={() => handleSaveCustomBadge(salon.id)}
                            className="h-8 px-2 bg-[#173B3F] text-white rounded-lg text-xs"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                              salon.isVip
                                ? 'bg-[#FBF4EC] text-[#8C5526] border border-[#C99558]/30'
                                : 'text-slate-400 italic'
                            }`}
                          >
                            {salon.vipBadgeLabel || (salon.isVip ? 'سالن برگزیده VIP' : 'ندارد')}
                          </span>
                          {salon.isVip && (
                            <button
                              onClick={() => {
                                setEditingSalonId(salon.id);
                                setCustomBadgeInput(salon.vipBadgeLabel || 'سالن برگزیده VIP');
                              }}
                              className="text-[10px] text-[#173B3F] font-bold hover:underline"
                            >
                              ویرایش
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Numeric Priority Input */}
                    <td className="p-3.5 text-center">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={salon.displayPriority ?? (index + 1)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            onUpdateSalonPriority(salon.id, { displayPriority: val });
                          }
                        }}
                        className="w-14 h-8 text-center rounded-lg border border-[#E7E2DA] focus:border-[#173B3F] outline-none font-bold text-xs bg-white text-[#1C1C1C]"
                      />
                    </td>

                    {/* Move Up / Down Buttons */}
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E7E2DA]">
                        <button
                          onClick={() => handleMoveUp(salon, index)}
                          disabled={index === 0}
                          title="انتقال به رتبه بالاتر"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#173B3F] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleMoveDown(salon, index)}
                          disabled={index === filteredSalons.length - 1}
                          title="انتقال به رتبه پایین‌تر"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#173B3F] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Quick Pin to Top */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handlePinToTop(salon.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#173B3F] hover:text-white text-[#173B3F] border border-[#E7E2DA] text-[11px] font-bold flex items-center gap-1 mx-auto transition-all"
                        title="پین فوری در صدر نتایج (رتبه ۱)"
                      >
                        <Pin className="w-3 h-3 text-[#C99558]" />
                        <span>پین در صدر #۱</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Customer Search Simulator (پیش‌نمایش زنده از نگاه مشتری) */}
      <div className="bg-gradient-to-br from-[#FAF7F2] to-[#E8F0EF]/60 rounded-3xl p-5 border border-[#E7E2DA] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E2DA] pb-3">
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8C5526] mb-0.5">
              <Eye className="w-3.5 h-3.5 text-[#C99558]" />
              <span>شبیه‌ساز زنده جستجوی مشتری (Customer App Simulation)</span>
            </div>
            <h4 className="text-sm font-bold text-[#173B3F]">
              پیش‌نمایش نتایج جستجو با اولویت‌بندی فعلی سالن‌های VIP
            </h4>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-[#173B3F]" />
            <input
              type="text"
              placeholder="تست عبارت جستجو..."
              value={testSearchQuery}
              onChange={(e) => setTestSearchQuery(e.target.value)}
              className="w-full h-9 pr-9 pl-3 rounded-xl bg-white border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {customerPreviewSalons.slice(0, 3).map((salon, i) => (
            <div
              key={salon.id}
              className={`p-3.5 rounded-2xl bg-white border transition-all ${
                salon.isVip
                  ? 'border-[#C99558] ring-1 ring-[#C99558]/30 shadow-xs'
                  : 'border-[#E7E2DA]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#173B3F] text-white">
                  نتیجه #{toPersianDigits(i + 1)}
                </span>
                {salon.isVip && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8C5526] bg-[#FBF4EC] border border-[#C99558]/30 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3 text-[#C99558]" />
                    <span>{salon.vipBadgeLabel || 'سالن VIP'}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <img
                  src={salon.coverImage}
                  alt={salon.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-[#173B3F] truncate">{salon.name}</h5>
                  <p className="text-[10px] text-[#6C6C6C] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{salon.city}، {salon.district}</span>
                  </p>
                  <p className="text-[10px] text-[#C99558] font-bold mt-0.5">
                    {toPersianDigits(salon.rating.toFixed(2))} ★ ({toPersianDigits(salon.reviewsCount)} نظر)
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
