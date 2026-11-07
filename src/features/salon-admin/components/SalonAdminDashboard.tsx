import React, { useState, useEffect } from 'react';
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
  Briefcase,
  Trash2,
  Lock,
  Edit3,
  Save,
  ShieldAlert,
  Check,
  Ban,
  BarChart3,
  LogOut
} from 'lucide-react';
import { useAdminSalons, useBookings, useStaff } from '../../../shared/api/queries';
import { useAuthStore } from '../../../shared/stores/authStore';
import api from '../../../shared/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Salon,
  SalonService,
  Specialist,
  Booking,
  SpecialistPortfolio,
  SERVICE_LINES,
} from '../../../shared/data/marketplaceData';
import { formatPrice, toPersianDigits, normalizePhone, WEEKDAYS_FA } from '../../../shared/utils/persianUtils';
import { parseGallery } from '../../../shared/utils/gallery';
import { normalizeToIsoDate, normalizeTime } from '../../../shared/utils/dateIsoConverter';
import { JalaliDatePicker } from '../../../shared/components/ui/JalaliDatePicker';
import { BeautyActivityIcon } from '../../../shared/components/ui/BeautyActivityIcon';
import { SpecialistFinancialsView } from '../../../shared/components/ui/SpecialistFinancialsView';
import { SafeHtml } from '../../../shared/components/ui/SafeHtml';
import { ImageFileUploader } from '../../../shared/components/ui/ImageFileUploader';
import { UserHeader } from '../../../shared/components/layout/UserHeader';
import { ServiceFormModal, ServiceFormValue } from './ServiceFormModal';

import { useUIStore } from '../../../shared/stores/uiStore';
import { useDataStore } from '../../../shared/stores/dataStore';
import { SEO } from '../../../shared/components/SEO';
import { ROLES, STAFF_ROLES, ROLE_LABELS } from '../../../shared/constants/roles';

