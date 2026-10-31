import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Users,
  Scissors,
  DollarSign,
  TrendingUp,
  Car,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  UserCheck,
  Eye,
  Camera,
  Image as ImageIcon,
  Heart,
  Star,
  MapPin,
  Phone,
  Layers,
  ArrowRight,
  Maximize2,
  X,
  Building2,
  Award,
  Briefcase
} from 'lucide-react';
import { SALONS, Salon, SalonService, Specialist, Booking, SpecialistPortfolio } from '../data/marketplaceData';
import { formatPrice, toPersianDigits } from '../utils/persianUtils';
import { BeautyActivityIcon } from './BeautyActivityIcon';

interface SalonAdminDashboardProps {
  onSwitchToCustomerApp: () => void;
  bookings: Booking[];
  onUpdateBookingStatus: (bookingId: string, newStatus: 'confirmed' | 'completed' | 'cancelled') => void;
  salons?: Salon[];
}

// Preset beauty images for quick service creation
const PRESET_SERVICE_PHOTOS = [
  { id: 'p-hair', label: 'مو و بالیاژ', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-keratin', label: 'کراتین و احیا', url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-facial', label: 'فیشیال پوست', url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-nail', label: 'کاشت ناخن', url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-lash', label: 'اکستنشن مژه', url: 'https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-bridal', label: 'شینیون عروس', url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-spa', label: 'اسپا و ماساژ', url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80' },
];

