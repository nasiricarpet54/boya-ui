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
import { useSalons, useBookings, useStaff } from '../../../shared/api/queries';
import { useAuthStore } from '../../../shared/stores/authStore';
import api from '../../../shared/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SALONS,
  Salon,
  SalonService,
  Specialist,
  Booking,
  SpecialistPortfolio,
  SERVICE_LINES,
} from '../../../shared/data/marketplaceData';
import { formatPrice, toPersianDigits } from '../../../shared/utils/persianUtils';
import { BeautyActivityIcon } from '../../../shared/components/ui/BeautyActivityIcon';
import { SpecialistFinancialsView } from '../../../shared/components/ui/SpecialistFinancialsView';
import { SafeHtml } from '../../../shared/components/ui/SafeHtml';
import { ImageFileUploader } from '../../../shared/components/ui/ImageFileUploader';
import { UserHeader } from '../../../shared/components/layout/UserHeader';

import { useUIStore } from '../../../shared/stores/uiStore';
import { useDataStore } from '../../../shared/stores/dataStore';

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

export const SalonAdminDashboard: React.FC = () => {
  const { setAppMode, setShowSplashScreen, setSplashAppName, showToast } = useUIStore();
  const { user } = useAuthStore();
  const { salons, updateSalon } = useDataStore();
  const queryClient = useQueryClient();

  // Fetch real data
  const { data: salonsData = [], isLoading: isLoadingSalons } = useSalons();
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

  const onSwitchToCustomerApp = () => {
    setSplashAppName('ورود به اپلیکیشن هوشمند مشتریان بویا');
    setShowSplashScreen(true);
    setAppMode('customer');
  };
  
  // ✅ logout اصلاح شده
  const handleLogout = () => {
    const { clearAuth } = useAuthStore.getState(); // ✅ تابع صحیح
    const { setAppMode } = useUIStore.getState(); // ✅ اضافه شد
    clearAuth();
    setAppMode('customer'); // ✅ تنظیم مجدد appMode
    showToast('با موفقیت خارج شدید');
    window.location.href = '/';
  };

  // Active test salon selection
  const [selectedSalonId, setSelectedSalonId] = useState<string>('');
  
  // Initialize selected salon based on user role or first salon
  useEffect(() => {
    if (salonsData.length > 0) {
      if (user?.salonId) {
        setSelectedSalonId(user.salonId.toString());
      } else if (!selectedSalonId) {
        setSelectedSalonId(salonsData[0].id.toString());
      }
    }
  }, [salonsData, user]);

  const currentSalon = salonsData.find((s: any) => s.id.toString() === selectedSalonId) || salonsData[0] || {
    id: 1,
    name: 'سالن زیبایی',
    address: 'تهران',
    province: 'تهران',
    city: 'تهران',
    district: 'مرکز',
    tenantId: 'tenant-1',
    rating: 5,
    reviewsCount: 0,
    coverImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
    gallery: [],
    services: [],
    specialists: [],
    isApproved: true,
    isVip: false,
  };

  // Salon Manager tab navigation
  const [salonTab, setSalonTab] = useState<'overview' | 'schedule' | 'gallery' | 'services' | 'specialists' | 'blocks'>('overview');

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

  // Local state for services
  const [salonServices, setSalonServices] = useState<any[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState(1500000);
  const [newServiceDuration, setNewServiceDuration] = useState(60);
  const [newServiceMobile, setNewServiceMobile] = useState(true);
  const [newServiceLineId, setNewServiceLineId] = useState('hair');
  const [newServiceImage, setNewServiceImage] = useState(PRESET_SERVICE_PHOTOS[0].url);

  // Local state for specialists in this salon
  const [specialistsList, setSpecialistsList] = useState<any[]>([]);

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
  const [newBlockDate, setNewBlockDate] = useState('دوشنبه ۷ آبان');
  const [newBlockTime, setNewBlockTime] = useState('۱۳:۰۰ الی ۱۴:۰۰');
  const [newBlockReason, setNewBlockReason] = useState('استراحت / نوبت تلفنی');

  // Sync state when salon switches
  useEffect(() => {
    if (currentSalon) {
      setEditableSalonName(currentSalon.name || '');
      setEditableSalonAddress(currentSalon.address || '');
      setSalonGallery(currentSalon.gallery || (currentSalon.coverImage ? [currentSalon.coverImage] : []));
      setSalonServices(currentSalon.services || []);
      setSpecialistsList(currentSalon.specialists || []);
    }
  }, [currentSalon]);

  const isSpecialistRole = user?.role === 'salon_specialist' || user?.role === 'mobile_specialist' || user?.role === 'line_manager';

  const isMobileSpecialist =
    user?.role === 'mobile_specialist' ||
    Boolean(activeSpecialistView?.isMobileSpecialist) ||
    Boolean(activeSpecialistView?.isMobileActive);

  // Lock specialist view when logged in as a specialist
  useEffect(() => {
    if (isSpecialistRole) {
      if (user?.role === 'mobile_specialist') {
        // Independent Mobile Specialist: Completely standalone, NO salon affiliation
        const mobileSpecObj = {
          id: user.id || 'mobile-spec',
          user: user,
          name: user.fullName || 'متخصص سیار',
          avatarUrl: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          specialtyLine: user.managedLine || 'hair',
          bio: 'متخصص سیار و مستقل در پلتفرم بویا — ارائه خدمات زیبایی در محل مشتری',
          experienceYears: 4,
          isVerified: true,
          isMobileSpecialist: true,
          isMobileActive: true,
          rating: 5,
          reviewsCount: 1,
          portfolio: [],
        };
        if (!activeSpecialistView || activeSpecialistView.id !== mobileSpecObj.id) {
          setActiveSpecialistView(mobileSpecObj);
        }
      } else if (specialistsList.length > 0) {
        const mySpec = specialistsList.find(
          (s: any) =>
            s.user?.id === user?.id ||
            s.user?.phone === user?.phone ||
            s.id === user?.uid ||
            s.specialtyLine === user?.managedLine
        ) || specialistsList[0];

        if (!activeSpecialistView || activeSpecialistView.id !== mySpec.id) {
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
      setSalonGallery(found.gallery || [found.coverImage]);
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
    if (spec.specialistType === 'independent_specialist') {
      return {
        label: 'متخصص مستقل (Independent)',
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

  // --- Filter Services for Active Specialist (STRICT REQUIREMENT #2) ---
  const specialistServices = activeSpecialistView
    ? (salonServices.length > 0
        ? salonServices.filter((s) => s.serviceLineId === activeSpecialistView.specialtyLine)
        : (currentSalon?.services || []).filter((s: any) => s.serviceLineId === activeSpecialistView.specialtyLine || s.isMobileAvailable))
    : [];

  // --- Filter Schedule Blocks for Active Specialist (STRICT REQUIREMENT #3) ---
  const specialistBlocks = activeSpecialistView
    ? scheduleBlocks.filter((b) => b.specialistId === activeSpecialistView.id)
    : [];

  // Handler: Add service (Specialist can only add in their specialty line)
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    const lineId = activeSpecialistView ? activeSpecialistView.specialtyLine : newServiceLineId;

    try {
      await api.post('/services', {
        salonId: currentSalon?.id ? Number(currentSalon.id) : 1,
        serviceLineId: lineId,
        name: newServiceName.trim(),
        durationMinutes: Number(newServiceDuration),
        price: Number(newServicePrice),
        description: activeSpecialistView
          ? `سرویس اختصاصی ارائه شده توسط ${activeSpecialistView.user?.fullName}`
          : 'سرویس ثبت شده توسط مدیریت سالن در پلتفرم بویا',
        isMobileAvailable: newServiceMobile,
        imageUrl: newServiceImage,
      });

      await queryClient.invalidateQueries({ queryKey: ['salons'] });
      showToast('خدمت جدید با موفقیت ثبت شد.');
      setIsAddingService(false);
      setNewServiceName('');
    } catch (err: any) {
      console.error('Failed to add service:', err);
      showToast(err?.response?.data?.error || 'خطا در ثبت خدمت.');
    }
  };

  // Handler: Add Portfolio Item (Saved permanently in PostgreSQL portfolio_items table)
  const handleAddPortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSpecialistView || !newPortfolioTitle.trim() || !newPortfolioUrl.trim()) return;

    try {
      const res = await api.post('/specialists/portfolio', {
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
        await api.delete(`/specialists/portfolio/${numId}`).catch(() => {});
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
    const newBlock = {
      id: `blk-${Date.now()}`,
      specialistId: activeSpecialistView ? activeSpecialistView.id : 'general',
      date: newBlockDate,
      time: newBlockTime,
      reason: newBlockReason,
    };
    setScheduleBlocks([...scheduleBlocks, newBlock]);
    setNewBlockReason('استراحت / وقت پر شده');
  };

  // Handler: Delete Block
  const handleDeleteBlock = (blockId: string) => {
    setScheduleBlocks(scheduleBlocks.filter((b) => b.id !== blockId));
  };

  // Handler: Save Salon Name & Address
  const handleSaveSalonInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editableSalonName.trim() || !editableSalonAddress.trim()) return;

    if (currentSalon?.id) {
      updateSalon(currentSalon.id, {
        name: editableSalonName.trim(),
        address: editableSalonAddress.trim(),
        pendingApproval: true,
      });
    }

    setSalonEditSuccess(true);
    setTimeout(() => setSalonEditSuccess(false), 3500);
  };

  // Handler: Save specialist's working hours
  const handleSaveWorkingHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSpecialistView) return;

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
    if (currentSalon?.id) {
      updateSalon(currentSalon.id, { specialists: updated });
    }
    setScheduleSuccessMsg(true);
    setTimeout(() => setScheduleSuccessMsg(false), 3000);
  };

  const handleToggleWorkingDay = (day: string) => {
    if (specialistWorkingDays.includes(day)) {
      setSpecialistWorkingDays(specialistWorkingDays.filter((d) => d !== day));
    } else {
      setSpecialistWorkingDays([...specialistWorkingDays, day]);
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
          const avatarUrl = res.data?.url || base64;

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

          showToast('تصویر پروفایل با موفقیت در پایگاه‌داده ذخیره شد.', 'success');
        } catch (uploadErr) {
          console.error('Avatar upload failed', uploadErr);
          showToast('خطا در ذخیره‌سازی تصویر پروفایل.', 'error');
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsUploadingAvatar(false);
      showToast('خطا در پردازش فایل تصویر.', 'error');
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
          const coverUrl = res.data?.url || base64;

          await updateSalon(currentSalon.id, { coverImage: coverUrl });
          queryClient.invalidateQueries({ queryKey: ['salons'] });

          showToast('تصویر کاور سالن با موفقیت ذخیره شد.', 'success');
        } catch (uploadErr) {
          console.error('Cover upload failed', uploadErr);
          showToast('خطا در ذخیره تصویر کاور سالن.', 'error');
        } finally {
          setIsUploadingCover(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsUploadingCover(false);
      showToast('خطا در پردازش تصویر کاور.', 'error');
    }
  };

  // Specialist line metadata
  const currentSpecialistLine = activeSpecialistView
    ? SERVICE_LINES.find((l) => l.id === activeSpecialistView.specialtyLine)
    : null;

  return (
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
              {user?.role === 'super_admin' ? (
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
              <button
                onClick={onSwitchToCustomerApp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D9A2B0] hover:bg-[#E6B5C0] text-[#173B3F] text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>مشاهده ویترین مشتری بویا</span>
              </button>
              
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
                    <img src={spec.avatarUrl || 'https://via.placeholder.com/150'} alt={spec.user?.fullName} className="w-4 h-4 rounded-full object-cover" />
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
              src={activeSpecialistView.portfolio?.[0]?.imageUrl || activeSpecialistView.avatarUrl || 'https://via.placeholder.com/150'}
              alt={activeSpecialistView.user?.fullName}
              className="absolute left-0 top-0 w-2/5 h-full object-cover opacity-25 blur-xs"
            />

            <div className="relative z-10 p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative group">
                  <img
                    src={activeSpecialistView.avatarUrl || user?.avatar || 'https://via.placeholder.com/150'}
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
              <span>نمونه‌کارهای من ({toPersianDigits(activeSpecialistView.portfolio.length)})</span>
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
                  onClick={() => setIsAddingService(!isAddingService)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D9A2B0]" />
                  <span>تعریف خدمت جدید در لاین شما</span>
                </button>
              </div>

              {/* Add Service Form locked to specialist's specialty line */}
              {isAddingService && (
                <form onSubmit={handleAddService} className="p-4 bg-white rounded-3xl border border-[#173B3F] space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#173B3F]">
                      تعریف خدمت جدید برای لاین {currentSpecialistLine?.name}
                    </h4>
                    <span className="text-[10px] text-[#2E5E52] bg-[#EAF2EF] px-2.5 py-0.5 rounded-full font-bold">
                      ثبت به نام {activeSpecialistView.user?.fullName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="عنوان خدمت تخصصی (مثال: فیشیال طلا با ماساژ لنفاوی)"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
                    />
                    <input
                      type="number"
                      required
                      placeholder="قیمت به تومان (مثال: ۱۸۰۰۰۰۰)"
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

                    {/* Locked Specialty Line Display */}
                    <div className="h-10 px-3 rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] text-xs text-[#173B3F] font-bold flex items-center justify-between">
                      <span>لاین خدمت: {currentSpecialistLine?.name}</span>
                      <Lock className="w-3.5 h-3.5 text-[#6C6C6C]" />
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[11px] font-semibold text-[#1C1C1C] block mb-1">
                        تصویر ژورنالی خدمت:
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
                        id="specMobileServiceCheck"
                        checked={newServiceMobile}
                        onChange={(e) => setNewServiceMobile(e.target.checked)}
                        className="accent-[#173B3F] w-4 h-4"
                      />
                      <label htmlFor="specMobileServiceCheck">
                        امکان ارائه این خدمت در محل مشتری (Mobile Service)
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232]"
                    >
                      ثبت خدمت در ویترین بویا
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

              {/* Specialist's Services List */}
              <div className="space-y-2.5">
                {specialistServices.length === 0 ? (
                  <div className="bg-white rounded-3xl p-6 border border-[#E7E2DA] text-center text-xs text-[#6C6C6C]">
                    هنوز خدمتی در این لاین تعریف نکرده‌اید. از دکمه «تعریف خدمت جدید در لاین شما» استفاده کنید.
                  </div>
                ) : (
                  specialistServices.map((serv) => (
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
                        <span className="text-xs font-bold text-[#173B3F] block">
                          {formatPrice(serv.price)}
                        </span>
                        <span className="text-[10px] text-[#2E5E52] font-semibold bg-[#EAF2EF] px-2 py-0.5 rounded-full mt-0.5">
                          فعال برای نوبت‌دهی
                        </span>
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
                  <input
                    type="text"
                    required
                    placeholder="تاریخ (مثال: دوشنبه ۷ آبان)"
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-[#E7E2DA] text-xs focus:border-[#173B3F] outline-none"
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
                    <span>آلبوم نمونه‌کارهای ژورنالی اختصاصی شما ({toPersianDigits(activeSpecialistView.portfolio.length)} اثر)</span>
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
                {activeSpecialistView.portfolio.map((item: any) => (
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
                          required
                          value={editableSalonAddress}
                          onChange={(e) => setEditableSalonAddress(e.target.value)}
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
                    src={activeSpecialistView.avatarUrl || user?.avatar || 'https://via.placeholder.com/150'}
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
                              src={spec.avatarUrl || 'https://via.placeholder.com/150'}
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
                  onClick={() => setIsAddingService(!isAddingService)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#173B3F] text-white text-xs font-bold hover:bg-[#0F3232] shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D9A2B0]" />
                  <span>تعریف خدمت جدید</span>
                </button>
              </div>

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

                    <div className="sm:col-span-2 space-y-2">
                      <ImageFileUploader
                        label="تصویر کاور یا نتیجه خدمت"
                        subLabel="بارگذاری عکس از لوکال یا دوربین عکاسی"
                        value={newServiceImage}
                        onChange={(url) => setNewServiceImage(url)}
                        allowCamera={true}
                      />

                      <span className="text-[11px] font-semibold text-[#6C6C6C] block">
                        یا انتخاب سریع از عکس‌های ژورنالی:
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
              </div>

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
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-[#1C1C1C]">
                                {spec.name}
                              </h4>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge.color}`}>
                                {badge.label}
                              </span>
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
                          {spec.portfolio.map((p: any) => (
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