// Preset beauty images for quick service & portfolio creation
const PRESET_SERVICE_PHOTOS = [
  { id: 'p-hair', label: 'مو و بالیاژ', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-keratin', label: 'کراتین و احیا', url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-facial', label: 'فیشیال پوست', url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-nail', label: 'کاشت ناخن', url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-lash', label: 'اکستنشن مژه', url: 'https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-bridal', label: 'شینیون عروس', url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&q=80' },
  { id: 'p-spa', label: 'اسپا و ماساژ', url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80' },
];

const DAYS_OF_WEEK = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

/**
 * Sample-work images for one service (salon-admin gallery tab).
 * Add via URL, delete per image. Editing the title happens in place.
 */
const ServicePortfolioRow: React.FC<{
  items: any[];
  onAdd: (imageUrl: string, title?: string) => Promise<boolean>;
  onDelete: (itemId: number) => void;
}> = ({ items, onAdd, onDelete }) => {
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setAdding(true);
    const ok = await onAdd(newUrl, newTitle);
    if (ok) { setNewUrl(''); setNewTitle(''); }
    setAdding(false);
  };

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-[11px] text-[#6C6C6C]">برای این خدمت هنوز نمونه‌کاری ثبت نشده است.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <div key={item.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#E7E2DA] group">
              <img src={item.imageUrl} alt={item.title || 'نمونه‌کار'} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onDelete(Number(item.id))}
                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center shadow"
                title="حذف تصویر"
              >×</button>
              {item.title && (
                <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[9px] px-1 py-0.5 truncate">
                  {item.title}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="flex flex-wrap gap-1.5 items-center">
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="آدرس تصویر نمونه‌کار (لینک)"
          className="flex-1 min-w-[150px] h-8 px-2.5 rounded-lg border border-[#E7E2DA] text-[11px] focus:border-[#173B3F] outline-none"
        />
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="عنوان (اختیاری)"
          className="w-32 h-8 px-2.5 rounded-lg border border-[#E7E2DA] text-[11px] focus:border-[#173B3F] outline-none"
        />
        <button
          type="submit"
          disabled={adding || !newUrl.trim()}
          className="px-3 h-8 rounded-lg bg-[#173B3F] text-white text-[11px] font-bold disabled:opacity-50"
        >
          {adding ? '…' : 'افزودن'}
        </button>
      </form>
    </div>
  );
};

export const SalonAdminDashboard: React.FC = () => {
  const { showToast } = useUIStore();
  const { user } = useAuthStore();
  const { salons, updateSalon, updateSpecialist, createService, createSpecialist, deleteSpecialist, updateService, deleteService } = useDataStore();
  const queryClient = useQueryClient();

  // Fetch real data. The salon panel needs the STAFF view (unfiltered:
  // pending specialists/services must be visible to the manager), so it uses
  // the admin hook. The public useSalons hook drops pending rows via
  // filterPublishedSalons, which hid newly registered specialists.
  const { data: salonsData = [], isLoading: isLoadingSalons } = useAdminSalons();
  const { data: bookingsData = [], isLoading: isLoadingBookings } = useBookings();
  const { data: staffData = [] } = useStaff();

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data } = await api.patch(`/bookings/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const onUpdateBookingStatus = (id: number | string, status: string) => {
    updateBookingMutation.mutate({ id: Number(id), status });
  };

  // ✅ logout اصلاح شده
  const handleLogout = () => {
    const { clearAuth } = useAuthStore.getState(); // ✅ تابع صحیح
    clearAuth();
    showToast('با موفقیت خارج شدید');
    window.location.href = '/';
  };

  // Active test salon selection
  const [selectedSalonId, setSelectedSalonId] = useState<string>('');

  // Initialize selected salon based on user role. Only super_admin may browse
  // salons freely; scoped roles are pinned to their own salon, and — unlike the
  // old fallback — never default to another tenant's salon (salonsData[0]).
  useEffect(() => {
    if (user?.role === ROLES.SUPER_ADMIN) {
      if (!selectedSalonId && salonsData.length > 0) {
        setSelectedSalonId(salonsData[0].id.toString());
      }
      return;
    }
    if (user?.salonId) {
      const mine = salonsData.find((s: any) => String(s.id) === String(user.salonId));
      if (mine && selectedSalonId !== String(mine.id)) {
        setSelectedSalonId(String(mine.id));
      }
    }
  }, [salonsData, user, selectedSalonId]);

  // currentSalon may be null for a scoped role with no salon record — callers
  // must handle that empty state instead of writing against a fake salon.
  const currentSalon: any = salonsData.find((s: any) => s.id.toString() === selectedSalonId) || null;

  // Salon Manager tab navigation
  const [salonTab, setSalonTab] = useState<'overview' | 'schedule' | 'gallery' | 'services' | 'specialists' | 'blocks' | 'commissions' | 'weekly_schedule'>('overview');

  // Dedicated Specialist View mode
  const [activeSpecialistView, setActiveSpecialistView] = useState<any>(null);

  // Specialist panel tab navigation
  const [specialistTab, setSpecialistTab] = useState<'profile' | 'bookings' | 'services' | 'schedule' | 'portfolio' | 'salon_info' | 'financials' | 'staff'>('bookings');

  // Lightbox Modal state
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; category?: string; author?: string } | null>(null);

  // Local state for salon interior gallery
  const [salonGallery, setSalonGallery] = useState<string[]>([]);
  const [isAddingGalleryImage, setIsAddingGalleryImage] = useState(false);
  const [newGalleryImageUrl, setNewGalleryImageUrl] = useState('');
  const [newGalleryImageTitle, setNewGalleryImageTitle] = useState('');

  // Salon-admin service portfolio ("نمونه‌کار خدمات"): sample-work images per
  // service. Loaded when opening the gallery tab; independent (rented-chair)
  // services are excluded by the server, so they never enter servicePortfolio.
  const [servicePortfolio, setServicePortfolio] = useState<Record<number, any[]>>({});
  const [portfolioBusyServiceId, setPortfolioBusyServiceId] = useState<number | null>(null);

  const handleLoadServicePortfolio = async (serviceId: number) => {
    setPortfolioBusyServiceId(serviceId);
    try {
      const { data } = await api.get(`/services/${serviceId}/portfolio`);
      setServicePortfolio((prev) => ({ ...prev, [serviceId]: Array.isArray(data) ? data : [] }));
    } catch {
      setServicePortfolio((prev) => ({ ...prev, [serviceId]: [] }));
    } finally {
      setPortfolioBusyServiceId(null);
    }
  };

  const handleAddServicePortfolio = async (serviceId: number, imageUrl: string, title?: string): Promise<boolean> => {
    if (!imageUrl.trim()) { showToast('تصویر نمونه‌کار الزامی است.'); return false; }
    try {
      const { data } = await api.post(`/services/${serviceId}/portfolio`, {
        imageUrl: imageUrl.trim(),
        title: title?.trim() || null,
      });
      setServicePortfolio((prev) => ({ ...prev, [serviceId]: [data, ...(prev[serviceId] || [])] }));
      showToast('نمونه‌کار به این خدمت اضافه شد.');
      return true;
    } catch (err: any) {
      showToast(err?.response?.data?.error || err?.message || 'خطا در ثبت نمونه‌کار.');
      return false;
    }
  };

  const handleDeleteServicePortfolio = async (serviceId: number, itemId: number) => {
    if (!window.confirm('حذف این تصویر نمونه‌کار؟')) return;
    try {
      await api.delete(`/services/${serviceId}/portfolio/${itemId}`);
      setServicePortfolio((prev) => ({ ...prev, [serviceId]: (prev[serviceId] || []).filter((i) => i.id !== itemId) }));
      showToast('تصویر نمونه‌کار حذف شد.');
    } catch (err: any) {
      showToast(err?.response?.data?.error || err?.message || 'خطا در حذف نمونه‌کار.');
    }
  };

  // Local state for services
  const [salonServices, setSalonServices] = useState<any[]>([]);

  // Local state for specialists in this salon
  const [specialistsList, setSpecialistsList] = useState<any[]>([]);

  // Service form modal: create AND edit share one form so every field
  // (line, providers, duration, price, name) is editable in place.
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [serviceFormSpecialists, setServiceFormSpecialists] = useState<number[]>([]);

  // Specialist CRUD (salon-admin feature: create/edit/delete + documents → approval)
  const [showSpecialistForm, setShowSpecialistForm] = useState(false);
  const [editingSpecialistId, setEditingSpecialistId] = useState<number | null>(null);
  const [newSpecialistPhone, setNewSpecialistPhone] = useState('');
  const [newSpecialistName, setNewSpecialistName] = useState('');
  const [newSpecialistLine, setNewSpecialistLine] = useState('hair');
  const [newSpecialistRented, setNewSpecialistRented] = useState(false);
  const [newSpecialistDocs, setNewSpecialistDocs] = useState<string[]>([]);
  const [specialistBusy, setSpecialistBusy] = useState(false);

  // Commissions + weekly schedule (salon-admin feature pack)
  const [commissionRows, setCommissionRows] = useState<Array<{ specialistId: number; percent: number | null }>>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Array<{ dayOfWeek: number; openTime: string; closeTime: string; isActive: boolean }>>([]);
  const [scheduleBusy, setScheduleBusy] = useState(false);

  // Avatar & Cover upload refs
  const specialistAvatarInputRef = React.useRef<HTMLInputElement>(null);
  const salonCoverInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Local state for adding portfolio item to specialist
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);
  const [newPortfolioTitle, setNewPortfolioTitle] = useState('');
  const [newPortfolioCategory, setNewPortfolioCategory] = useState('رنگ و لایت');
  const [newPortfolioUrl, setNewPortfolioUrl] = useState(PRESET_SERVICE_PHOTOS[0].url);

  // Salon info edit state
  const [editableSalonName, setEditableSalonName] = useState('');
  const [editableSalonAddress, setEditableSalonAddress] = useState('');
  const [salonEditSuccess, setSalonEditSuccess] = useState(false);

  // Specialist schedule & hours state
  const [specialistWorkingHours, setSpecialistWorkingHours] = useState('۱۰:۰۰ الی ۱۹:۰۰');
  const [specialistWorkingDays, setSpecialistWorkingDays] = useState<string[]>([
    'شنبه',
    'یکشنبه',
    'دوشنبه',
    'سه‌شنبه',
    'چهارشنبه',
  ]);
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState(false);

  // Schedule blocks with specialistId tracking
  const [scheduleBlocks, setScheduleBlocks] = useState([
    { id: 'blk-1', specialistId: 'spec-1', date: 'شنبه ۵ آبان', time: '۱۲:۰۰ الی ۱۳:۰۰', reason: 'ضدعفونی تجهیزات و استراحت' },
    { id: 'blk-2', specialistId: 'spec-2', date: 'یکشنبه ۶ آبان', time: '۱۴:۰۰ الی ۱۵:۰۰', reason: 'جلسه هماهنگی کادر تخصصی' },
    { id: 'blk-3', specialistId: 'spec-nail-1', date: 'دوشنبه ۷ آبان', time: '۱۳:۰۰ الی ۱۴:۰۰', reason: 'وقت ناهار و استراحت' },
  ]);
  // Schedule-block date is picked from the calendar (JalaliDatePicker), never
  // typed by hand. Stored as a Jalali string the server can normalize.
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockTime, setNewBlockTime] = useState('۱۳:۰۰ الی ۱۴:۰۰');
  const [newBlockReason, setNewBlockReason] = useState('استراحت / نوبت تلفنی');

  // Sync state when salon switches
  useEffect(() => {
    if (currentSalon) {
      setEditableSalonName(currentSalon.name || '');
      setEditableSalonAddress(currentSalon.address || '');
      setSalonGallery(parseGallery(currentSalon.gallery));
      setSalonServices(currentSalon.services || []);
      setSpecialistsList(currentSalon.specialists || []);
    }
  }, [currentSalon]);

  const isSpecialistRole = user?.role === ROLES.SALON_SPECIALIST || user?.role === ROLES.MOBILE_SPECIALIST || user?.role === ROLES.LINE_MANAGER;

  const isMobileSpecialist =
    user?.role === 'mobile_specialist' ||
    Boolean(activeSpecialistView?.isMobileSpecialist) ||
    Boolean(activeSpecialistView?.isMobileActive);

  // Lock specialist view when logged in as a specialist
  useEffect(() => {
    if (isSpecialistRole) {
      if (user?.role === ROLES.MOBILE_SPECIALIST) {
        // Independent Mobile Specialist: db-backed profile via /api/me/specialist
        // (replaces the old client-side mock that had no real services/portfolio).
        if (!activeSpecialistView || activeSpecialistView.id !== user.id) {
          api.get('/me/specialist')
            .then(({ data }) => {
              setActiveSpecialistView({
                ...data,
                id: data.id ?? user.id,
                name: data.user?.fullName || user.fullName || 'متخصص سیار',
                avatar: data.avatarUrl || data.user?.avatar || '',
                isMobileSpecialist: true,
                isMobileActive: true,
                portfolio: Array.isArray(data.portfolio) ? data.portfolio : [],
                services: Array.isArray(data.services) ? data.services : [],
              });
            })
            .catch(() => {
              // Fall back to a minimal shell so the panel still renders.
              setActiveSpecialistView({
                id: user.id || 'mobile-spec',
                user,
                name: user.fullName || 'متخصص سیار',
                specialtyLine: user.managedLine || 'hair',
                isMobileSpecialist: true,
                isMobileActive: true,
                portfolio: [],
                services: [],
              });
            });
        }
      } else if (specialistsList.length > 0) {
        // Match ONLY on the caller's own identity — the old
        // `specialtyLine === managedLine` and `specialistsList[0]` fallbacks
        // would pick a colleague's row and show their bookings/portfolio.
        const mySpec = specialistsList.find(
          (s: any) =>
            s.user?.id === user?.id ||
            s.user?.phone === user?.phone ||
            String(s.userId) === String(user?.id)
        );

        if (mySpec && (!activeSpecialistView || activeSpecialistView.id !== mySpec.id)) {
          setActiveSpecialistView(mySpec);
        }
      }
    }
  }, [isSpecialistRole, specialistsList, user, activeSpecialistView]);

  // Ensure mobile specialist never accesses salon_info tab
  useEffect(() => {
    if (isMobileSpecialist && specialistTab === 'salon_info') {
      setSpecialistTab('bookings');
    }
  }, [isMobileSpecialist, specialistTab]);

  const handleSelectSalon = (salonId: string) => {
    setSelectedSalonId(salonId);
    const found = salonsData.find((s: any) => s.id.toString() === salonId);
    if (found) {
      setSalonGallery(parseGallery(found.gallery));
      setSalonServices(found.services || []);
      setSpecialistsList(found.specialists || []);
      setActiveSpecialistView(null);
    }
  };

  // Helper to determine specialist type label
  const getSpecialistTypeBadge = (spec: any) => {
    if (spec.specialistType === 'mobile_specialist' || spec.isMobileSpecialist || spec.isMobileActive) {
      return {
        label: 'متخصص سیار (خدمات در محل)',
        color: 'bg-[#C99558]/15 text-[#C99558] border-[#C99558]/30',
        icon: <Car className="w-3.5 h-3.5" />,
      };
    }
    if (spec.specialistType === 'line_manager') {
      return {
        label: ROLE_LABELS.line_manager,
        color: 'bg-[#5E8B95]/15 text-[#24545F] border-[#5E8B95]/30',
        icon: <Briefcase className="w-3.5 h-3.5" />,
      };
    }
    return {
      label: 'متخصص سالن (Salon Specialist)',
      color: 'bg-[#173B3F]/15 text-[#173B3F] border-[#173B3F]/30',
      icon: <Building2 className="w-3.5 h-3.5" />,
    };
  };

  // --- Filter Bookings for Current Salon (for Salon Manager) ---
  const salonBookings = (bookingsData || []).filter(
    (b: any) => b.salonId === currentSalon?.id
  );
  const totalRevenue = salonBookings.reduce((sum: number, b: any) => (b.status !== 'cancelled' ? sum + Number(b.price || 0) : sum), 0);
  const confirmedBookingsCount = salonBookings.filter((b: any) => b.status === 'confirmed').length;

  // --- Filter Bookings for Active Specialist (STRICT REQUIREMENT #8) ---
  const specialistBookings = activeSpecialistView
    ? (bookingsData || []).filter(
        (b: any) =>
          b.specialistId === activeSpecialistView.id ||
          (user?.id && (b.specialist?.userId === user.id || b.specialistId === user.id))
      )
    : [];

  // --- Independent specialist mode ---
  // Rented-chair (independent) and mobile specialists manage their OWN services
  // and schedule (owner_id / specialist_weekly_schedule), not the salon's.
  const isIndependentSpecialist = Boolean(
    activeSpecialistView?.isRentedChair || activeSpecialistView?.isMobileSpecialist
  ) && isSpecialistRole;

  const [myServices, setMyServices] = useState<any[]>([]);
  const [myWeeklySchedule, setMyWeeklySchedule] = useState<Array<{ dayOfWeek: number; openTime: string; closeTime: string; isActive: boolean }>>([]);
  const [myScheduleBusy, setMyScheduleBusy] = useState(false);

  // Load own services + schedule when entering independent mode.
  useEffect(() => {
    if (!isIndependentSpecialist) return;
    api.get('/me/services').then(({ data }) => setMyServices(Array.isArray(data) ? data : [])).catch(() => setMyServices([]));
    api.get('/me/schedule').then(({ data }) => setMyWeeklySchedule(Array.isArray(data) ? data : [])).catch(() => setMyWeeklySchedule([]));
  }, [isIndependentSpecialist]);

  // --- Filter Services for Active Specialist (STRICT REQUIREMENT #2) ---
  // Independent specialists see only their own owner-rooted services.
  const specialistServices = isIndependentSpecialist
    ? myServices
    : activeSpecialistView
      ? (salonServices.length > 0
          ? salonServices.filter((s) => s.serviceLineId === activeSpecialistView.specialtyLine)
          : (currentSalon?.services || []).filter((s: any) => s.serviceLineId === activeSpecialistView.specialtyLine || s.isMobileAvailable))
      : [];

  // --- Filter Schedule Blocks for Active Specialist (STRICT REQUIREMENT #3) ---
  const specialistBlocks = activeSpecialistView
    ? scheduleBlocks.filter((b) => b.specialistId === activeSpecialistView.id)
    : [];

  // Handler: Add service (Specialist can only add in their specialty line)
  const [serviceError, setServiceError] = useState('');
  const [serviceBusy, setServiceBusy] = useState(false);

  // Service modal: opened for create (null) or edit (existing row). For
  // independent/mobile specialists the line + provider are locked to their
  // own profile ("لاین مستقل خدمات با متخصص آن لاین").
  const openServiceModal = (serv: any | null) => {
    setEditingService(serv);
    setServiceError('');
    setServiceModalOpen(true);
  };

  const closeServiceModal = () => {
    setServiceModalOpen(false);
    setEditingService(null);
    setServiceError('');
  };

  // Single submit path used by ServiceFormModal (create AND edit) across all
  // three panels: salon_admin, independent (rented chair) and mobile specialist.
  const handleServiceFormSubmit = async (value: ServiceFormValue) => {
    if (!value.name.trim()) { setServiceError('نام خدمت الزامی است.'); return; }
    if (!value.price || value.price <= 0) { setServiceError('هزینه ارائه خدمت الزامی و باید بیشتر از صفر باشد.'); return; }
    if (!value.durationMinutes || value.durationMinutes <= 0) { setServiceError('مدت زمان ارائه خدمت الزامی است.'); return; }
    if (!isIndependentSpecialist && value.specialistIds.length === 0) {
      setServiceError('انتخاب حداقل یک متخصص از لاین مربوطه الزامی است.');
      return;
    }
    setServiceBusy(true);
    setServiceError('');
    try {
      if (isIndependentSpecialist) {
        const payload: any = {
          name: value.name.trim(),
          serviceLineId: value.serviceLineId,
          durationMinutes: value.durationMinutes,
          price: value.price,
          isMobileAvailable: value.isMobileAvailable,
          imageUrl: value.imageUrl,
        };
        if (editingService) {
          const { data } = await api.patch(`/me/services/${editingService.id}`, payload);
          const updated = data?.service ?? data;
          if (updated) setMyServices((prev) => prev.map((s) => (s.id === editingService.id ? { ...s, ...updated } : s)));
          showToast('خدمت ویرایش شد.');
        } else {
          const { data: created } = await api.post('/me/services', payload);
          setMyServices((prev) => [created, ...prev]);
          showToast('خدمت با موفقیت ثبت شد.');
        }
        closeServiceModal();
        return;
      }
      if (editingService) {
        const { data } = await api.patch(`/services/${editingService.id}`, {
          name: value.name.trim(),
          serviceLineId: value.serviceLineId,
          durationMinutes: value.durationMinutes,
          price: value.price,
          isMobileAvailable: value.isMobileAvailable,
          imageUrl: value.imageUrl,
          specialistIds: value.specialistIds,
        });
        const updated = data?.service ?? data;
        if (updated) setSalonServices((prev) => prev.map((s) => (s.id === editingService.id ? { ...s, ...updated } : s)));
        showToast('خدمت ویرایش شد.');
      } else {
        const created = await createService({
          salonId: Number(currentSalon.id),
          serviceLineId: value.serviceLineId,
          name: value.name.trim(),
          durationMinutes: value.durationMinutes,
          price: value.price,
          description: 'سرویس ثبت شده توسط مدیریت سالن در پلتفرم بویا',
          isMobileAvailable: value.isMobileAvailable,
          imageUrl: value.imageUrl,
          specialistIds: value.specialistIds,
        } as any);
        setSalonServices((prev) => [created, ...prev]);
        showToast('خدمت با موفقیت ثبت شد.');
      }
      closeServiceModal();
      await queryClient.invalidateQueries({ queryKey: ['salons'] });
    } catch (err: any) {
      setServiceError(err?.response?.data?.error || err?.message || 'خطا در ثبت خدمت.');
    } finally {
      setServiceBusy(false);
    }
  };


  // Salon-admin feature: edit every field of an existing service via the modal.
  const handleEditService = (serv: any) => {
    openServiceModal(serv);
  };

  const handleDeleteService = async (serv: any) => {
    if (!window.confirm(`حذف خدمت «${serv.name}»؟`)) return;
    try {
      if (isIndependentSpecialist) {
        await api.delete(`/me/services/${serv.id}`);
        setMyServices((prev) => prev.filter((s) => s.id !== serv.id));
        showToast('خدمت حذف شد.');
        return;
      }
      await deleteService(serv.id);
      setSalonServices((prev) => prev.filter((s) => s.id !== serv.id));
      showToast('خدمت حذف شد.');
      queryClient.invalidateQueries({ queryKey: ['salons'] });
    } catch (err: any) {
      showToast(err?.response?.data?.error || err?.message || 'خطا در حذف خدمت.');
    }
  };

  // Handler: Add Portfolio Item (Saved permanently in PostgreSQL portfolio_items table)
  const handleAddPortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSpecialistView || !newPortfolioTitle.trim() || !newPortfolioUrl.trim()) return;

    try {
      // Independent specialists use the owner-resolved endpoint; salon flow
      // keeps the explicit specialistId (now ownership-checked server-side).
      const res = isIndependentSpecialist
        ? await api.post('/me/portfolio', {
            title: newPortfolioTitle.trim(),
            imageUrl: newPortfolioUrl.trim(),
            category: newPortfolioCategory,
          })
        : await api.post('/specialists/portfolio', {
            title: newPortfolioTitle.trim(),
            imageUrl: newPortfolioUrl.trim(),
            category: newPortfolioCategory,
            specialistId: activeSpecialistView.id,
          });

      const newItem: SpecialistPortfolio = {
        id: String(res.data?.id || `port-${Date.now()}`),
        title: newPortfolioTitle.trim(),
        imageUrl: newPortfolioUrl.trim(),
        category: newPortfolioCategory,
        likesCount: 1,
      };

      const updatedPortfolio = [newItem, ...(activeSpecialistView.portfolio || [])];

      const updatedSpecialists = specialistsList.map((spec) => {
        if (spec.id === activeSpecialistView.id) {
          return {
            ...spec,
            portfolio: updatedPortfolio,
          };
        }
        return spec;
      });

      setSpecialistsList(updatedSpecialists);
      setActiveSpecialistView({
        ...activeSpecialistView,
        portfolio: updatedPortfolio,
      });

      setIsAddingPortfolio(false);
      setNewPortfolioTitle('');
      showToast('تصویر نمونه‌کار با موفقیت در دیتابیس ثبت شد.');
    } catch (err) {
      console.error('Error saving portfolio item:', err);
      showToast('خطا در ذخیره‌سازی نمونه‌کار در سرور.');
    }
  };

  // Handler: Delete Portfolio Item (Deleted permanently from PostgreSQL portfolio_items table)
  const handleDeletePortfolioItem = async (portfolioId: string | number) => {
    if (!activeSpecialistView) return;
    try {
      const numId = Number(portfolioId);
      if (!isNaN(numId)) {
        const endpoint = isIndependentSpecialist ? `/me/portfolio/${numId}` : `/specialists/portfolio/${numId}`;
        await api.delete(endpoint).catch(() => {});
      }

      const updatedPortfolio = (activeSpecialistView.portfolio || []).filter((p: any) => String(p.id) !== String(portfolioId));

      const updatedSpecialists = specialistsList.map((spec) => {
        if (spec.id === activeSpecialistView.id) {
          return {
            ...spec,
            portfolio: updatedPortfolio,
          };
        }
        return spec;
      });

      setSpecialistsList(updatedSpecialists);
      setActiveSpecialistView({
        ...activeSpecialistView,
        portfolio: updatedPortfolio,
      });
      showToast('نمونه‌کار از پایگاه‌داده حذف شد.');
    } catch (err) {
      console.error('Error deleting portfolio item:', err);
    }
  };

  // Handler: Add Schedule Block (STRICT REQUIREMENT #3: Specialist blocks own slots)
  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    // Date must come from the calendar picker. Empty/unnormalizable input is
    // rejected instead of silently creating a block with a bogus date.
    const d = newBlockDate ? normalizeToIsoDate(newBlockDate) : null;
    if (!d) {
      showToast('روز را از روی تقویم انتخاب کنید.');
      return;
    }
    const t = newBlockTime ? normalizeTime(newBlockTime) : null;
    if (!t) {
      showToast('بازه زمانی معتبر وارد کنید (مثال: ۱۳:۰۰).');
      return;
    }

    const newBlock = {
      id: `blk-${Date.now()}`,
      specialistId: activeSpecialistView ? activeSpecialistView.id : 'general',
      date: d,
      time: t,
      reason: newBlockReason.trim() || 'استراحت',
    };
    setScheduleBlocks([...scheduleBlocks, newBlock]);
    setNewBlockDate('');
    setNewBlockReason('استراحت / وقت پر شده');
  };

  // Handler: Delete Block
  const handleDeleteBlock = (blockId: string) => {
    setScheduleBlocks(scheduleBlocks.filter((b) => b.id !== blockId));
  };

  // Handler: Save Salon Name & Address with proper try/catch and 403 error toasts
  const handleSaveSalonInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNameMissing = !editableSalonName.trim();
    const isAddressMissing = !isMobileSpecialist && !editableSalonAddress.trim();

    if (isNameMissing || isAddressMissing) {
      showToast(isNameMissing ? 'نام سالن الزامی است.' : 'آدرس دقیق برای سالن‌های ثابت الزامی است.');
      return;
    }

    if (!currentSalon?.id) {
      showToast('سالن مورد نظر یافت نشد.');
      return;
    }

    try {
      await updateSalon(currentSalon.id, {
        name: editableSalonName.trim(),
        address: editableSalonAddress.trim(),
        pendingApproval: true,
      });

      setSalonEditSuccess(true);
      showToast('اطلاعات سالن با موفقیت ثبت شد.');
      setTimeout(() => setSalonEditSuccess(false), 3500);
    } catch (err: any) {
      setSalonEditSuccess(false);
      const status = err?.response?.status;
      const errorMsg =
        status === 403
          ? 'عدم دسترسی (۴۰۳): شما به عنوان متخصص مجاز به ویرایش اطلاعات کلی سالن نیستید.'
          : err?.response?.data?.error || err?.message || 'خطا در ثبت اطلاعات سالن.';
      showToast(errorMsg);
      console.error('[SALON_INFO_UPDATE_ERROR]', err);
    }
  };

  // Handler: Save specialist's working hours
  const handleSaveWorkingHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSpecialistView) return;

    // AUDIT (P0): Working hours belong to the SPECIALIST row, not the salon.
    // The old code pushed `{ specialists: [...] }` into updateSalon(), which
    // the Zod schema strips and the DB has no column for — so hours were
    // never persisted and were lost on every reload.
    try {
      await updateSpecialist(activeSpecialistView.id, {
        workingHours: specialistWorkingHours,
        workingDays: specialistWorkingDays,
      } as any);

      const updated = specialistsList.map((s) =>
        s.id === activeSpecialistView.id
          ? { ...s, workingHours: specialistWorkingHours, workingDays: specialistWorkingDays }
          : s
      );
      setSpecialistsList(updated);
      setActiveSpecialistView({
        ...activeSpecialistView,
        workingHours: specialistWorkingHours,
        workingDays: specialistWorkingDays,
      });
      setScheduleSuccessMsg(true);
      setTimeout(() => setScheduleSuccessMsg(false), 3000);
    } catch (err) {
      console.error('[SAVE WORKING HOURS ERROR]', err);
      showToast?.('خطا در ذخیره ساعات کاری.');
    }
  };

  const handleToggleWorkingDay = (day: string) => {
    if (specialistWorkingDays.includes(day)) {
      setSpecialistWorkingDays(specialistWorkingDays.filter((d) => d !== day));
    } else {
      setSpecialistWorkingDays([...specialistWorkingDays, day]);
    }
  };

  // Independent specialist: persist the 7-day week grid to /api/me/schedule.
  const handleSaveMySchedule = async () => {
    setMyScheduleBusy(true);
    try {
      await api.put('/me/schedule', myWeeklySchedule);
      showToast('زمان‌بندی هفتگی شما ذخیره شد.');
    } catch (err: any) {
      showToast(err?.response?.data?.error || err?.message || 'خطا در ذخیره زمان‌بندی.');
    } finally {
      setMyScheduleBusy(false);
    }
  };

  const handleAddGalleryImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryImageUrl.trim()) return;
    const updatedGallery = [newGalleryImageUrl.trim(), ...salonGallery];
    setSalonGallery(updatedGallery);
    if (currentSalon?.id) {
      await updateSalon(currentSalon.id, { gallery: updatedGallery });
      showToast('تصویر گالری سالن با موفقیت در پایگاه‌داده ذخیره شد.');
    }
    setNewGalleryImageUrl('');
    setNewGalleryImageTitle('');
    setIsAddingGalleryImage(false);
  };

  const handleDeleteGalleryImage = async (imgUrl: string) => {
    const updatedGallery = salonGallery.filter((url) => url !== imgUrl);
    setSalonGallery(updatedGallery);
    if (currentSalon?.id) {
      await updateSalon(currentSalon.id, { gallery: updatedGallery });
      showToast('تصویر از گالری سالن حذف شد.');
    }
  };

  // =====================================================
  // Specialist CRUD (salon-admin feature: registered pending super-admin approval)
  // =====================================================

  // `documents` travels as a JSON string; never let a malformed value crash the panel.
  const parseSpecialistDocuments = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw.filter((u) => typeof u === 'string');
    if (typeof raw !== 'string') return [];
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string') : []; }
    catch { return []; }
  };

  const resetSpecialistForm = () => {
    setShowSpecialistForm(false);
    setEditingSpecialistId(null);
    setNewSpecialistPhone('');
    setNewSpecialistName('');
    setNewSpecialistLine('hair');
    setNewSpecialistRented(false);
    setNewSpecialistDocs([]);
  };

  const handleSaveSpecialist = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizePhone(newSpecialistPhone);
    if (!cleanPhone) { showToast('شماره همراه متخصص معتبر نیست.'); return; }
    setSpecialistBusy(true);
    try {
      const payload: any = {
        phone: cleanPhone,
        fullName: newSpecialistName.trim() || undefined,
        salonId: currentSalon?.id,
        specialtyLine: newSpecialistLine,
        isRentedChair: newSpecialistRented,
        documents: newSpecialistDocs,
      };
      if (editingSpecialistId != null) {
        await updateSpecialist(editingSpecialistId, {
          specialtyLine: newSpecialistLine,
          isRentedChair: newSpecialistRented,
          documents: newSpecialistDocs,
          ...(newSpecialistName.trim() ? { fullName: newSpecialistName.trim() } : {}),
        });
        showToast('اطلاعات متخصص ویرایش شد.');
      } else {
        await createSpecialist(payload);
        showToast('متخصص ثبت شد — پس از تایید مدارک توسط ادمین کل منتشر می‌شود.');
      }
      resetSpecialistForm();
      // Refresh the staff view (admin-salons) so the pending specialist shows
      // up immediately and survives later refetches. The old direct
      // /specialists fetch was overwritten by the next useSalons refetch.
      await queryClient.invalidateQueries({ queryKey: ['admin-salons'] });
    } catch (err: any) {
      showToast(err?.response?.data?.error || err?.message || 'خطا در ثبت متخصص.');
    } finally {
      setSpecialistBusy(false);
    }
  };

  const handleEditSpecialist = (spec: any) => {
    setEditingSpecialistId(Number(spec.id));
    setNewSpecialistPhone(spec.user?.phone || '');
    setNewSpecialistName(spec.user?.fullName || spec.name || '');
    setNewSpecialistLine(spec.specialtyLine || 'hair');
    setNewSpecialistRented(Boolean(spec.isRentedChair));
    setNewSpecialistDocs(parseSpecialistDocuments(spec.documents));
    setShowSpecialistForm(true);
  };

  const handleDeleteSpecialist = async (spec: any) => {
    if (!window.confirm(`حذف متخصص «${spec.user?.fullName || spec.name}» از سالن؟`)) return;
    try {
      await deleteSpecialist(spec.id);
      setSpecialistsList((prev) => prev.filter((s) => s.id !== spec.id));
      showToast('متخصص از سالن حذف شد.');
    } catch (err: any) {
      showToast(err?.response?.data?.error || err?.message || 'خطا در حذف متخصص.');
    }
  };

  // =====================================================
  // Commissions + weekly schedule
  // =====================================================
  const handleLoadCommissions = async () => {
    const rows = await Promise.all(specialistsList.filter((s) => !s.isRentedChair).map(async (spec) => {
      try {
        const { data } = await api.get(`/specialists/${spec.id}/commissions`);
        return { specialistId: Number(spec.id), percent: data?.commissionPercent ?? null };
      } catch { return { specialistId: Number(spec.id), percent: spec.commissionPercent ?? null }; }
    }));
    setCommissionRows(rows);
  };

  const handleSaveCommission = async (specialistId: number, percent: number | null) => {
    try {
      await updateSpecialist(specialistId, { commissionPercent: percent });
      // Only commit the optimistic row AFTER the API resolves — on a 403 the
      // server keeps the old value, so applying it first lies to the manager.
      setCommissionRows((prev) => prev.map((r) => (r.specialistId === specialistId ? { ...r, percent } : r)));
      showToast('پورسانت پیش‌فرض متخصص ذخیره شد.');
    } catch (err: any) {
      showToast(err?.response?.data?.error || err?.message || 'خطا در ذخیره پورسانت.');
      // Re-read this specialist's commissions to undo any optimistic blur.
      try {
        const { data } = await api.get(`/specialists/${specialistId}/commissions`);
        setCommissionRows((prev) => prev.map((r) => (
          r.specialistId === specialistId ? { ...r, percent: data?.commissionPercent ?? null } : r
        )));
      } catch { /* keep old rows on double failure */ }
    }
  };

  const handleLoadSchedule = async () => {
    if (!currentSalon?.id) return;
    try {
      const { data } = await api.get(`/salons/${currentSalon.id}/schedule`);
      setWeeklySchedule(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // A 403 means this salon is not ours: say so instead of rendering a
      // blank editable week the manager might then "fix".
      const denied = err?.response?.status === 403;
      setWeeklySchedule([]);
      showToast(denied
        ? 'شما به زمان‌بندی این سالن دسترسی ندارید.'
        : (err?.response?.data?.error || err?.message || 'خطا در دریافت زمان‌بندی.'));
    }
  };

  const handleSaveSchedule = async () => {
    if (!currentSalon?.id) return;
    setScheduleBusy(true);
    try {
      await api.put(`/salons/${currentSalon.id}/schedule`, weeklySchedule);
      showToast('زمان‌بندی هفتگی سالن ذخیره شد.');
    } catch (err: any) {
      showToast(err?.response?.data?.error || err?.message || 'خطا در ذخیره زمان‌بندی.');
    } finally {
      setScheduleBusy(false);
    }
  };

  const handleSpecialistAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          const res = await api.post('/upload', { base64, filename: file.name });
          if (!res.data?.url) throw new Error('پاسخ معتبری از سرور دریافت نشد.');
          const avatarUrl = res.data.url;

          await useAuthStore.getState().updateProfile({ avatar: avatarUrl });

          if (activeSpecialistView) {
            setActiveSpecialistView((prev: any) => ({
              ...prev,
              avatarUrl,
            }));
          }

          queryClient.invalidateQueries({ queryKey: ['staff'] });
          queryClient.invalidateQueries({ queryKey: ['salons'] });
          queryClient.invalidateQueries({ queryKey: ['profile'] });

          showToast('تصویر پروفایل با موفقیت در پایگاه‌داده ذخیره شد.');
        } catch (uploadErr: any) {
          console.error('Avatar upload failed', uploadErr);
          showToast(uploadErr?.response?.data?.error || uploadErr?.message || 'خطا در ذخیره‌سازی تصویر پروفایل.');
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsUploadingAvatar(false);
      showToast('خطا در پردازش فایل تصویر.');
    }
  };

  const handleSalonCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSalon?.id) return;

    try {
      setIsUploadingCover(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          const res = await api.post('/upload', { base64, filename: file.name });
          if (!res.data?.url) throw new Error('پاسخ معتبری از سرور دریافت نشد.');
          const coverUrl = res.data.url;

          await updateSalon(currentSalon.id, { coverImage: coverUrl });
          queryClient.invalidateQueries({ queryKey: ['salons'] });

          showToast('تصویر کاور سالن با موفقیت ذخیره شد.');
        } catch (uploadErr) {
          console.error('Cover upload failed', uploadErr);
          showToast('خطا در ذخیره تصویر کاور سالن.');
        } finally {
          setIsUploadingCover(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsUploadingCover(false);
      showToast('خطا در پردازش تصویر کاور.');
    }
  };

  // Specialist line metadata
  const currentSpecialistLine = activeSpecialistView
    ? SERVICE_LINES.find((l) => l.id === activeSpecialistView.specialtyLine)
    : null;

  return (
    <>
      <SEO 
        title="پنل مدیریت سالن و متخصصین" 
        description="مدیریت نوبت‌ها، خدمات، پرسنل و گزارشات مالی اختصاصی سالن‌های زیبایی در پلتفرم بویا." 
      />
      <div className="space-y-5 pb-24 animate-fadeIn">
      {/* ========================================================
          ROLE SWITCHER & CONTEXT HEADER
          Allows switching between Salon Owner and Specialists (Only for Salon Admin / Testing)
      ======================================================== */}
      {!isSpecialistRole && (
        <div className="bg-white rounded-3xl p-4 border border-[#E7E2DA] shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#173B3F]" />
              <span className="text-xs font-bold text-[#173B3F]">انتخاب سالن آزمایشی:</span>
              {user?.role === ROLES.SUPER_ADMIN ? (
                <select
                  value={selectedSalonId}
                  onChange={(e) => handleSelectSalon(e.target.value)}
                  className="text-xs font-bold bg-[#FAF7F2] border border-[#E7E2DA] text-[#173B3F] rounded-xl px-2.5 py-1.5 outline-none focus:border-[#173B3F]"
                >
                  {salonsData.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.district || s.city}) {s.isVip ? '★ VIP' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-[#173B3F] bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E7E2DA]">
                  {currentSalon?.name || 'سالن اختصاصی من'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Reusable UserHeader Component with dropdown */}
              <UserHeader />
            </div>
          </div>

          {/* Dynamic Role Selector */}
          <div className="pt-2 border-t border-[#E7E2DA] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#173B3F]" />
              <span className="text-xs font-bold text-[#173B3F]">نقش فعال در این پنل:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Salon Manager Role */}
              <button
                onClick={() => setActiveSpecialistView(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  activeSpecialistView === null
                    ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-xs'
                    : 'bg-[#FAF7F2] text-[#1C1C1C] border-[#E7E2DA] hover:border-[#173B3F]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>مدیر سالن (مدیریت کل)</span>
              </button>

              {/* Specialist Roles in this Salon */}
              {specialistsList.map((spec) => {
                const badge = getSpecialistTypeBadge(spec);
                const isSelected = activeSpecialistView?.id === spec.id;
                return (
                  <button
                    key={spec.id}
                    onClick={() => setActiveSpecialistView(spec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#173B3F] text-white border-[#173B3F] shadow-xs'
                        : 'bg-white text-[#1C1C1C] border-[#E7E2DA] hover:border-[#173B3F]'
                    }`}
                  >
                    <img src={spec.avatarUrl || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150&h=150&fit=crop'} alt={spec.user?.fullName} className="w-4 h-4 rounded-full object-cover" />
                    <span>{spec.user?.fullName}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${badge.color}`}>
                      {spec.isMobileActive
                        ? 'سیار'
                        : 'سالن'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CASE 1: DEDICATED SPECIALIST PANEL (ISOLATED VIEW)
          Strictly implements user isolation rules
      ======================================================== */}
      {activeSpecialistView ? (
        <div className="space-y-4 animate-fadeIn">
          {/* Top Return Banner */}
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#E7E2DA] shadow-xs">
            {!isSpecialistRole && !isMobileSpecialist ? (
              <button
                onClick={() => setActiveSpecialistView(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#173B3F] hover:text-[#0F3232]"
              >
                <ArrowRight className="w-4 h-4" />
                <span>بازگشت به نمای مدیریت کل سالن</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#173B3F]">
                  خوش آمدید، {activeSpecialistView?.user?.fullName || user?.fullName}
                </span>
                {isMobileSpecialist && (
                  <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-amber-700" />
                    <span>متخصص سیار (خدمات در محل مشتری — بدون وابستگی به سالن)</span>
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#2E5E52] bg-[#EAF2EF] px-3 py-1 rounded-full border border-[#6F9A8D]/30 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#2E5E52]" />
                <span>پنل اختصاصی و کاملاً ایزوله بیوتیشن</span>
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200 shadow-xs cursor-pointer"
                title="خروج از حساب"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </div>
          </div>

          {/* Specialist Hero Card (STRICT REQUIREMENT #1: NO other specialists shown here) */}
          <div className="relative rounded-3xl overflow-hidden shadow-lg border border-[#6F9A8D]/40 bg-[#173B3F] text-white">
            <div className="absolute inset-0 bg-gradient-to-r from-[#173B3F] via-[#173B3F]/90 to-transparent z-0" />
            <img
              src={activeSpecialistView.portfolio?.[0]?.imageUrl || activeSpecialistView.avatarUrl || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop'}
              alt={activeSpecialistView.user?.fullName}
              className="absolute left-0 top-0 w-2/5 h-full object-cover opacity-25 blur-xs"
            />

            <div className="relative z-10 p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative group">
                  <img
                    src={activeSpecialistView.avatarUrl || user?.avatar || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop'}
                    alt={activeSpecialistView.user?.fullName}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-3 border-[#D9A2B0] shadow-md"
                  />
                  {activeSpecialistView.isVerified && (
                    <span className="absolute -bottom-1.5 -right-1.5 bg-[#6F9A8D] text-white p-1 rounded-full shadow-xs z-10">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                  {/* Avatar Upload Overlay */}
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center cursor-pointer text-white z-20">
                    <Camera className="w-5 h-5 text-[#D9A2B0]" />
                    <span className="text-[9px] font-bold mt-1">{isUploadingAvatar ? 'در حال ارسال...' : 'تغییر تصویر'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSpecialistAvatarUpload}
                      disabled={isUploadingAvatar}
                    />
                  </label>
                  {/* Mobile Camera Button */}
                  <button
                    type="button"
                    onClick={() => specialistAvatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="sm:hidden absolute -top-1.5 -left-1.5 bg-[#D9A2B0] text-[#173B3F] p-1.5 rounded-full shadow-md z-20"
                    title="تغییر عکس پروفایل"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={specialistAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSpecialistAvatarUpload}
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold font-serif text-white">
                      {activeSpecialistView.user?.fullName}
                    </h2>
                    <span className="text-[11px] bg-white/10 px-2.5 py-0.5 rounded-full text-[#D9A2B0] font-bold border border-white/20">
                      {activeSpecialistView.user?.role}
                    </span>
                    <span className="text-[10px] bg-[#6F9A8D]/30 text-[#E8F0EF] px-2 py-0.5 rounded-full font-bold">
                      {getSpecialistTypeBadge(activeSpecialistView).label}
                    </span>
                  </div>

                  <SafeHtml 
                    html={activeSpecialistView.bio} 
                    className="text-xs text-[#E8F0EF] leading-relaxed max-w-xl"
                  />

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                    <span className="flex items-center gap-1 text-[#C99558]">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-white">{toPersianDigits(Number(activeSpecialistView?.rating || 5).toFixed(2))}</span>
                      <span className="text-[#E8F0EF]/70">({toPersianDigits(activeSpecialistView?.reviewsCount || 0)} نظر ثبت شده)</span>
                    </span>
                    <span>•</span>
                    <span className="text-[#E8F0EF]">
                      {toPersianDigits(activeSpecialistView?.experienceYears || 0)} سال سابقه حرفه‌ای
                    </span>
                    <span>•</span>
                    <span className="text-[#D9A2B0] font-mono text-xs">
                      {toPersianDigits(activeSpecialistView.user?.phone || '')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specialist Performance Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-white/10 text-xs">
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">نوبت‌های اختصاصی من:</span>
                  <span className="text-sm font-bold text-[#D9A2B0]">
                    {toPersianDigits(specialistBookings.length)} رزرو
                  </span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">نمونه‌کارهای ثبت شده من:</span>
                  <span className="text-sm font-bold text-white">{toPersianDigits(activeSpecialistView.portfolio?.length || 0)} تصویر</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">لاین تخصصی:</span>
                  <span className="text-sm font-bold text-[#6F9A8D]">
                    {currentSpecialistLine ? currentSpecialistLine.name : 'تخصصی'}
                  </span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">
                    {isMobileSpecialist ? 'شیوه ارائه خدمت:' : 'سالن همکار:'}
                  </span>
                  <span className="text-sm font-bold text-white truncate block">
                    {isMobileSpecialist ? (
                      <span className="text-[#FECE57] flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 inline text-[#FECE57]" />
                        <span>سیار (در محل مشتری)</span>
                      </span>
                    ) : (
                      currentSalon?.name
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Specialist Segmented Navigation Tabs */}
          <div className="flex p-1 bg-white rounded-2xl border border-[#E7E2DA] shadow-xs overflow-x-auto">
            <button
              onClick={() => setSpecialistTab('bookings')}
              className={`flex-1 min-w-[120px] py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                specialistTab === 'bookings'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>نوبت‌ها و رزروهای من ({toPersianDigits(specialistBookings.length)})</span>
            </button>
            <button
              onClick={() => setSpecialistTab('services')}
              className={`flex-1 min-w-[110px] py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                specialistTab === 'services'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>خدمات تخصصی من ({toPersianDigits(specialistServices.length)})</span>
            </button>
            <button
              onClick={() => setSpecialistTab('schedule')}
              className={`flex-1 min-w-[110px] py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                specialistTab === 'schedule'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>ساعات کاری و سانس‌ها</span>
            </button>
            <button
              onClick={() => setSpecialistTab('portfolio')}
              className={`flex-1 min-w-[110px] py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                specialistTab === 'portfolio'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>نمونه‌کارهای من ({toPersianDigits((activeSpecialistView.portfolio || []).length)})</span>
            </button>
            {user?.role === 'line_manager' && (
              <button
                onClick={() => setSpecialistTab('staff')}
                className={`flex-1 min-w-[125px] py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  specialistTab === 'staff'
                    ? 'bg-[#173B3F] text-white shadow-xs'
                    : 'text-[#6C6C6C] hover:text-[#173B3F]'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-[#D9A2B0]" />
                <span>مدیریت تیم و پرسنل ({toPersianDigits(staffData.length)})</span>
              </button>
            )}
            <button
              onClick={() => setSpecialistTab('financials')}
              className={`flex-1 min-w-[125px] py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                specialistTab === 'financials'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#D9A2B0]" />
              <span>درآمد و عملکرد مالی</span>
            </button>
            {!isMobileSpecialist && (
              <button
                onClick={() => setSpecialistTab('salon_info')}
                className={`flex-1 min-w-[100px] py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  specialistTab === 'salon_info'
                    ? 'bg-[#173B3F] text-white shadow-xs'
                    : 'text-[#6C6C6C] hover:text-[#173B3F]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>اطلاعات سالن</span>
              </button>
            )}
            <button
              onClick={() => setSpecialistTab('profile')}
              className={`flex-1 min-w-[100px] py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                specialistTab === 'profile'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>پروفایل من</span>
            </button>
          </div>

          {/* ----------------------------------------------------
              SPECIALIST TAB 1: BOOKINGS & RESERVATIONS (STRICT REQUIREMENT #8)
              Only own bookings, with Confirm or Reject action buttons
          ---------------------------------------------------- */}
          {specialistTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#D9A2B0]" />
                    <span>مدیریت رزروهای اختصاصی شما ({activeSpecialistView.user?.fullName})</span>
                  </h3>
                  <p className="text-xs text-[#6C6C6C] mt-0.5">
                    طبق قوانین امنیتی بویا، شما فقط به رزروهای ارجاع‌شده به خودتان دسترسی دارید و می‌توانید آن‌ها را تایید یا رد کنید.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#173B3F] bg-[#FAF7F2] px-3 py-1 rounded-full border border-[#E7E2DA]">
                  {toPersianDigits(specialistBookings.length)} نوبت در کارتابل شما
                </span>
              </div>

              {specialistBookings.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-[#E7E2DA] text-center space-y-2">
                  <Calendar className="w-10 h-10 text-[#6F9A8D] mx-auto opacity-70" />
                  <p className="text-sm font-bold text-[#173B3F]">هنوز نوبتی برای شما ثبت نشده است.</p>
                  <p className="text-xs text-[#6C6C6C]">
                    با مراجعه به اپلیکیشن مشتریان و رزرو خدمت با متخصص «{activeSpecialistView.user?.fullName}»، نوبت مستقیماً اینجا نمایان می‌شود.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {specialistBookings.map((bkg: any) => (
                    <div
                      key={bkg.id}
                      className="bg-white rounded-2xl p-4 border border-[#E7E2DA] space-y-3 shadow-xs hover:border-[#173B3F] transition-all"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1C1C1C]">{bkg.customer?.fullName}</span>
                            <span className="text-[11px] font-mono text-[#6C6C6C]">({toPersianDigits(bkg.customer?.phone || '')})</span>
                            {bkg.isMobileBooking && (
                              <span className="text-[10px] font-bold text-[#C99558] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#C99558]/30 flex items-center gap-1">
                                <Car className="w-3 h-3" />
                                <span>خدمت در محل مشتری</span>
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-[#173B3F] block">
                            سرویس: {bkg.service?.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#6C6C6C] block">
                            کد رهگیری نوبت: {bkg.trackingCode}
                          </span>
                        </div>

                        {/* Status Badge */}
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
                            ? '✓ تایید شده توسط شما'
                            : bkg.status === 'completed'
                            ? '★ خدمت انجام شده'
                            : '✕ رد شده / لغو'}
                        </span>
                      </div>

                      <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E7E2DA] text-xs flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[#1C1C1C]">
                          <Clock className="w-3.5 h-3.5 text-[#173B3F]" />
                          <span>
                            {bkg.date} — ساعت {toPersianDigits(bkg.time)} ({toPersianDigits(bkg.service?.durationMinutes || 0)} دقیقه)
                          </span>
                        </div>
                        <span className="font-bold text-[#173B3F]">
                          دستمزد مصوب: {formatPrice(bkg.price)}
                        </span>
                      </div>

                      {bkg.customerAddress && (
                        <div className="text-[11px] text-[#173B3F] bg-[#EAF2EF]/50 p-2 rounded-xl flex items-center gap-1.5 border border-[#6F9A8D]/20">
                          <MapPin className="w-3.5 h-3.5 text-[#6F9A8D] shrink-0" />
                          <span>آدرس اعزام متخصص: {bkg.customerAddress}</span>
                        </div>
                      )}

                      {bkg.notes && (
                        <div className="text-[11px] text-[#6C6C6C] italic bg-white p-2 rounded-xl border border-[#E7E2DA] flex gap-1">
                          <span>توضیحات و ترجیحات مشتری:</span>
                          <SafeHtml html={bkg.notes} tag="span" />
                        </div>
                      )}

                      {/* Specialist Action Buttons: STRICT REQUIREMENT #8 (Confirm or Reject) */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#E7E2DA]/60">
                        {bkg.status !== 'confirmed' && bkg.status !== 'completed' && (
                          <button
                            onClick={() => onUpdateBookingStatus(bkg.id, 'confirmed')}
                            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white text-xs font-bold shadow-xs transition-all"
                          >
                            <Check className="w-3.5 h-3.5 text-[#6F9A8D]" />
                            <span>تایید نوبت</span>
                          </button>
                        )}

                        {bkg.status !== 'completed' && bkg.status === 'confirmed' && (
                          <button
                            onClick={() => onUpdateBookingStatus(bkg.id, 'completed')}
                            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#6F9A8D] hover:bg-[#5a8075] text-white text-xs font-bold shadow-xs transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تکمیل خدمت و پایان نوبت</span>
                          </button>
                        )}

                        {bkg.status !== 'cancelled' && (
                          <button
                            onClick={() => onUpdateBookingStatus(bkg.id, 'cancelled')}
                            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#F8ECEE] text-[#B35D67] hover:bg-[#f2dde0] text-xs font-semibold transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>رد نوبت / عدم امکان پذیرش</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------
              SPECIALIST TAB 2: SERVICES (STRICT REQUIREMENT #2)
              Only services offered by this specialist
          ---------------------------------------------------- */}
          {specialistTab === 'services' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-[#173B3F]" />
                    <span>خدمات تخصصی قابل ارائه توسط {activeSpecialistView.user?.fullName}:</span>
                  </h3>
                  <p className="text-xs text-[#6C6C6C] mt-0.5">
                    مطابق قوانین دسترسی، شما فقط به خدمات لاین تخصصی خود ({currentSpecialistLine?.name}) دسترسی دارید و نمی‌توانید خدمات سایر همکاران را مشاهده یا ویرایش کنید.
                  </p>
                </div>

                <button
                  onClick={() => openServiceModal(null)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D9A2B0]" />
                  <span>تعریف خدمت جدید در لاین شما</span>
                </button>
              </div>

              {/* Specialist's Services List */}
              <div className="space-y-2.5">
                {specialistServices.length === 0 ? (
                  <div className="bg-white rounded-3xl p-6 border border-[#E7E2DA] text-center text-xs text-[#6C6C6C]">
                    هنوز خدمتی در این لاین تعریف نکرده‌اید. از دکمه «تعریف خدمت جدید در لاین شما» استفاده کنید.
                  </div>
                ) : (
                  specialistServices.map((serv: any) => (
                    <div
                      key={serv.id}
                      className="p-3.5 bg-white rounded-2xl border border-[#E7E2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[#173B3F] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={serv.imageUrl || PRESET_SERVICE_PHOTOS[0].url}
                          alt={serv.name}
                          onClick={() =>
                            setLightboxImage({
                              url: serv.imageUrl || PRESET_SERVICE_PHOTOS[0].url,
                              title: serv.name,
                              category: serv.description,
                              author: activeSpecialistView.user?.fullName,
                            })
                          }
                          className="w-14 h-14 rounded-xl object-cover border border-[#E7E2DA] shrink-0 cursor-pointer hover:opacity-90"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <BeautyActivityIcon activityId={serv.serviceLineId} size="sm" />
                            <span className="font-bold text-xs text-[#1C1C1C]">{serv.name}</span>
                            {serv.isMobileAvailable && (
                              <span className="text-[9px] bg-[#FAF7F2] text-[#C99558] border border-[#C99558]/30 px-1.5 py-0.2 rounded-full font-bold">
                                قابل اعزام به محل
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#6C6C6C] block mt-0.5">
                            مدت زمان اجرا: {toPersianDigits(serv.durationMinutes)} دقیقه • {serv.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E7E2DA]">
                        <div className="flex sm:flex-col items-center gap-2 sm:items-end">
                          <span className="text-xs font-bold text-[#173B3F] block">
                            {formatPrice(serv.price)}
                          </span>
                          {serv.publicationStatus === 'pending' ? (
                            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                              در انتظار تایید مدیریت
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#2E5E52] font-semibold bg-[#EAF2EF] px-2 py-0.5 rounded-full mt-0.5">
                              فعال برای نوبت‌دهی
                            </span>
                          )}
                        </div>
                        {isIndependentSpecialist && (
                          <div className="flex gap-1.5 mt-2 sm:mt-0">
                            <button
                              type="button"
                              onClick={() => handleEditService(serv)}
                              className="px-2.5 py-1 text-[10px] font-bold text-[#173B3F] border border-[#E7E2DA] rounded-lg hover:border-[#173B3F]"
                            >
                              ویرایش هزینه/مدت
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteService(serv)}
                              className="px-2.5 py-1 text-[10px] font-bold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50"
                            >
                              حذف
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              SPECIALIST TAB 3: WORKING HOURS & SCHEDULE (STRICT REQUIREMENT #3)
              Only manage own working hours and schedule blocks
          ---------------------------------------------------- */}
          {specialistTab === 'schedule' && (
            <div className="space-y-4">
              {isIndependentSpecialist ? (
                /* Independent/mobile specialist: 7-day grid rooted at the
                   specialist (specialist_weekly_schedule). */
                <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#D9A2B0]" />
                        <span>زمان‌بندی هفتگی شما</span>
                      </h3>
                      <p className="text-xs text-[#6C6C6C] mt-0.5">
                        ساعات ارائه‌ی خدمات در هر روز هفته. این برنامه برای تمامی خدمات شما اعمال می‌شود.
                      </p>
                    </div>
                    <button
                      onClick={handleSaveMySchedule}
                      disabled={myScheduleBusy}
                      className="px-4 py-2 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white text-xs font-bold disabled:opacity-50 shrink-0"
                    >
                      {myScheduleBusy ? 'در حال ذخیره…' : 'ذخیره زمان‌بندی'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {WEEKDAYS_FA.map((day, idx) => {
                      const row = myWeeklySchedule.find((r) => r.dayOfWeek === idx);
                      const isActive = row ? row.isActive : true;
                      return (
                        <div key={day.id} className="flex flex-wrap items-center gap-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA]">
                          <label className="flex items-center gap-2 w-28 shrink-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={(e) => {
                                const open = row?.openTime || '09:00';
                                const close = row?.closeTime || '18:00';
                                setMyWeeklySchedule((prev) => {
                                  const rest = prev.filter((r) => r.dayOfWeek !== idx);
                                  return [...rest, { dayOfWeek: idx, openTime: open, closeTime: close, isActive: e.target.checked }];
                                });
                              }}
                              className="accent-[#173B3F]"
                            />
                            <span className="text-sm font-bold text-[#1C1C1C]">{day.name}</span>
                          </label>
                          <input
                            type="time"
                            defaultValue={row?.openTime || '09:00'}
                            disabled={!isActive}
                            onBlur={(e) => {
                              setMyWeeklySchedule((prev) => {
                                const rest = prev.filter((r) => r.dayOfWeek !== idx);
                                return [...rest, { dayOfWeek: idx, openTime: e.target.value, closeTime: row?.closeTime || '18:00', isActive }];
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl border border-[#E7E2DA] text-sm focus:border-[#173B3F] outline-none disabled:opacity-40"
                          />
                          <span className="text-xs text-[#6C6C6C]">تا</span>
                          <input
                            type="time"
                            defaultValue={row?.closeTime || '18:00'}
                            disabled={!isActive}
                            onBlur={(e) => {
                              setMyWeeklySchedule((prev) => {
                                const rest = prev.filter((r) => r.dayOfWeek !== idx);
                                return [...rest, { dayOfWeek: idx, openTime: row?.openTime || '09:00', closeTime: e.target.value, isActive }];
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl border border-[#E7E2DA] text-sm focus:border-[#173B3F] outline-none disabled:opacity-40"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
              <>
              {/* Working Hours Card */}
              <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#D9A2B0]" />
                    <span>تنظیم ساعات کاری و روزهای حضور شما ({activeSpecialistView.user?.fullName})</span>
                  </h3>
                  <p className="text-xs text-[#6C6C6C] mt-0.5">
                    بر اساس این زمان‌بندی، اسلات‌های خالی نوبت‌دهی برای مشتریان در سامانه نمایش داده می‌شود.
                  </p>
                </div>

                <form onSubmit={handleSaveWorkingHours} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-[#1C1C1C] block mb-1">
                      ساعت کاری شیفت:
                    </label>
                    <input
                      type="text"
                      value={specialistWorkingHours}
                      onChange={(e) => setSpecialistWorkingHours(e.target.value)}
                      placeholder="مثال: ۱۰:۰۰ الی ۱۸:۰۰ یا همه روزه ۹:۳۰ الی ۲۱:۰۰"
                      className="w-full sm:w-80 h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1C1C1C] block mb-1.5">
                      روزهای فعال برای پذیرش مراجعین:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const isChecked = specialistWorkingDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleToggleWorkingDay(day)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                              isChecked
                                ? 'bg-[#173B3F] text-white border-[#173B3F]'
                                : 'bg-[#FAF7F2] text-[#6C6C6C] border-[#E7E2DA]'
                            }`}
                          >
                            {isChecked ? '✓ ' : ''}{day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>ذخیره ساعات کاری من</span>
                    </button>
                    {scheduleSuccessMsg && (
                      <span className="text-xs font-bold text-[#2E5E52] flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ساعات کاری اختصاصی شما به‌روزرسانی شد.</span>
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* Schedule Blocks for Specialist Only */}
              <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-1.5">
                      <Ban className="w-4 h-4 text-[#B35D67]" />
                      <span>مسدودسازی سانس‌های شخصی شما (Schedule Blocks)</span>
                    </h3>
                    <p className="text-xs text-[#6C6C6C] mt-0.5">
                      ساعت‌های استراحت، مرخصی ساعتی یا رزروهای حضوری شخصی را قفل کنید تا تداخل نوبت ایجاد نشود.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAddBlock} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <JalaliDatePicker
                    selectedDate={newBlockDate}
                    onDateChange={(jalaliStr) => setNewBlockDate(jalaliStr)}
                    label="روز مسدودسازی:"
                    placeholder="انتخاب روز از تقویم..."
                    minDate={new Date()}
                  />
                  <input
                    type="text"
                    required
                    placeholder="بازه زمانی (مثال: ۱۳:۰۰ الی ۱۴:۰۰)"
                    value={newBlockTime}
                    onChange={(e) => setNewBlockTime(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="علت بلاک (مثال: نوبت تلفنی)"
                    value={newBlockReason}
                    onChange={(e) => setNewBlockReason(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                  />
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232]"
                    >
                      افزودن بلاک به تقویم شخصی من
                    </button>
                  </div>
                </form>

                {/* List of specialist's blocks */}
                <div className="space-y-2 pt-2">
                  {specialistBlocks.length === 0 ? (
                    <p className="text-xs text-[#6C6C6C] italic">هیچ سانس مسدودی در تقویم شما ثبت نشده است.</p>
                  ) : (
                    specialistBlocks.map((blk) => (
                      <div
                        key={blk.id}
                        className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#173B3F] block">
                            {blk.date} — ساعت {toPersianDigits(blk.time)}
                          </span>
                          <span className="text-[11px] text-[#6C6C6C]">علت: {blk.reason}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteBlock(blk.id)}
                          className="text-xs text-[#B35D67] hover:underline font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف بلاک</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              </>
              )}
            </div>
          )}

          {/* ----------------------------------------------------
              SPECIALIST TAB 4: PORTFOLIO (STRICT REQUIREMENT #4)
              Only own portfolio items can be viewed and managed
          ---------------------------------------------------- */}
          {specialistTab === 'portfolio' && (
            <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#D9A2B0]" />
                    <span>آلبوم نمونه‌کارهای ژورنالی اختصاصی شما ({toPersianDigits((activeSpecialistView.portfolio || []).length)} اثر)</span>
                  </h3>
                  <p className="text-xs text-[#6C6C6C] mt-0.5">
                    این نمونه‌کارها در پروفایل عمومی شما در اپ مشتریان بویا نمایش داده می‌شود و مشتریان برای رزرو روی آن‌ها کلیک می‌کنند.
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
                  <h4 className="text-xs font-bold text-[#173B3F]">بارگذاری عکس کار جدید در ژورنال شخصی</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  </div>

                  <ImageFileUploader
                    label="آپلود عکس کار یا گرفتن تصویر با دوربین"
                    subLabel="فایل‌های تصویری با فشرده‌سازی خودکار و کاهش حجم WebP روی سرور ثبت می‌شوند"
                    value={newPortfolioUrl}
                    onChange={(url) => setNewPortfolioUrl(url)}
                    allowCamera={true}
                  />

                  <div>
                    <span className="text-[11px] text-[#6C6C6C] block mb-1.5">یا انتخاب از نمونه‌کارهای ژورنالی:</span>
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
                      افزودن به گالری نمونه‌کارهای من
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
                {(activeSpecialistView.portfolio || []).map((item: any) => (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl overflow-hidden border border-[#E7E2DA] bg-[#FAF7F2] shadow-xs hover:border-[#173B3F] transition-all"
                  >
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        onClick={() =>
                          setLightboxImage({
                            url: item.imageUrl,
                            title: item.title,
                            category: item.category,
                            author: activeSpecialistView.name,
                          })
                        }
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 pointer-events-none" />

                      <div className="absolute top-2 right-2">
                        <span className="text-[10px] font-bold bg-[#173B3F]/80 text-white px-2 py-0.5 rounded-full backdrop-blur-xs">
                          {item.category}
                        </span>
                      </div>

                      {/* Delete item button */}
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePortfolioItem(item.id);
                          }}
                          className="w-7 h-7 rounded-full bg-[#B35D67] text-white flex items-center justify-center hover:bg-red-700 shadow-sm"
                          title="حذف نمونه‌کار"
                          aria-label="حذف نمونه‌کار"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="absolute bottom-2 right-2 left-2 text-white pointer-events-none">
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
          )}

          {/* ----------------------------------------------------
              SPECIALIST TAB 5: SALON INFO (STRICT REQUIREMENTS #5 & #6)
              - If Mobile Specialist => NO ACCESS AT ALL (Requirement #6)
              - If Salon Specialist or Independent Specialist => ONLY Name & Address (Requirement #5)
          ---------------------------------------------------- */}
          {specialistTab === 'salon_info' && !isMobileSpecialist && (
            <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-4 shadow-xs">
              {activeSpecialistView.isMobileSpecialist || activeSpecialistView.specialistType === 'mobile_specialist' ? (
                /* REQUIREMENT #6: Mobile Specialist has NO ACCESS to edit salon information */
                <div className="p-6 rounded-2xl bg-[#FAF7F2] border border-[#C99558]/30 space-y-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#C99558]/15 text-[#C99558] flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[#173B3F]">
                    عدم دسترسی به بخش ویرایش اطلاعات سالن
                  </h3>
                  <p className="text-xs text-[#6C6C6C] leading-relaxed max-w-lg mx-auto">
                    طبق قوانین امنیتی و نقش‌های پلتفرم بویا، به عنوان <strong className="text-[#C99558]">متخصص سیار (Mobile Specialist)</strong>، شما به بخش ویرایش اطلاعات سالن دسترسی ندارید زیرا کلیه خدمات شما مستقیماً در آدرس و محل مشتری (Home Service) ارائه می‌گردد.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E7E2DA] text-xs text-[#173B3F]">
                    <Car className="w-4 h-4 text-[#C99558]" />
                    <span>محدوده فعالیت شما: خدمات در محل مشتری</span>
                  </div>
                </div>
              ) : (
                /* REQUIREMENT #5: Salon Specialist and Independent Specialist CAN ONLY edit Salon Name and Address */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DA]">
                    <div>
                      <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#173B3F]" />
                        <span>ویرایش اطلاعات سالن همکار (محدود به نام و آدرس)</span>
                      </h3>
                      <p className="text-xs text-[#6C6C6C] mt-0.5">
                        بر اساس قوانین دسترسی پلتفرم بویا: متخصص سالن و متخصص مستقل صرفاً به بخش‌های «نام سالن» و «آدرس سالن» دسترسی دارند. سایر تنظیمات (مدیریت پرسنل، مالی، درصدها و کمیسیون) توسط مدیریت کل سالن کنترل می‌شود.
                      </p>
                    </div>
                    <span className="text-[10px] bg-[#EAF2EF] text-[#2E5E52] px-2.5 py-1 rounded-full font-bold border border-[#6F9A8D]/30 shrink-0">
                      دسترسی محدود: نام و آدرس
                    </span>
                  </div>

                  <form onSubmit={handleSaveSalonInfo} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 max-w-2xl">
                      {/* Editable Field 1: Salon Name */}
                      <div>
                        <label className="text-xs font-bold text-[#1C1C1C] block mb-1 flex items-center justify-between">
                          <span>نام سالن:</span>
                          <span className="text-[10px] text-[#6F9A8D]">قابل ویرایش توسط شما</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editableSalonName}
                          onChange={(e) => setEditableSalonName(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-[#173B3F] text-xs text-[#1C1C1C] focus:ring-2 focus:ring-[#173B3F]/20 outline-none"
                        />
                      </div>

                      {/* Editable Field 2: Salon Address */}
                      <div>
                        <label className="text-xs font-bold text-[#1C1C1C] block mb-1 flex items-center justify-between">
                          <span>آدرس دقیق سالن:</span>
                          <span className="text-[10px] text-[#6F9A8D]">قابل ویرایش توسط شما</span>
                        </label>
                        <textarea
                          rows={2}
                          required={!isMobileSpecialist}
                          value={editableSalonAddress}
                          onChange={(e) => setEditableSalonAddress(e.target.value)}
                          placeholder={isMobileSpecialist ? "آدرس برای متخصص سیار اختیاری است (خدمات در محل مشتری ارائه می‌شود)" : "آدرس دقیق سالن خود را وارد کنید..."}
                          className="w-full p-3 rounded-xl border border-[#173B3F] text-xs text-[#1C1C1C] focus:ring-2 focus:ring-[#173B3F]/20 outline-none leading-relaxed"
                        />
                      </div>

                      {/* Locked Fields: Read-only display to reinforce permission boundaries */}
                      <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[#6C6C6C]">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Lock className="w-3.5 h-3.5 text-[#6C6C6C]" />
                            <span>بخش‌های قفل شده (فقط مدیر سالن):</span>
                          </span>
                          <span className="text-[10px]">دسترسی غیرمجاز برای متخصص</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#6C6C6C] pt-1">
                          <div className="p-2 bg-white rounded-xl border border-[#E7E2DA]">
                            <span>شناسه مالیاتی و مجوز:</span> <strong className="font-mono text-[#173B3F]">{currentSalon.tenantId}</strong>
                          </div>
                          <div className="p-2 bg-white rounded-xl border border-[#E7E2DA]">
                            <span>شماره تماس مدیریت:</span> <strong className="font-mono text-[#173B3F]">{toPersianDigits(currentSalon.phone)}</strong>
                          </div>
                          <div className="p-2 bg-white rounded-xl border border-[#E7E2DA]">
                            <span>وضعیت اشتراک VIP:</span> <strong>{currentSalon.isVip ? 'فعال' : 'عادی'}</strong>
                          </div>
                          <div className="p-2 bg-white rounded-xl border border-[#E7E2DA]">
                            <span>کادر پرسنل و دستمزدها:</span> <strong>مدیریت اختصاصی مالک سالن</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5 text-[#D9A2B0]" />
                        <span>ذخیره تغییرات نام و آدرس سالن</span>
                      </button>

                      {salonEditSuccess && (
                        <span className="text-xs font-bold text-[#2E5E52] flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>نام و آدرس سالن با موفقیت به‌روزرسانی شد.</span>
                        </span>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------
              SPECIALIST TAB 6: PROFILE (STRICT REQUIREMENT #1)
              Specialist's own profile ONLY. NO OTHER SPECIALISTS VISIBLE!
          ---------------------------------------------------- */}
          {specialistTab === 'profile' && (
            <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DA]">
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#D9A2B0]" />
                    <span>اطلاعات پروفایل شخصی بیوتیشن</span>
                  </h3>
                  <p className="text-xs text-[#6C6C6C] mt-0.5">
                    این صفحه صرفاً اطلاعات شما را شامل می‌شود و هیچ دسترسی به پروفایل سایر متخصصان وجود ندارد.
                  </p>
                </div>
                <span className="text-[10px] bg-[#EAF2EF] text-[#2E5E52] px-2.5 py-0.5 rounded-full font-bold">
                  ایزولاسیون کامل حریم خصوصی
                </span>
              </div>

              {/* Specialist Profile Photo Card */}
              <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group">
                  <img
                    src={activeSpecialistView.avatarUrl || user?.avatar || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop'}
                    alt={activeSpecialistView.user?.fullName}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-[#173B3F] shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => specialistAvatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute -bottom-1 -left-1 p-1.5 rounded-full bg-[#173B3F] text-white hover:bg-[#0F3232] shadow-md transition-all"
                    title="تغییر تصویر چهره"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1 text-center sm:text-right flex-1">
                  <span className="text-xs font-bold text-[#173B3F] block">تصویر نمایه پرسنلی</span>
                  <p className="text-[11px] text-[#6C6C6C]">این تصویر در صفحه رزرو نوبت به مشتریان نمایش داده می‌شود و به‌صورت دائمی در سرور ذخیره می‌شود.</p>
                  <button
                    type="button"
                    onClick={() => specialistAvatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="text-xs text-[#2E5E52] font-bold hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploadingAvatar ? 'در حال ارسال تصویر...' : 'آپلود تصویر جدید چهره'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-1">
                  <span className="text-[#6C6C6C] block">نام و نام خانوادگی:</span>
                  <span className="font-bold text-[#1C1C1C] text-sm">{activeSpecialistView.user?.fullName}</span>
                </div>
                <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-1">
                  <span className="text-[#6C6C6C] block">سمت و تخصص:</span>
                  <span className="font-bold text-[#173B3F] text-sm">{activeSpecialistView.user?.role}</span>
                </div>
                <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-1">
                  <span className="text-[#6C6C6C] block">شماره تماس اختصاصی:</span>
                  <span className="font-mono font-bold text-[#1C1C1C] text-sm">{toPersianDigits(activeSpecialistView.user?.phone || '')}</span>
                </div>
                <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-1">
                  <span className="text-[#6C6C6C] block">نوع همکاری:</span>
                  <span className="font-bold text-[#1C1C1C] text-sm">
                    {getSpecialistTypeBadge(activeSpecialistView).label}
                  </span>
                </div>
                <div className="sm:col-span-2 p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] space-y-1">
                  <span className="text-[#6C6C6C] block">بیوگرافی و مدارک بین‌المللی:</span>
                  <p className="text-xs text-[#1C1C1C] leading-relaxed">{activeSpecialistView.bio}</p>
                </div>
              </div>
            </div>
          )}

          {/* SPECIALIST TAB 7: MONTHLY REVENUE & RECHARTS FINANCIAL PERFORMANCE */}
          {specialistTab === 'financials' && (
            <SpecialistFinancialsView
              specialist={activeSpecialistView}
              bookings={bookingsData}
              salonName={currentSalon?.name || ''}
            />
          )}

          {/* SPECIALIST TAB 8: STAFF MANAGEMENT (LINE MANAGER ONLY) */}
          {specialistTab === 'staff' && user?.role === 'line_manager' && (
            <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DA]">
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#D9A2B0]" />
                    <span>مدیریت پرسنل لاین {user.managedLine}</span>
                  </h3>
                  <p className="text-xs text-[#6C6C6C] mt-0.5">
                    شما به عنوان مدیر لاین، مسئول نظارت بر فعالیت و تایید نوبت‌های تیم خود هستید.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {staffData.length === 0 ? (
                  <div className="text-center py-8 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E7E2DA]">
                    <Users className="w-10 h-10 text-[#6C6C6C]/30 mx-auto mb-2" />
                    <p className="text-xs text-[#6C6C6C]">هنوز پرسنلی به لاین شما تخصیص نیافته است.</p>
                  </div>
                ) : (
                  staffData.map((member: any) => (
                    <div key={member.id} className="p-4 bg-white rounded-2xl border border-[#E7E2DA] flex items-center justify-between hover:border-[#173B3F] transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#173B3F] text-[#D9A2B0] flex items-center justify-center font-bold text-xs">
                          {member.fullName.charAt(0)}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#173B3F] block">{member.fullName}</span>
                          <span className="text-[10px] text-[#6C6C6C] font-mono">{toPersianDigits(member.phone)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${member.status === 'suspended' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                          {member.status === 'suspended' ? 'معلق' : 'فعال'}
                        </span>
                        <button className="p-1.5 bg-[#FAF7F2] rounded-lg text-[#173B3F] hover:bg-[#173B3F] hover:text-white transition-colors border border-[#E7E2DA]">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* NOTE FOR REQUIREMENT #7:
              When activeSpecialistView !== null, the bottom specialists showcase is NOT RENDERED!
              Specialists do NOT have access to the specialists showcase at the bottom of the page.
          */}
        </div>
      ) : isMobileSpecialist ? (
        <div className="bg-white rounded-3xl p-8 border border-[#E7E2DA] shadow-xs text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center mx-auto">
            <Car className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#173B3F]">پنل اختصاصی متخصص سیار مستقل</h3>
          <p className="text-xs text-[#6C6C6C] max-w-md mx-auto leading-relaxed">
            به عنوان متخصص سیار، شما سالن فیزیکی ندارید و کلیه خدمات شما مستقیماً در محل مشتری ارائه می‌شوند. دسترسی به داده‌ها و مدیریت سالن‌ها برای شما مسدود است.
          </p>
        </div>
      ) : (
        /* ========================================================
            CASE 2: SALON MANAGEMENT MAIN DASHBOARD (OWNER VIEW)
            Only rendered when activeSpecialistView === null
        ======================================================== */
        <>
          {!currentSalon ? (
            /* Scoped role with no salon record (or still loading): show an
               empty state instead of fabricating a foreign/fake salon. */
            <div className="bg-white rounded-3xl p-8 border border-[#E7E2DA] shadow-xs text-center space-y-3">
              <Building2 className="w-10 h-10 text-[#6F9A8D] mx-auto" />
              <h3 className="text-base font-bold text-[#173B3F]">
                {isLoadingSalons ? 'در حال بارگذاری اطلاعات سالن…' : 'سالن شما هنوز ثبت نشده است'}
              </h3>
              {!isLoadingSalons && (
                <p className="text-xs text-[#6C6C6C] max-w-md mx-auto leading-relaxed">
                  حساب شما به سالنی متصل نیست. از مدیر کل بخواهید پروفایل سالن شما را ایجاد کند.
                </p>
              )}
            </div>
          ) : (
          <>
          {/* Salon Identification Hero Card */}
          <div className="relative rounded-3xl overflow-hidden shadow-lg border border-[#6F9A8D]/40 bg-[#173B3F] text-white">
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
                      <span className="font-bold text-white">{toPersianDigits(Number(currentSalon?.rating || 5).toFixed(2))}</span>
                      <span className="text-[#E8F0EF]/80">({toPersianDigits(currentSalon?.reviewsCount || 0)} نظر ثبت شده)</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => salonCoverInputRef.current?.click()}
                    disabled={isUploadingCover}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                    title="تغییر تصویر کاور سالن"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#D9A2B0]" />
                    <span>{isUploadingCover ? 'در حال ذخیره...' : 'تغییر کاور سالن'}</span>
                  </button>
                  <input
                    ref={salonCoverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSalonCoverUpload}
                  />
                  <button
                    onClick={() => setSalonTab('gallery')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[#D9A2B0]" />
                    <span>گالری فضا ({toPersianDigits(salonGallery.length)})</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-white/10 text-xs">
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-[#E8F0EF]/80 block">نوبت‌های جاری سالن:</span>
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
            <button
              onClick={() => { setSalonTab('commissions'); handleLoadCommissions(); }}
              className={`flex-1 min-w-[110px] py-2 text-xs font-bold rounded-xl transition-all ${
                salonTab === 'commissions'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              پورسانت متخصصین
            </button>
            <button
              onClick={() => { setSalonTab('weekly_schedule'); handleLoadSchedule(); }}
              className={`flex-1 min-w-[110px] py-2 text-xs font-bold rounded-xl transition-all ${
                salonTab === 'weekly_schedule'
                  ? 'bg-[#173B3F] text-white shadow-xs'
                  : 'text-[#6C6C6C] hover:text-[#173B3F]'
              }`}
            >
              زمان‌بندی سالن
            </button>
          </div>

          {/* TAB 0: OVERVIEW (Salon Manager Overview) */}
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

              {/* Specialists Spotlight Section (Visible ONLY in Salon Manager Overview) */}
              <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#6F9A8D]" />
                      <span>کادر متخصصین و بیوتیشن‌ها (Specialists Showcase)</span>
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
                  {specialistsList.map((spec) => {
                    const badge = getSpecialistTypeBadge(spec);
                    return (
                      <div
                        key={spec.id}
                        className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] hover:border-[#173B3F] transition-all space-y-3 cursor-pointer group"
                        onClick={() => setActiveSpecialistView(spec)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={spec.avatarUrl || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150&h=150&fit=crop'}
                              alt={spec.user?.fullName}
                              className="w-13 h-13 rounded-2xl object-cover border-2 border-[#D9A2B0] shrink-0"
                            />
                            {spec.isVerified && (
                              <span className="absolute -bottom-1 -right-1 bg-[#6F9A8D] text-white p-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-[#1C1C1C] truncate">{spec.user?.fullName}</h4>
                              <div className="flex items-center gap-0.5 text-[#C99558]">
                                <Star className="w-3 h-3 fill-current" />
                                <span className="text-[11px] font-bold text-[#1C1C1C]">{toPersianDigits(Number(spec?.rating || 5).toFixed(2))}</span>
                              </div>
                            </div>
                            <span className="text-[11px] text-[#173B3F] font-semibold block truncate">{spec.user?.role}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${badge.color}`}>
                                {badge.label}
                              </span>
                              <span className="text-[10px] text-[#6C6C6C]">
                                {toPersianDigits(spec.experienceYears || 0)} سال سابقه
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Mini portfolio thumbnails preview */}
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {spec.portfolio?.slice(0, 3).map((p: any) => (
                            <div key={p.id} className="w-14 h-14 rounded-xl overflow-hidden border border-[#E7E2DA] shrink-0 relative">
                              <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                          ))}
                          <div className="flex-1 h-14 rounded-xl bg-white border border-dashed border-[#6F9A8D]/60 flex items-center justify-center text-[10px] text-[#173B3F] font-bold px-2 text-center group-hover:bg-[#173B3F] group-hover:text-white transition-colors">
                            ورود به پنل متخصص
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                        src={serv.imageUrl || PRESET_SERVICE_PHOTOS[0].url}
                        alt={serv.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#E7E2DA]"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-[#1C1C1C] block truncate">{serv.name}</span>
                        <span className="text-[10px] text-[#6C6C6C] block truncate mt-0.5">{serv.description}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-bold text-[#173B3F]">{formatPrice(Number(serv.price))}</span>
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

          {/* TAB 1: Real-time Bookings Manager (Salon Wide) */}
          {salonTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-[#173B3F]">
                  نوبت‌های کلی سالن {currentSalon.name}:
                </h3>
                <span className="text-[11px] text-[#6C6C6C]">
                  همگام با سیستم نوبت‌دهی بویا ({toPersianDigits(salonBookings.length)} نوبت)
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
                  {salonBookings.map((bkg: any) => {
                    const matchedService = salonServices.find((s: any) => s.id === bkg.serviceId);

                    return (
                      <div
                        key={bkg.id}
                        className="bg-white rounded-2xl p-4 border border-[#E7E2DA] space-y-3 shadow-xs hover:border-[#173B3F] transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={matchedService?.imageUrl || PRESET_SERVICE_PHOTOS[0].url}
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
                                {bkg.service?.name} با متخصص {bkg.specialist?.user?.fullName}
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
                            مبلغ: {formatPrice(Number(bkg.price))}
                          </span>
                        </div>

                        {bkg.notes && (
                          <p className="text-[11px] text-[#6C6C6C] italic">
                            ملاحظات مشتری: {bkg.notes}
                          </p>
                        )}

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

          {/* TAB 2: Gallery Manager */}
          {salonTab === 'gallery' && (
            <div className="space-y-4">
              {/* نمونه‌کار خدمات — per-service sample-work images, all lines
                   except rented-chair (independent) specialists' services,
                   which the server refuses (403) because they belong to the
                   specialist, not the salon. */}
              <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#173B3F] flex items-center gap-1.5">
                      <Scissors className="w-4 h-4 text-[#173B3F]" />
                      <span>نمونه‌کار خدمات سالن ({toPersianDigits(salonServices.length)} خدمت)</span>
                    </h3>
                    <p className="text-xs text-[#6C6C6C] mt-0.5">
                      برای هر خدمت، تصاویر نمونه‌کار را در همه لاین‌ها مدیریت کنید. خدمات متخصصین مستقل (صندلی اجاره‌داده‌شده) در این لیست نیست چون نمونه‌کارهای آن لاین را خود متخصص مدیریت می‌کند.
                    </p>
                  </div>
                </div>

                {salonServices.length === 0 ? (
                  <p className="text-xs text-[#6C6C6C] py-3 text-center">هنوز خدمتی در این سالن تعریف نشده است.</p>
                ) : (
                  <div className="space-y-2">
                    {salonServices.map((serv: any) => {
                      const items = servicePortfolio[serv.id] || [];
                      const isBusy = portfolioBusyServiceId === serv.id;
                      return (
                        <div key={serv.id} className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <BeautyActivityIcon activityId={serv.serviceLineId} size="sm" />
                              <span className="text-sm font-bold text-[#1C1C1C]">{serv.name}</span>
                              <span className="text-[10px] text-[#6C6C6C] bg-white border border-[#E7E2DA] px-2 py-0.5 rounded-full">
                                {toPersianDigits(items.length)} تصویر
                              </span>
                            </div>
                            <button
                              onClick={() => handleLoadServicePortfolio(serv.id)}
                              disabled={isBusy}
                              className="px-3 py-1 text-[11px] font-bold text-[#173B3F] border border-[#E7E2DA] rounded-lg hover:border-[#173B3F] disabled:opacity-50"
                            >
                              {isBusy ? 'در حال بارگذاری…' : (items.length > 0 ? 'بازخوانی نمونه‌کارها' : 'مشاهده/افزودن نمونه‌کار')}
                            </button>
                          </div>

                          {(serv.id in servicePortfolio) && (
                            <div className="mt-2.5 pt-2.5 border-t border-[#E7E2DA] space-y-2">
                              <ServicePortfolioRow
                                items={items}
                                onAdd={(imageUrl, title) => handleAddServicePortfolio(serv.id, imageUrl, title)}
                                onDelete={(itemId) => handleDeleteServicePortfolio(serv.id, itemId)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* گالری فضای سالن — unchanged salon-space gallery. */}
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

              {isAddingGalleryImage && (
                <form onSubmit={handleAddGalleryImage} className="p-4 bg-white rounded-3xl border border-[#173B3F] space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold text-[#173B3F]">ثبت عکس جدید از سالن و تجهیزات</h4>
                  <div>
                    <input
                      type="text"
                      placeholder="عنوان یا بخش سالن (مثال: سوئیت VIP عروس و فیشیال)"
                      value={newGalleryImageTitle}
                      onChange={(e) => setNewGalleryImageTitle(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                    />
                  </div>

                  <ImageFileUploader
                    label="تصویر فضا، تجهیزات یا دکوراسیون سالن"
                    subLabel="فایل خود را از حافظه لوکال انتخاب کنید یا با دوربین عکاسی بگیرید"
                    value={newGalleryImageUrl}
                    onChange={(url) => setNewGalleryImageUrl(url)}
                    allowCamera={true}
                  />
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGalleryImage(imgUrl);
                      }}
                      className="absolute top-2 left-2 p-1.5 rounded-full bg-red-600/80 hover:bg-red-700 text-white shadow-xs transition-colors z-20"
                      title="حذف تصویر از گالری"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

          {/* TAB 3: All Services */}
          {salonTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F]">
                    لیست کلی خدمات، نرخ‌نامه مصوب و تصاویر نتایج سالن:
                  </h3>
                  <p className="text-xs text-[#6C6C6C]">
                    مدیریت تعرفه‌ها و عکس‌های نمونه کار برای همه لاین‌ها
                  </p>
                </div>
                <button
                  onClick={() => openServiceModal(null)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D9A2B0]" />
                  <span>تعریف خدمت جدید</span>
                </button>
              </div>


              <div className="space-y-2.5">
                {salonServices.map((serv) => (
                  <div
                    key={serv.id}
                    className="p-3.5 bg-white rounded-2xl border border-[#E7E2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[#173B3F] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={serv.imageUrl || PRESET_SERVICE_PHOTOS[0].url}
                        alt={serv.name}
                        onClick={() =>
                          setLightboxImage({
                            url: serv.imageUrl || PRESET_SERVICE_PHOTOS[0].url,
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
                        {(serv.specialistNames || []).length > 0 && (
                          <span className="text-[10px] text-[#2E5E52] font-semibold block mt-0.5">
                            ارائه‌دهندگان: {(serv.specialistNames as string[]).join('، ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E7E2DA]">
                      <span className="text-xs font-bold text-[#173B3F] block">
                        {formatPrice(serv.price)}
                      </span>
                      <span className="text-[10px] text-[#2E5E52] font-semibold bg-[#EAF2EF] px-2 py-0.5 rounded-full mt-0.5">
                        {serv.publicationStatus === 'pending' ? 'در انتظار تایید' : 'فعال در ویترین'}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleEditService(serv)}
                          className="px-2.5 py-1 rounded-full border border-[#E7E2DA] hover:border-[#173B3F] text-[#173B3F] text-[10px] font-bold transition-all"
                        >
                          ویرایش
                        </button>
                        <button
                          onClick={() => handleDeleteService(serv)}
                          className="px-2.5 py-1 rounded-full border border-red-200 hover:border-red-400 text-red-600 text-[10px] font-bold transition-all"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Specialists Management (Full Team Showcase for Manager) */}
          {salonTab === 'specialists' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-bold text-[#173B3F]">
                    کادر متخصصین و بیوتیشن‌های سالن ({toPersianDigits(specialistsList.length)} نفر):
                  </h3>
                  <p className="text-xs text-[#6C6C6C]">
                    نمونه‌کارهای ژورنالی، آلبوم مشتریان و امکان ورود به پنل اختصاصی بیوتیشن
                  </p>
                </div>
                <button
                  onClick={() => { resetSpecialistForm(); setShowSpecialistForm(true); }}
                  className="px-4 py-2 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <span>+ افزودن متخصص جدید</span>
                </button>
              </div>

              {showSpecialistForm && (
                <form onSubmit={handleSaveSpecialist} className="bg-white rounded-3xl p-5 border border-[#173B3F] space-y-3 shadow-sm">
                  <h4 className="text-sm font-bold text-[#173B3F]">
                    {editingSpecialistId != null ? 'ویرایش متخصص' : 'ثبت متخصص جدید برای سالن'}
                  </h4>
                  <p className="text-[11px] text-[#6C6C6C]">
                    متخصص پس از ثبت، در حالت «در انتظار تایید» قرار می‌گیرد و پس از بررسی مدارک توسط ادمین کل در اپ مشتری منتشر می‌شود.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={newSpecialistPhone}
                      onChange={(e) => setNewSpecialistPhone(e.target.value)}
                      placeholder="شماره همراه متخصص (۰۹۱۲…)"
                      disabled={editingSpecialistId != null}
                      className="px-4 py-2.5 rounded-2xl border border-[#E7E2DA] text-sm focus:border-[#173B3F] outline-none disabled:bg-gray-100"
                    />
                    <input
                      value={newSpecialistName}
                      onChange={(e) => setNewSpecialistName(e.target.value)}
                      placeholder="نام و نام خانوادگی"
                      className="px-4 py-2.5 rounded-2xl border border-[#E7E2DA] text-sm focus:border-[#173B3F] outline-none"
                    />
                    <select
                      value={newSpecialistLine}
                      onChange={(e) => setNewSpecialistLine(e.target.value)}
                      className="px-4 py-2.5 rounded-2xl border border-[#E7E2DA] text-sm focus:border-[#173B3F] outline-none"
                    >
                      {SERVICE_LINES.filter((l) => l.id !== 'all').map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#E7E2DA] text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newSpecialistRented}
                        onChange={(e) => setNewSpecialistRented(e.target.checked)}
                        className="accent-[#173B3F]"
                      />
                      <span>متخصص مستقل (صندلی اجاره‌داده‌شده)</span>
                    </label>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#173B3F] block mb-1.5">مدارک متخصص (لینک تصویر)
                      <span className="text-[10px] font-normal text-[#6C6C6C] mr-1">برای تایید ادمین کل الزامی است</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {newSpecialistDocs.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#E7E2DA]">
                          <img src={url} alt={`document-${i}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewSpecialistDocs((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center"
                          >×</button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setNewSpecialistDocs((prev) => [...prev, PRESET_SERVICE_PHOTOS[0].url])}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-[#D5CEC4] text-[#6C6C6C] text-xs flex items-center justify-center hover:border-[#173B3F]"
                      >+ افزودن</button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={specialistBusy}
                      className="px-5 py-2 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white text-xs font-bold disabled:opacity-50"
                    >
                      {specialistBusy ? 'در حال ذخیره…' : (editingSpecialistId != null ? 'ذخیره ویرایش' : 'ثبت متخصص')}
                    </button>
                    <button
                      type="button"
                      onClick={resetSpecialistForm}
                      className="px-5 py-2 rounded-full border border-[#E7E2DA] text-xs font-bold text-[#6C6C6C]"
                    >انصراف</button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {specialistsList.map((spec) => {
                  const badge = getSpecialistTypeBadge(spec);
                  return (
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-[#1C1C1C]">
                                {spec.name}
                              </h4>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge.color}`}>
                                {badge.label}
                              </span>
                              {(spec.publicationStatus === 'pending' || spec.publicationStatus === 'approved') && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                  در انتظار تایید مدیریت
                                </span>
                              )}
                              {spec.isRentedChair && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                  صندلی اجاره‌داده‌شده
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-[#6C6C6C] mt-0.5 max-w-lg line-clamp-1">
                              {spec.bio}
                            </p>

                            <div className="flex items-center gap-3 mt-1.5 text-xs text-[#6C6C6C]">
                              <span className="flex items-center gap-1 text-[#C99558]">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="font-bold text-[#1C1C1C]">{toPersianDigits(Number(spec?.rating || 5).toFixed(2))}</span>
                              </span>
                              <span>•</span>
                              <span>{toPersianDigits(spec.experienceYears || 0)} سال سابقه</span>
                              <span>•</span>
                              <span className="font-mono text-[11px]">{toPersianDigits(spec.user?.phone || '')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => setActiveSpecialistView(spec)}
                            className="px-4 py-2 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-[#D9A2B0]" />
                            <span>پنل اختصاصی</span>
                          </button>
                          <button
                            onClick={() => handleEditSpecialist(spec)}
                            className="px-3 py-2 rounded-full border border-[#E7E2DA] hover:border-[#173B3F] text-[#173B3F] text-xs font-bold transition-all"
                          >
                            ویرایش
                          </button>
                          <button
                            onClick={() => handleDeleteSpecialist(spec)}
                            className="px-3 py-2 rounded-full border border-red-200 hover:border-red-400 text-red-600 text-xs font-bold transition-all"
                          >
                            حذف
                          </button>
                        </div>
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
                          {(spec.portfolio || []).map((p: any) => (
                            <div
                              key={p.id}
                              onClick={() =>
                                setLightboxImage({
                                  url: p.imageUrl,
                                  title: p.title,
                                  category: p.category,
                                  author: spec.user?.fullName,
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
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: Schedule Blocks (General) */}
          {salonTab === 'blocks' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-3 shadow-sm">
                <h3 className="text-sm font-bold text-[#173B3F]">
                  مسدودسازی سانس‌ها (General Schedule Blocks)
                </h3>
                <p className="text-xs text-[#6C6C6C] leading-relaxed">
                  برای جلوگیری از تداخل نوبت (Double-booking)، می‌توانید سانس‌های استراحت، مرخصی متخصصین یا وقت‌های پرشده حضوری را قفل کنید.
                </p>

                <form onSubmit={handleAddBlock} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  <JalaliDatePicker
                    selectedDate={newBlockDate}
                    onDateChange={(jalaliStr) => setNewBlockDate(jalaliStr)}
                    label="روز مسدودسازی:"
                    placeholder="انتخاب روز از تقویم..."
                    minDate={new Date()}
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
                      افزودن بلاک زمانی به تقویم سالن
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
                      onClick={() => handleDeleteBlock(blk.id)}
                      className="text-xs text-[#B35D67] hover:underline font-bold"
                    >
                      حذف بلاک
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: Commissions — default percent per specialist */}
          {salonTab === 'commissions' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-3 shadow-sm">
                <h3 className="text-sm font-bold text-[#173B3F]">پورسانت متخصصین سالن</h3>
                <p className="text-[11px] text-[#6C6C6C]">
                  درصد سهم متخصص از هر خدمت. متخصصین مستقل (صندلی اجاره‌داده‌شده) مدیریت پورسانت خود را بر عهده دارند و در این لیست قرار نمی‌گیرند.
                </p>
                {commissionRows.length === 0 ? (
                  <p className="text-xs text-[#6C6C6C] py-4 text-center">متخصصی برای تنظیم پورسانت وجود ندارد.</p>
                ) : (
                  <div className="space-y-2">
                    {commissionRows.map((row) => {
                      const spec = specialistsList.find((s) => Number(s.id) === row.specialistId);
                      return (
                        <div key={row.specialistId} className="flex items-center justify-between gap-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA]">
                          <div className="flex items-center gap-2.5">
                            <img src={spec?.avatar} alt="" className="w-9 h-9 rounded-xl object-cover border border-[#E7E2DA]" />
                            <div>
                              <span className="text-sm font-bold text-[#1C1C1C] block">{spec?.user?.fullName || spec?.name || 'متخصص'}</span>
                              <span className="text-[10px] text-[#6C6C6C]">{spec?.specialtyLine}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              defaultValue={row.percent ?? ''}
                              placeholder="مثلاً ۶۰"
                              onBlur={(e) => {
                                const raw = e.target.value.trim();
                                const parsed = raw === '' ? null : Number(raw);
                                // Ignore non-numeric input instead of sending NaN to the API.
                                const pct = parsed == null ? null : (Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : null);
                                if (pct !== row.percent) handleSaveCommission(row.specialistId, pct);
                              }}
                              className="w-24 px-3 py-1.5 rounded-xl border border-[#E7E2DA] text-sm text-center focus:border-[#173B3F] outline-none"
                            />
                            <span className="text-xs text-[#6C6C6C]">٪</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: Weekly salon schedule — day/hour grid */}
          {salonTab === 'weekly_schedule' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-[#E7E2DA] space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#173B3F]">زمان‌بندی هفتگی سالن</h3>
                    <p className="text-[11px] text-[#6C6C6C]">
                      ساعات ارائه‌ی خدمات در هر روز هفته. این برنامه برای همه لاین‌های سالن اعمال می‌شود.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveSchedule}
                    disabled={scheduleBusy}
                    className="px-4 py-2 rounded-full bg-[#173B3F] hover:bg-[#0F3232] text-white text-xs font-bold disabled:opacity-50 shrink-0"
                  >
                    {scheduleBusy ? 'در حال ذخیره…' : 'ذخیره زمان‌بندی'}
                  </button>
                </div>
                <div className="space-y-2">
                  {WEEKDAYS_FA.map((day, idx) => {
                    const row = weeklySchedule.find((r) => r.dayOfWeek === idx);
                    const isActive = row ? row.isActive : true;
                    return (
                      <div key={day.id} className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA]">
                        <label className="flex items-center gap-2 w-28 shrink-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => {
                              const open = row?.openTime || '09:00';
                              const close = row?.closeTime || '18:00';
                              setWeeklySchedule((prev) => {
                                const rest = prev.filter((r) => r.dayOfWeek !== idx);
                                return [...rest, { dayOfWeek: idx, openTime: open, closeTime: close, isActive: e.target.checked }];
                              });
                            }}
                            className="accent-[#173B3F]"
                          />
                          <span className="text-sm font-bold text-[#1C1C1C]">{day.name}</span>
                        </label>
                        <input
                          type="time"
                          defaultValue={row?.openTime || '09:00'}
                          disabled={!isActive}
                          onBlur={(e) => {
                            setWeeklySchedule((prev) => {
                              const rest = prev.filter((r) => r.dayOfWeek !== idx);
                              return [...rest, { dayOfWeek: idx, openTime: e.target.value, closeTime: row?.closeTime || '18:00', isActive }];
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl border border-[#E7E2DA] text-sm focus:border-[#173B3F] outline-none disabled:opacity-40"
                        />
                        <span className="text-xs text-[#6C6C6C]">تا</span>
                        <input
                          type="time"
                          defaultValue={row?.closeTime || '18:00'}
                          disabled={!isActive}
                          onBlur={(e) => {
                            setWeeklySchedule((prev) => {
                              const rest = prev.filter((r) => r.dayOfWeek !== idx);
                              return [...rest, { dayOfWeek: idx, openTime: row?.openTime || '09:00', closeTime: e.target.value, isActive }];
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl border border-[#E7E2DA] text-sm focus:border-[#173B3F] outline-none disabled:opacity-40"
                        />
                        {!isActive && <span className="text-[10px] text-red-500 font-bold">تعطیل</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          </>
          )}
        </>
      )}

      {/* ========================================================
          FULLSCREEN LIGHTBOX MODAL FOR HIGH-RES BEAUTY PHOTOGRAPHY
      ======================================================== */}
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
                aria-label="بستن تصویر"
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
      <ServiceFormModal
        isOpen={serviceModalOpen}
        initial={editingService ? {
          id: editingService.id,
          name: editingService.name || '',
          serviceLineId: editingService.serviceLineId || (isIndependentSpecialist ? activeSpecialistView?.specialtyLine : 'hair'),
          price: Number(editingService.price) || 0,
          durationMinutes: Number(editingService.durationMinutes) || 60,
          isMobileAvailable: Boolean(editingService.isMobileAvailable),
          imageUrl: editingService.imageUrl || null,
          specialistIds: (editingService.specialistIds || []).map(Number),
        } : null}
        busy={serviceBusy}
        error={serviceError}
        lockToOwnLine={isIndependentSpecialist}
        ownSpecialistId={activeSpecialistView?.id ?? null}
        ownLineName={isIndependentSpecialist ? activeSpecialistView?.specialtyLine : undefined}
        selectableSpecialists={isIndependentSpecialist ? [] : (specialistsList || []).filter((s: any) => !s.isRentedChair)}
        onSubmit={handleServiceFormSubmit}
        onClose={closeServiceModal}
      />
    </>
  );
};