export const SalonAdminDashboard: React.FC<SalonAdminDashboardProps> = ({
  onSwitchToCustomerApp,
  bookings,
  onUpdateBookingStatus,
  salons = SALONS,
}) => {
  // Active test salon selection (allows switching among all test salons)
  const [selectedSalonId, setSelectedSalonId] = useState<string>(salons[0]?.id || 'salon-1');
  const currentSalon = salons.find((s) => s.id === selectedSalonId) || salons[0] || SALONS[0];

  const [salonTab, setSalonTab] = useState<'overview' | 'schedule' | 'gallery' | 'services' | 'specialists' | 'blocks'>('overview');

  // Dedicated Specialist View mode (allows testing individual specialist view)
  const [activeSpecialistView, setActiveSpecialistView] = useState<Specialist | null>(null);

  // Lightbox Modal state for full-screen beauty image inspection
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; category?: string; author?: string } | null>(null);

  // Local state for salon interior gallery
  const [salonGallery, setSalonGallery] = useState<string[]>(currentSalon.gallery || [currentSalon.coverImage]);
  const [isAddingGalleryImage, setIsAddingGalleryImage] = useState(false);
  const [newGalleryImageUrl, setNewGalleryImageUrl] = useState('');
  const [newGalleryImageTitle, setNewGalleryImageTitle] = useState('');

  // Local state for services
  const [salonServices, setSalonServices] = useState<SalonService[]>(currentSalon.services);
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState(1500000);
  const [newServiceDuration, setNewServiceDuration] = useState(60);
  const [newServiceMobile, setNewServiceMobile] = useState(true);
  const [newServiceLineId, setNewServiceLineId] = useState('hair');
  const [newServiceImage, setNewServiceImage] = useState(PRESET_SERVICE_PHOTOS[0].url);

  // Local state for specialists in this salon
  const [specialistsList, setSpecialistsList] = useState<Specialist[]>(currentSalon.specialists);

  // Local state for adding portfolio item to specialist
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);
  const [newPortfolioTitle, setNewPortfolioTitle] = useState('');
  const [newPortfolioCategory, setNewPortfolioCategory] = useState('رنگ و لایت');
  const [newPortfolioUrl, setNewPortfolioUrl] = useState('https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80');

  // Schedule blocks
  const [scheduleBlocks, setScheduleBlocks] = useState([
    { id: 'blk-1', date: 'شنبه ۵ آبان', time: '۱۲:۰۰ الی ۱۳:۰۰', reason: 'ضدعفونی تجهیزات و استراحت' },
    { id: 'blk-2', date: 'یکشنبه ۶ آبان', time: '۱۴:۰۰ الی ۱۵:۰۰', reason: 'جلسه هماهنگی کادر تخصصی' },
  ]);
  const [newBlockDate, setNewBlockDate] = useState('دوشنبه ۷ آبان');
  const [newBlockTime, setNewBlockTime] = useState('۱۳:۰۰ الی ۱۴:۰۰');
  const [newBlockReason, setNewBlockReason] = useState('رزرو اختصاصی VIP');

  // When salon switches, sync local state
  const handleSelectSalon = (salonId: string) => {
    setSelectedSalonId(salonId);
    const found = salons.find((s) => s.id === salonId);
    if (found) {
      setSalonGallery(found.gallery || [found.coverImage]);
      setSalonServices(found.services);
      setSpecialistsList(found.specialists);
      setActiveSpecialistView(null);
    }
  };

  // Filter bookings for current salon
  const salonBookings = bookings.filter((b) => b.tenantId === currentSalon.tenantId || b.salonName === currentSalon.name);
  const totalRevenue = salonBookings.reduce((sum, b) => (b.status !== 'cancelled' ? sum + b.price : sum), 0);
  const confirmedBookingsCount = salonBookings.filter((b) => b.status === 'confirmed').length;

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    const newServ: SalonService = {
      id: `serv-${Date.now()}`,
      serviceLineId: newServiceLineId,
      name: newServiceName.trim(),
      durationMinutes: Number(newServiceDuration),
      price: Number(newServicePrice),
      description: 'سرویس ثبت شده توسط مدیریت سالن در پلتفرم بویا',
      isMobileAvailable: newServiceMobile,
      imageUrl: newServiceImage,
    };

    setSalonServices([...salonServices, newServ]);
    setIsAddingService(false);
    setNewServiceName('');
  };

  const handleAddGalleryImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryImageUrl.trim()) return;
    setSalonGallery([newGalleryImageUrl.trim(), ...salonGallery]);
    setNewGalleryImageUrl('');
    setNewGalleryImageTitle('');
    setIsAddingGalleryImage(false);
  };

  const handleAddPortfolioItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSpecialistView || !newPortfolioTitle.trim() || !newPortfolioUrl.trim()) return;

    const newItem: SpecialistPortfolio = {
      id: `port-${Date.now()}`,
      title: newPortfolioTitle.trim(),
      imageUrl: newPortfolioUrl.trim(),
      category: newPortfolioCategory,
      likesCount: 1,
    };

    const updatedSpecialists = specialistsList.map((spec) => {
      if (spec.id === activeSpecialistView.id) {
        return {
          ...spec,
          portfolio: [newItem, ...spec.portfolio],
        };
      }
      return spec;
    });

    setSpecialistsList(updatedSpecialists);
    setActiveSpecialistView({
      ...activeSpecialistView,
      portfolio: [newItem, ...activeSpecialistView.portfolio],
    });

    setIsAddingPortfolio(false);
    setNewPortfolioTitle('');
  };

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleBlocks([
      ...scheduleBlocks,
      {
        id: `blk-${Date.now()}`,
        date: newBlockDate,
        time: newBlockTime,
        reason: newBlockReason,
      },
    ]);
  };

  return (
    <div className="space-y-5 pb-24 animate-fadeIn">
      {/* Test Salon Switcher Bar */}
      <div className="bg-white rounded-2xl p-3 border border-[#E7E2DA] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#173B3F]" />
          <span className="text-xs font-bold text-[#173B3F]">انتخاب سالن تست:</span>
          <select
            value={selectedSalonId}
            onChange={(e) => handleSelectSalon(e.target.value)}
            className="text-xs font-bold bg-[#FAF7F2] border border-[#E7E2DA] text-[#173B3F] rounded-xl px-2.5 py-1.5 outline-none focus:border-[#173B3F]"
          >
            {salons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.district || s.city}) {s.isVip ? '★ VIP' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#6C6C6C]">محیط تست پنل سالندار و متخصصین</span>
          <button
            onClick={onSwitchToCustomerApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D9A2B0] hover:bg-[#E6B5C0] text-[#173B3F] text-xs font-bold transition-all shadow-xs"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>مشاهده ویترین مشتری</span>
          </button>
        </div>
      </div>

      {/* DEDICATED SPECIALIST VIEW MODE (If a specialist is clicked) */}
      {activeSpecialistView ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#E7E2DA]">
            <button
              onClick={() => setActiveSpecialistView(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-[#173B3F] hover:text-[#0F3232]"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت به پنل مدیریت سالن</span>
            </button>
            <span className="text-xs font-bold text-[#2E5E52] bg-[#EAF2EF] px-2.5 py-1 rounded-full border border-[#6F9A8D]/30">
              حالت تست: پرتال اختصاصی بیوتیشن / متخصص
            </span>
          </div>

          {/* Specialist Hero Profile Card with High-Res Photography */}
          <div className="relative rounded-3xl overflow-hidden shadow-lg border border-[#6F9A8D]/40 bg-[#173B3F] text-white">
            <div className="absolute inset-0 bg-gradient-to-r from-[#173B3F] via-[#173B3F]/90 to-transparent z-0" />
            <img
              src={activeSpecialistView.portfolio[0]?.imageUrl || activeSpecialistView.avatar}
              alt={activeSpecialistView.name}
              className="absolute left-0 top-0 w-2/5 h-full object-cover opacity-30 blur-xs"
            />

            <div className="relative z-10 p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative">
                  <img
                    src={activeSpecialistView.avatar}
                    alt={activeSpecialistView.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-3 border-[#D9A2B0] shadow-md"
                  />
                  {activeSpecialistView.verified && (
                    <span className="absolute -bottom-1.5 -right-1.5 bg-[#6F9A8D] text-white p-1 rounded-full shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold font-serif text-white">
                      {activeSpecialistView.name}
                    </h2>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-[#D9A2B0] font-bold border border-white/20">
                      {activeSpecialistView.role}
                    </span>
                  </div>

                  <p className="text-xs text-[#E8F0EF] leading-relaxed max-w-xl">
                    {activeSpecialistView.bio}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                    <span className="flex items-center gap-1 text-[#C99558]">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-white">{toPersianDigits(activeSpecialistView.rating.toFixed(2))}</span>
                      <span className="text-[#E8F0EF]/70">({toPersianDigits(activeSpecialistView.reviewsCount)} نظر)</span>
                    </span>
                    <span className="text-white/40">•</span>
                    <span className="text-[#E8F0EF]">
                      {toPersianDigits(activeSpecialistView.experienceYears)} سال سابقه حرفه‌ای
                    </span>
                    <span className="text-white/40">•</span>
                    <span className="text-[#D9A2B0] font-mono text-xs">
                      {toPersianDigits(activeSpecialistView.phone)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specialist Performance Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-white/10 text-xs">
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">نوبت‌های رزرو شده:</span>
                  <span className="text-sm font-bold text-[#D9A2B0]">
                    {toPersianDigits(salonBookings.filter((b) => b.specialistName === activeSpecialistView.name).length)} مشتری
                  </span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">نمونه‌کارهای ژورنالی:</span>
                  <span className="text-sm font-bold text-white">{toPersianDigits(activeSpecialistView.portfolio.length)} تصویر</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">وضعیت پذیرش در محل:</span>
                  <span className="text-sm font-bold text-[#6F9A8D]">
                    {activeSpecialistView.isMobileSpecialist ? 'فعال (سیار)' : 'فقط سالن'}
                  </span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">سالن همکار:</span>
                  <span className="text-sm font-bold text-white truncate block">{currentSalon.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Specialist Portfolio Gallery Manager */}
          <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#D9A2B0]" />
                  <span>آلبوم نمونه‌کارهای تصویری و نتایج کار (Visual Portfolio)</span>
                </h3>
                <p className="text-xs text-[#6C6C6C] mt-0.5">
                  این تصاویر با کیفیت بالا در پروفایل عمومی شما در اپ مشتریان بویا نمایش داده می‌شود.
                </p>
              </div>

              <button
                onClick={() => setIsAddingPortfolio(!isAddingPortfolio)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-[#D9A2B0]" />
                <span>ثبت نمونه‌کار جدید</span>
              </button>
            </div>

            {/* Add Portfolio Form */}
            {isAddingPortfolio && (
              <form onSubmit={handleAddPortfolioItem} className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-3">
                <h4 className="text-xs font-bold text-[#173B3F]">بارگذاری عکس کار جدید</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="عنوان کار (مثال: بالیاژ شنی روی پایه ۹)"
                    value={newPortfolioTitle}
                    onChange={(e) => setNewPortfolioTitle(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs bg-white focus:border-[#173B3F] outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="دسته‌بندی (مثال: رنگ و لایت، ناخن)"
                    value={newPortfolioCategory}
                    onChange={(e) => setNewPortfolioCategory(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs bg-white focus:border-[#173B3F] outline-none"
                  />
                  <input
                    type="url"
                    required
                    placeholder="آدرس تصویر (URL)"
                    value={newPortfolioUrl}
                    onChange={(e) => setNewPortfolioUrl(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs bg-white focus:border-[#173B3F] outline-none font-mono"
                  />
                </div>

                {/* Preset image suggestions */}
                <div>
                  <span className="text-[11px] text-[#6C6C6C] block mb-1.5">یا انتخاب از تصاویر آماده باکیفیت:</span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {PRESET_SERVICE_PHOTOS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setNewPortfolioUrl(preset.url)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0 ${
                          newPortfolioUrl === preset.url
                            ? 'bg-[#173B3F] text-white border-[#173B3F]'
                            : 'bg-white text-[#1C1C1C] border-[#E7E2DA] hover:border-[#173B3F]'
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-4 h-4 rounded-full object-cover" />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232]"
                  >
                    افزودن به گالری نمونه‌کارها
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingPortfolio(false)}
                    className="px-4 py-2 rounded-full border border-slate-200 text-xs text-[#6C6C6C]"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            )}

            {/* Portfolio Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {activeSpecialistView.portfolio.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-2xl overflow-hidden border border-[#E7E2DA] bg-[#FAF7F2] shadow-xs hover:border-[#173B3F] transition-all cursor-pointer"
                  onClick={() =>
                    setLightboxImage({
                      url: item.imageUrl,
                      title: item.title,
                      category: item.category,
                      author: activeSpecialistView.name,
                    })
                  }
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] font-bold bg-[#173B3F]/80 text-white px-2 py-0.5 rounded-full backdrop-blur-xs">
                        {item.category}
                      </span>
                    </div>

                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-6 h-6 rounded-full bg-white/80 text-[#173B3F] flex items-center justify-center">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="absolute bottom-2 right-2 left-2 text-white">
                      <p className="text-xs font-bold line-clamp-1">{item.title}</p>
                      <div className="flex items-center justify-between text-[10px] text-[#E8F0EF] mt-0.5">
                        <span>{item.category}</span>
                        <span className="flex items-center gap-0.5 text-[#D9A2B0]">
                          <Heart className="w-3 h-3 fill-current" />
                          <span>{toPersianDigits(item.likesCount)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* SALON MANAGEMENT MAIN DASHBOARD */
        <>
          {/* Salon Identification Hero Card with Luxury Atmosphere Photography */}
          <div className="relative rounded-3xl overflow-hidden shadow-lg border border-[#6F9A8D]/40 bg-[#173B3F] text-white">
            {/* Background Cover Image with Soft Gradient Overlay */}
            <div className="absolute inset-0 z-0">
              <img
                src={currentSalon.coverImage}
                alt={currentSalon.name}
                className="w-full h-full object-cover opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#173B3F] via-[#173B3F]/90 to-[#173B3F]/75" />
            </div>

            <div className="relative z-10 p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-[#E8F0EF] bg-[#0F3232] px-2.5 py-0.5 rounded-full border border-[#6F9A8D]/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#6F9A8D]" />
                      <span>{currentSalon.isApproved ? 'سالندار تایید شده (Approved Tenant)' : 'در صف تایید ناظر'}</span>
                    </span>
                    {currentSalon.isVip && (
                      <span className="text-[10px] font-bold text-[#173B3F] bg-[#D9A2B0] px-2 py-0.5 rounded-full shadow-xs">
                        ★ {currentSalon.vipBadgeLabel || 'سالن VIP'}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-[#D9A2B0]">
                      شناسه: {currentSalon.tenantId}
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-bold font-serif text-white">
                    {currentSalon.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#E8F0EF]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#6F9A8D]" />
                      <span>{currentSalon.province}، {currentSalon.district} — {currentSalon.address}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[#C99558]">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-white">{toPersianDigits(currentSalon.rating.toFixed(2))}</span>
                      <span className="text-[#E8F0EF]/80">({toPersianDigits(currentSalon.reviewsCount)} نظر ثبت شده)</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => setSalonTab('gallery')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#D9A2B0]" />
                    <span>گالری فضا ({toPersianDigits(salonGallery.length)})</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-white/10 text-xs">
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">نوبت‌های جاری:</span>
                  <span className="text-sm font-bold text-[#D9A2B0]">
                    {toPersianDigits(salonBookings.length)} نوبت ({toPersianDigits(confirmedBookingsCount)} تایید شده)
                  </span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">برآورد کارکرد:</span>
                  <span className="text-sm font-bold text-white">{formatPrice(totalRevenue)}</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">کادر متخصصین:</span>
                  <span className="text-sm font-bold text-white">{toPersianDigits(specialistsList.length)} بیوتیشن</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">تعداد خدمات فعال:</span>
                  <span className="text-sm font-bold text-[#6F9A8D]">{toPersianDigits(salonServices.length)} سرویس</span>
                </div>
              </div>
            </div>
          </div>

          {/* Segmented Controls for Salon Tabs */}
          <div className="flex p-1 bg-white rounded-2xl border border-[#E7E2DA] shadow-xs overflow-x-auto">
            <button
              onClick={() => setSalonTab('overview')}
              className={`flex-1 min-w-[100px] py-2 text-xs font-bold rounded-xl transition-all ${
                salonTab === 'overview'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              نمای کلی ویترین
            </button>
            <button
              onClick={() => setSalonTab('specialists')}
              className={`flex-1 min-w-[120px] py-2 text-xs font-bold rounded-xl transition-all ${
                salonTab === 'specialists'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              پرسنل و متخصصین ({toPersianDigits(specialistsList.length)})
            </button>
            <button
              onClick={() => setSalonTab('gallery')}
              className={`flex-1 min-w-[110px] py-2 text-xs font-bold rounded-xl transition-all ${
                salonTab === 'gallery'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              تصاویر و دکوراسیون ({toPersianDigits(salonGallery.length)})
            </button>
            <button
              onClick={() => setSalonTab('services')}
              className={`flex-1 min-w-[110px] py-2 text-xs font-bold rounded-xl transition-all ${
                salonTab === 'services'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              خدمات و نرخ‌نامه ({toPersianDigits(salonServices.length)})
            </button>
            <button
              onClick={() => setSalonTab('schedule')}
              className={`flex-1 min-w-[110px] py-2 text-xs font-bold rounded-xl transition-all ${
                salonTab === 'schedule'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              نوبت‌ها ({toPersianDigits(salonBookings.length)})
            </button>
            <button
              onClick={() => setSalonTab('blocks')}
              className={`flex-1 min-w-[110px] py-2 text-xs font-bold rounded-xl transition-all ${
                salonTab === 'blocks'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              مسدودسازی سانس
            </button>
          </div>

          {/* TAB 0: OVERVIEW (Rich Visual Summary) */}
          {salonTab === 'overview' && (
            <div className="space-y-5">
              {/* Salon Interior Photo Strip Preview */}
              <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#D9A2B0]" />
                      <span>تصاویر فضا، دکوراسیون و تجهیزات سالن (Salon Interior & Stations)</span>
                    </h3>
                    <p className="text-xs text-[#6C6C6C] mt-0.5">
                      ایستگاه‌های کاری، صندلی‌های استایل، اتاق VIP فیشیال و بخش مانیکور برای جذب اولیه مشتریان
                    </p>
                  </div>
                  <button
                    onClick={() => setSalonTab('gallery')}
                    className="text-xs font-bold text-[#173B3F] hover:underline flex items-center gap-1"
                  >
                    <span>مدیریت آلبوم</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {salonGallery.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() =>
                        setLightboxImage({
                          url: imgUrl,
                          title: `نمای سالن شماره ${toPersianDigits(idx + 1)}`,
                          category: 'دکوراسیون و تجهیزات سالن',
                          author: currentSalon.name,
                        })
                      }
                      className="group relative aspect-4/3 rounded-2xl overflow-hidden border border-[#E7E2DA] bg-[#FAF7F2] cursor-pointer shadow-xs hover:border-[#173B3F] transition-all"
                    >
                      <img
                        src={imgUrl}
                        alt="نمای سالن"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-[10px] text-white font-bold flex items-center gap-1">
                          <Eye className="w-3 h-3 text-[#D9A2B0]" />
                          <span>بزرگ‌نمایی تصویر</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specialists Spotlight Section */}
              <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#6F9A8D]" />
                      <span>متخصصین و پرسنل فعال (Specialists Showcase)</span>
                    </h3>
                    <p className="text-xs text-[#6C6C6C] mt-0.5">
                      برای ورود به پرتال اختصاصی هر متخصص و بررسی آلبوم نمونه‌کارها روی کارت متخصص کلیک کنید.
                    </p>
                  </div>
                  <button
                    onClick={() => setSalonTab('specialists')}
                    className="text-xs font-bold text-[#173B3F] hover:underline flex items-center gap-1"
                  >
                    <span>مشاهده همه کادر</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {specialistsList.map((spec) => (
                    <div
                      key={spec.id}
                      className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] hover:border-[#173B3F] transition-all space-y-3 cursor-pointer group"
                      onClick={() => setActiveSpecialistView(spec)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={spec.avatar}
                            alt={spec.name}
                            className="w-13 h-13 rounded-2xl object-cover border-2 border-[#D9A2B0] shrink-0"
                          />
                          {spec.verified && (
                            <span className="absolute -bottom-1 -right-1 bg-[#6F9A8D] text-white p-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-[#1C1C1C] truncate">{spec.name}</h4>
                            <div className="flex items-center gap-0.5 text-[#C99558]">
                              <Star className="w-3 h-3 fill-current" />
                              <span className="text-[11px] font-bold text-[#1C1C1C]">{toPersianDigits(spec.rating.toFixed(2))}</span>
                            </div>
                          </div>
                          <span className="text-[11px] text-[#173B3F] font-semibold block truncate">{spec.role}</span>
                          <span className="text-[10px] text-[#6C6C6C]">
                            {toPersianDigits(spec.experienceYears)} سال سابقه • {toPersianDigits(spec.portfolio.length)} نمونه‌کار
                          </span>
                        </div>
                      </div>

                      {/* Mini portfolio thumbnails preview */}
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {spec.portfolio.slice(0, 3).map((p) => (
                          <div key={p.id} className="w-14 h-14 rounded-xl overflow-hidden border border-[#E7E2DA] shrink-0 relative">
                            <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </div>
                        ))}
                        <div className="flex-1 h-14 rounded-xl bg-white border border-dashed border-[#6F9A8D]/60 flex items-center justify-center text-[10px] text-[#173B3F] font-bold px-2 text-center group-hover:bg-[#173B3F] group-hover:text-white transition-colors">
                          ورود به پنل متخصص
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services Highlights */}
              <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-[#173B3F]" />
                      <span>خدمات منتخب سالن با تصویر نتیجه کار</span>
                    </h3>
                  </div>
                  <button
                    onClick={() => setSalonTab('services')}
                    className="text-xs font-bold text-[#173B3F] hover:underline flex items-center gap-1"
                  >
                    <span>ویرایش و تعرفه‌گذاری</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {salonServices.slice(0, 4).map((serv) => (
                    <div
                      key={serv.id}
                      className="p-3 rounded-2xl border border-[#E7E2DA] bg-white flex items-center gap-3 shadow-xs"
                    >
                      <img
                        src={serv.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=300&q=80'}
                        alt={serv.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#E7E2DA]"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-[#1C1C1C] block truncate">{serv.name}</span>
                        <span className="text-[10px] text-[#6C6C6C] block truncate mt-0.5">{serv.description}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-bold text-[#173B3F]">{formatPrice(serv.price)}</span>
                          <span className="text-[10px] text-[#2E5E52] bg-[#EAF2EF] px-2 py-0.5 rounded-full font-bold">
                            {toPersianDigits(serv.durationMinutes)} دقیقه
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: Real-time Bookings Manager */}
          {salonTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-[#173B3F]">
                  نوبت‌های رزرو شده سالن {currentSalon.name}:
                </h3>
                <span className="text-[11px] text-[#6C6C6C]">
                  همگام با بک‌اند بویا ({toPersianDigits(salonBookings.length)} نوبت)
                </span>
              </div>

              {salonBookings.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-[#E7E2DA] text-center space-y-2">
                  <Calendar className="w-10 h-10 text-[#6F9A8D] mx-auto opacity-70" />
                  <p className="text-sm font-bold text-[#173B3F]">هنوز نوبتی برای این سالن در سامانه ثبت نشده است.</p>
                  <p className="text-xs text-[#6C6C6C]">می‌توانید از طریق اپلیکیشن مشتری یک نوبت آزمایشی ثبت فرمایید.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salonBookings.map((bkg) => {
                    const matchedService = salonServices.find((s) => s.id === bkg.serviceId || s.name === bkg.serviceName);
                    const matchedSpecialist = specialistsList.find((s) => s.name === bkg.specialistName);

                    return (
                      <div
                        key={bkg.id}
                        className="bg-white rounded-2xl p-4 border border-[#E7E2DA] space-y-3 shadow-xs hover:border-[#173B3F] transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                matchedService?.imageUrl ||
                                'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=300&q=80'
                              }
                              alt={bkg.serviceName}
                              className="w-12 h-12 rounded-xl object-cover border border-[#E7E2DA] shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#1C1C1C]">
                                  {bkg.customerName}
                                </span>
                                <span className="text-[11px] font-mono text-[#6C6C6C]">
                                  ({toPersianDigits(bkg.customerPhone)})
                                </span>
                                {bkg.isMobileBooking && (
                                  <span className="text-[10px] font-bold text-[#173B3F] bg-[#E8F0EF] px-2 py-0.5 rounded-full border border-[#173B3F]/20">
                                    خدمت در محل مشتری
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-bold text-[#173B3F] block mt-0.5">
                                {bkg.serviceName} با متخصص {bkg.specialistName}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              bkg.status === 'confirmed'
                                ? 'bg-[#EAF2EF] text-[#2E5E52] border border-[#6F9A8D]/40'
                                : bkg.status === 'completed'
                                ? 'bg-[#EDF4F5] text-[#24545F] border border-[#5E8B95]/40'
                                : 'bg-[#F8ECEE] text-[#B35D67] border border-[#B35D67]/40'
                            }`}
                          >
                            {bkg.status === 'confirmed'
                              ? 'تایید شده'
                              : bkg.status === 'completed'
                              ? 'انجام شده'
                              : 'لغو شده'}
                          </span>
                        </div>

                        <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E7E2DA] text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[#1C1C1C]">
                            <Clock className="w-3.5 h-3.5 text-[#173B3F]" />
                            <span>
                              {bkg.date} - ساعت {toPersianDigits(bkg.time)}
                            </span>
                          </div>
                          <span className="font-bold text-[#173B3F]">
                            مبلغ: {formatPrice(bkg.price)}
                          </span>
                        </div>

                        {bkg.notes && (
                          <p className="text-[11px] text-[#6C6C6C] italic">
                            ملاحظات مشتری: {bkg.notes}
                          </p>
                        )}

                        {/* Status action buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#E7E2DA]/60">
                          {bkg.status !== 'completed' && (
                            <button
                              onClick={() => onUpdateBookingStatus(bkg.id, 'completed')}
                              className="px-3.5 py-1 rounded-full bg-[#6F9A8D] hover:bg-[#5a8075] text-white text-xs font-bold shadow-xs"
                            >
                              تکمیل خدمت
                            </button>
                          )}
                          {bkg.status !== 'cancelled' && (
                            <button
                              onClick={() => onUpdateBookingStatus(bkg.id, 'cancelled')}
                              className="px-3.5 py-1 rounded-full bg-[#F8ECEE] text-[#B35D67] hover:bg-[#f2dde0] text-xs font-semibold"
                            >
                              ثبت عدم حضور / لغو
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Salon Interior & Station Gallery (تصاویر و دکوراسیون) */}
          {salonTab === 'gallery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F]">
                    آلبوم دکوراسیون، بخش‌ها و تجهیزات سالن {currentSalon.name}:
                  </h3>
                  <p className="text-xs text-[#6C6C6C]">
                    این تصاویر به عنوان گالری فضای سالن در اپ مشتریان بویا نمایش داده می‌شود.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingGalleryImage(!isAddingGalleryImage)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D9A2B0]" />
                  <span>افزودن تصویر سالن</span>
                </button>
              </div>

              {/* Add Gallery Image Form */}
              {isAddingGalleryImage && (
                <form onSubmit={handleAddGalleryImage} className="p-4 bg-white rounded-3xl border border-[#173B3F] space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold text-[#173B3F]">ثبت عکس جدید از سالن و تجهیزات</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="عنوان یا بخش سالن (مثال: سوئیت VIP عروس و فیشیال)"
                      value={newGalleryImageTitle}
                      onChange={(e) => setNewGalleryImageTitle(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                    />
                    <input
                      type="url"
                      required
                      placeholder="آدرس اینترنتی تصویر (URL)"
                      value={newGalleryImageUrl}
                      onChange={(e) => setNewGalleryImageUrl(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232]"
                    >
                      افزودن به گالری سالن
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingGalleryImage(false)}
                      className="px-4 py-2 rounded-full border border-slate-200 text-xs text-[#6C6C6C]"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              )}

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {salonGallery.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() =>
                      setLightboxImage({
                        url: imgUrl,
                        title: `بخش تخصصی سالن - تصویر ${toPersianDigits(idx + 1)}`,
                        category: 'ایستگاه کاری و فضای سالن',
                        author: currentSalon.name,
                      })
                    }
                    className="group relative aspect-4/3 rounded-2xl overflow-hidden border border-[#E7E2DA] bg-[#FAF7F2] cursor-pointer shadow-xs hover:border-[#173B3F] transition-all"
                  >
                    <img
                      src={imgUrl}
                      alt={`تصویر سالن ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity flex flex-col justify-end p-2.5">
                      <span className="text-[11px] font-bold text-white">
                        بخش شماره {toPersianDigits(idx + 1)} سالن
                      </span>
                      <span className="text-[10px] text-[#D9A2B0] flex items-center gap-1">
                        <Maximize2 className="w-3 h-3" />
                        <span>مشاهده تمام صفحه</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Services & Pricing Management with Images */}
          {salonTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F]">
                    لیست خدمات، نرخ‌نامه مصوب و تصاویر نتایج:
                  </h3>
                  <p className="text-xs text-[#6C6C6C]">
                    تصاویر نمونه کار به همراه قیمت و زمان‌بندی برای هر سرویس
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingService(!isAddingService)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D9A2B0]" />
                  <span>تعریف خدمت جدید</span>
                </button>
              </div>

              {/* Add Service Form */}
              {isAddingService && (
                <form onSubmit={handleAddService} className="p-4 bg-white rounded-3xl border border-[#173B3F] space-y-3 shadow-sm">
                  <h4 className="text-xs font-bold text-[#173B3F]">فرم تعریف خدمت جدید در پلتفرم بویا</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="نام خدمت (مثال: شینیون خطی ژورنالی)"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                    />
                    <input
                      type="number"
                      required
                      placeholder="قیمت به تومان"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(Number(e.target.value))}
                      className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                    />
                    <input
                      type="number"
                      required
                      placeholder="مدت زمان (دقیقه)"
                      value={newServiceDuration}
                      onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                      className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                    />
                    <select
                      value={newServiceLineId}
                      onChange={(e) => setNewServiceLineId(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                    >
                      <option value="hair">مو و استایل</option>
                      <option value="nail">ناخن و اسپا دست</option>
                      <option value="skincare">پوست و فیشیال</option>
                      <option value="eyelash_eyebrow">مژه و ابرو</option>
                      <option value="massage_spa">اسپا و ماساژ</option>
                    </select>

                    <div className="sm:col-span-2">
                      <span className="text-[11px] font-semibold text-[#1C1C1C] block mb-1">
                        انتخاب تصویر پیش‌نمایش خدمت:
                      </span>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {PRESET_SERVICE_PHOTOS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setNewServiceImage(preset.url)}
                            className={`flex items-center gap-1.5 p-1 rounded-xl border text-xs shrink-0 transition-all ${
                              newServiceImage === preset.url
                                ? 'border-[#173B3F] bg-[#173B3F]/5 font-bold'
                                : 'border-[#E7E2DA] bg-white'
                            }`}
                          >
                            <img src={preset.url} alt={preset.label} className="w-8 h-8 rounded-lg object-cover" />
                            <span className="text-[11px] px-1">{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#1C1C1C] sm:col-span-2">
                      <input
                        type="checkbox"
                        id="mobileServiceCheck"
                        checked={newServiceMobile}
                        onChange={(e) => setNewServiceMobile(e.target.checked)}
                        className="accent-[#173B3F] w-4 h-4"
                      />
                      <label htmlFor="mobileServiceCheck">قابل ارائه در محل مشتری (Mobile Service)</label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232]"
                    >
                      ثبت و انتشار در ویترین
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingService(false)}
                      className="px-4 py-2 rounded-full border border-slate-200 text-xs text-[#6C6C6C]"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              )}

              {/* Services list with crisp beauty thumbnails */}
              <div className="space-y-2.5">
                {salonServices.map((serv) => (
                  <div
                    key={serv.id}
                    className="p-3.5 bg-white rounded-2xl border border-[#E7E2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[#173B3F] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={serv.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=300&q=80'}
                        alt={serv.name}
                        onClick={() =>
                          setLightboxImage({
                            url: serv.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
                            title: serv.name,
                            category: serv.description,
                            author: currentSalon.name,
                          })
                        }
                        className="w-14 h-14 rounded-xl object-cover border border-[#E7E2DA] shrink-0 cursor-pointer hover:opacity-90"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <BeautyActivityIcon activityId={serv.serviceLineId} size="sm" />
                          <span className="font-bold text-xs text-[#1C1C1C]">{serv.name}</span>
                          {serv.isMobileAvailable && (
                            <span className="text-[9px] bg-[#E8F0EF] text-[#173B3F] px-1.5 py-0.2 rounded-full font-bold">
                              سیار
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#6C6C6C] block mt-0.5">
                          مدت زمان: {toPersianDigits(serv.durationMinutes)} دقیقه • {serv.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E7E2DA]">
                      <span className="text-xs font-bold text-[#173B3F] block">
                        {formatPrice(serv.price)}
                      </span>
                      <span className="text-[10px] text-[#2E5E52] font-semibold bg-[#EAF2EF] px-2 py-0.5 rounded-full mt-0.5">
                        فعال در ویترین
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Specialists & Portfolios (پرسنل و نمونه‌کارها) */}
          {salonTab === 'specialists' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F]">
                    کادر متخصصین و بیوتیشن‌های همکار ({toPersianDigits(specialistsList.length)} نفر):
                  </h3>
                  <p className="text-xs text-[#6C6C6C]">
                    نمونه‌کارهای ژورنالی، آلبوم مشتریان و امکان ورود به پنل اختصاصی بیوتیشن
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {specialistsList.map((spec) => (
                  <div
                    key={spec.id}
                    className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-4 shadow-xs hover:border-[#173B3F] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          <img
                            src={spec.avatar}
                            alt={spec.name}
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D9A2B0] shadow-xs"
                          />
                          {spec.verified && (
                            <span className="absolute -bottom-1 -right-1 bg-[#6F9A8D] text-white p-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#1C1C1C]">
                              {spec.name}
                            </h4>
                            <span className="text-[10px] bg-[#EAF2EF] text-[#2E5E52] px-2 py-0.5 rounded-full font-bold">
                              {spec.role}
                            </span>
                          </div>

                          <p className="text-xs text-[#6C6C6C] mt-0.5 max-w-lg line-clamp-1">
                            {spec.bio}
                          </p>

                          <div className="flex items-center gap-3 mt-1.5 text-xs text-[#6C6C6C]">
                            <span className="flex items-center gap-1 text-[#C99558]">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span className="font-bold text-[#1C1C1C]">{toPersianDigits(spec.rating.toFixed(2))}</span>
                            </span>
                            <span>•</span>
                            <span>{toPersianDigits(spec.experienceYears)} سال سابقه</span>
                            <span>•</span>
                            <span className="font-mono text-[11px]">{toPersianDigits(spec.phone)}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveSpecialistView(spec)}
                        className="px-4 py-2 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-[#D9A2B0]" />
                        <span>ورود به پنل اختصاصی متخصص</span>
                      </button>
                    </div>

                    {/* Interactive Portfolio Previews with High-Res Lightbox */}
                    <div className="border-t border-[#E7E2DA] pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#173B3F] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#D9A2B0]" />
                          <span>نمونه‌کارهای فعال در پروفایل:</span>
                        </span>
                        <span className="text-[11px] text-[#6C6C6C]">
                          برای بزرگ‌نمایی کلیک کنید
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {spec.portfolio.map((p) => (
                          <div
                            key={p.id}
                            onClick={() =>
                              setLightboxImage({
                                url: p.imageUrl,
                                title: p.title,
                                category: p.category,
                                author: spec.name,
                              })
                            }
                            className="group relative aspect-4/3 rounded-xl overflow-hidden border border-[#E7E2DA] bg-[#FAF7F2] cursor-pointer shadow-xs hover:border-[#173B3F] transition-all"
                          >
                            <img
                              src={p.imageUrl}
                              alt={p.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity flex flex-col justify-end p-2 text-white">
                              <span className="text-[10px] font-bold line-clamp-1">{p.title}</span>
                              <div className="flex items-center justify-between text-[9px] text-[#E8F0EF] mt-0.5">
                                <span>{p.category}</span>
                                <span className="flex items-center gap-0.5 text-[#D9A2B0]">
                                  <Heart className="w-2.5 h-2.5 fill-current" />
                                  <span>{toPersianDigits(p.likesCount)}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Schedule Blocks (قفل کردن سانس‌ها) */}
          {salonTab === 'blocks' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-3 shadow-sm">
                <h3 className="text-sm font-bold text-[#173B3F]">
                  مسدودسازی سانس‌ها (Schedule Blocks)
                </h3>
                <p className="text-xs text-[#6C6C6C] leading-relaxed">
                  برای جلوگیری از تداخل نوبت (Double-booking)، می‌توانید سانس‌های استراحت، مرخصی متخصصین یا وقت‌های پرشده حضوری را قفل کنید.
                </p>

                <form onSubmit={handleAddBlock} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="تاریخ (مثال: دوشنبه ۷ آبان)"
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none"
                  />
                  <input
                    type="text"
                    placeholder="بازه زمانی (مثال: ۱۴:۰۰ الی ۱۵:۳۰)"
                    value={newBlockTime}
                    onChange={(e) => setNewBlockTime(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none"
                  />
                  <input
                    type="text"
                    placeholder="علت مسدودسازی"
                    value={newBlockReason}
                    onChange={(e) => setNewBlockReason(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs text-[#1C1C1C] focus:border-[#173B3F] outline-none"
                  />
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] shadow-sm"
                    >
                      افزودن بلاک زمانی به تقویم
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-2">
                {scheduleBlocks.map((blk) => (
                  <div
                    key={blk.id}
                    className="p-3 bg-white rounded-2xl border border-[#E7E2DA] flex items-center justify-between text-xs shadow-xs"
                  >
                    <div>
                      <span className="font-bold text-[#173B3F] block">
                        {blk.date} — {toPersianDigits(blk.time)}
                      </span>
                      <span className="text-[11px] text-[#6C6C6C]">علت: {blk.reason}</span>
                    </div>
                    <button
                      onClick={() => setScheduleBlocks(scheduleBlocks.filter((b) => b.id !== blk.id))}
                      className="text-xs text-[#B35D67] hover:underline font-bold"
                    >
                      حذف بلاک
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL FOR HIGH-RES BEAUTY PHOTOGRAPHY */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#E7E2DA]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-4/3 sm:aspect-16/10 bg-black">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white flex items-center justify-between border-t border-[#E7E2DA]">
              <div>
                <h4 className="text-sm font-bold text-[#173B3F]">{lightboxImage.title}</h4>
                <div className="flex items-center gap-2 text-xs text-[#6C6C6C] mt-0.5">
                  {lightboxImage.category && <span>{lightboxImage.category}</span>}
                  {lightboxImage.author && <span>• ارائه شده توسط: {lightboxImage.author}</span>}
                </div>
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                className="px-4 py-1.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232]"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
