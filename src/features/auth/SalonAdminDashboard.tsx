
import { useAppStore } from '../../store';
import { formatPrice } from '../../utils';

export function SalonAdminDashboard() {
  const { user, salons } = useAppStore();

  const mySalon = salons.find(s => s.id === user?.salonId);
  const mySpecialist = user?.specialistId 
    ? mySalon?.specialists.find(s => s.id === user.specialistId)
    : null;

  if (!mySalon) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm text-[#6C6C6C]">سالنی برای شما یافت نشد</p>
        </div>
      </div>
    );
  }

  const getRoleInfo = () => {
    switch (user?.role) {
      case 'salon_admin':
        return { title: 'مدیر سالن', color: 'bg-[#173B3F]', icon: '💼' };
      case 'salon_specialist':
        return { title: 'متخصص سالن', color: 'bg-[#D9A2B0]', icon: '💇‍♀️' };
      case 'mobile_specialist':
        return { title: 'متخصص سیار', color: 'bg-[#6F9A8D]', icon: '🚗' };
      case 'line_manager':
        return { title: 'مدیر لاین', color: 'bg-[#C99558]', icon: '🎨' };
      default:
        return { title: 'کاربر', color: 'bg-[#6C6C6C]', icon: '👤' };
    }
  };

  const roleInfo = getRoleInfo();

  const getStats = () => {
    if (user?.role === 'salon_admin') {
      return {
        todayBookings: 5,
        totalRevenue: 12500000,
        activeSpecialists: mySalon.specialists.length,
        completionRate: 92,
      };
    } else {
      return {
        todayBookings: 3,
        totalRevenue: 4500000,
        activeSpecialists: 1,
        completionRate: 95,
      };
    }
  };

  const stats = getStats();

  const recentBookings = [
    { id: 1, customer: 'نازنین رحیمی', service: 'رنگ و لایت', time: '۱۱:۰۰', status: 'confirmed' },
    { id: 2, customer: 'سارا محمدی', service: 'کراتین مو', time: '۱۴:۰۰', status: 'pending' },
    { id: 3, customer: 'مریم احمدی', service: 'مانیکور ژل', time: '۱۶:۰۰', status: 'confirmed' },
  ];

  return (
    <div className="space-y-5 pb-4">
      <div className="bg-gradient-to-bl from-[#173B3F] to-[#0B2626] rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-extrabold mb-1">
              {user?.role === 'salon_admin' ? 'پنل مدیریت سالن' : 'پنل متخصص'}
            </h2>
            <p className="text-xs text-white/70">{mySalon.name}</p>
          </div>
          <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl border border-white/20">
            {mySalon.avatar}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`${roleInfo.color} px-2 py-1 rounded-full flex items-center gap-1`}>
            <span>{roleInfo.icon}</span>
            {roleInfo.title}
          </span>
          <span className="bg-[#6F9A8D]/30 px-2 py-1 rounded-full">آنلاین</span>
        </div>
        {user?.name && (
          <p className="text-xs text-white/60 mt-2">
            {user.name} {mySpecialist && `• ${mySpecialist.role}`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-[#E7E2DA] p-4 boya-card-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#E8F0EF] flex items-center justify-center text-[#173B3F]">
              <Calendar size={16} />
            </div>
            <span className="text-[10px] text-[#6F9A8D] bg-[#EAF2EF] px-2 py-0.5 rounded-full">امروز</span>
          </div>
          <p className="text-2xl font-extrabold text-[#173B3F]">{stats.todayBookings}</p>
          <p className="text-[10px] text-[#6C6C6C] mt-0.5">نوبت امروز</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7E2DA] p-4 boya-card-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#FBF4EC] flex items-center justify-center text-[#C99558]">
              <DollarSign size={16} />
            </div>
            <TrendingUp size={14} className="text-[#6F9A8D]" />
          </div>
          <p className="text-lg font-extrabold text-[#173B3F]">{formatPrice(stats.totalRevenue)}</p>
          <p className="text-[10px] text-[#6C6C6C] mt-0.5">درآمد این ماه</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7E2DA] p-4 boya-card-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#F8ECEE] flex items-center justify-center text-[#D9A2B0]">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#173B3F]">{stats.activeSpecialists}</p>
          <p className="text-[10px] text-[#6C6C6C] mt-0.5">
            {user?.role === 'salon_admin' ? 'متخصصین فعال' : 'خدمات من'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7E2DA] p-4 boya-card-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#EAF2EF] flex items-center justify-center text-[#6F9A8D]">
              <CheckCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#6F9A8D]">{stats.completionRate}%</p>
          <p className="text-[10px] text-[#6C6C6C] mt-0.5">نرخ تکمیل</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E7E2DA] p-4">
        <h3 className="text-sm font-bold text-[#173B3F] mb-3">دسترسی سریع</h3>
        <div className="grid grid-cols-3 gap-2">
          <button className="flex flex-col items-center gap-1.5 p-3 bg-[#F7F3EE] rounded-xl hover:bg-[#E8F0EF] transition-colors">
            <Calendar size={18} className="text-[#173B3F]" />
            <span className="text-[10px] font-medium text-[#173B3F]">نوبت‌ها</span>
          </button>
          {user?.role === 'salon_admin' ? (
            <button className="flex flex-col items-center gap-1.5 p-3 bg-[#F7F3EE] rounded-xl hover:bg-[#E8F0EF] transition-colors">
              <Users size={18} className="text-[#173B3F]" />
              <span className="text-[10px] font-medium text-[#173B3F]">متخصصین</span>
            </button>
          ) : (
            <button className="flex flex-col items-center gap-1.5 p-3 bg-[#F7F3EE] rounded-xl hover:bg-[#E8F0EF] transition-colors">
              <Users size={18} className="text-[#173B3F]" />
              <span className="text-[10px] font-medium text-[#173B3F]">خدمات من</span>
            </button>
          )}
          <button className="flex flex-col items-center gap-1.5 p-3 bg-[#F7F3EE] rounded-xl hover:bg-[#E8F0EF] transition-colors">
            <Settings size={18} className="text-[#173B3F]" />
            <span className="text-[10px] font-medium text-[#173B3F]">تنظیمات</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden">
        <div className="p-4 border-b border-[#E7E2DA] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#173B3F]">نوبت‌های امروز</h3>
          <button className="text-[10px] text-[#173B3F] font-medium">مشاهده همه</button>
        </div>
        <div className="divide-y divide-[#E7E2DA]">
          {recentBookings.map((booking) => (
            <div key={booking.id} className="p-4 flex items-center gap-3 hover:bg-[#F7F3EE] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#E8F0EF] flex items-center justify-center text-[#173B3F]">
                <Clock size={16} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-[#1C1C1C]">{booking.customer}</p>
                <p className="text-[10px] text-[#6C6C6C]">{booking.service}</p>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#173B3F]">{booking.time}</p>
                <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                  booking.status === 'confirmed' 
                    ? 'bg-[#EAF2EF] text-[#6F9A8D]' 
                    : 'bg-[#FBF4EC] text-[#C99558]'
                }`}>
                  {booking.status === 'confirmed' ? 'تایید شده' : 'در انتظار'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {user?.role === 'salon_admin' && (
        <div className="bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden">
          <div className="p-4 border-b border-[#E7E2DA] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#173B3F]">متخصصین سالن</h3>
            <button className="text-[10px] text-[#173B3F] font-medium">مدیریت</button>
          </div>
          <div className="divide-y divide-[#E7E2DA]">
            {mySalon.specialists.map((specialist) => (
              <div key={specialist.id} className="p-4 flex items-center gap-3 hover:bg-[#F7F3EE] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#F8ECEE] flex items-center justify-center text-xl">
                  {specialist.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#1C1C1C]">{specialist.name}</p>
                  <p className="text-[10px] text-[#6C6C6C]">{specialist.role}</p>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[#C99558]">⭐</span>
                    <span className="font-bold text-[#173B3F]">{specialist.rating}</span>
                  </div>
                  <p className="text-[9px] text-[#6C6C6C]">{specialist.reviewCount} نظر</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {user?.role !== 'salon_admin' && mySpecialist && (
        <div className="bg-white rounded-2xl border border-[#E7E2DA] p-4">
          <h3 className="text-sm font-bold text-[#173B3F] mb-3">پروفایل من</h3>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#F8ECEE] flex items-center justify-center text-3xl">
              {mySpecialist.avatar}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#1C1C1C]">{mySpecialist.name}</p>
              <p className="text-xs text-[#6C6C6C]">{mySpecialist.role}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[#C99558]">⭐ {mySpecialist.rating}</span>
                <span className="text-[10px] text-[#6C6C6C]">({mySpecialist.reviewCount} نظر)</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[#E7E2DA]">
            <div className="text-center">
              <p className="text-lg font-extrabold text-[#173B3F]">{stats.todayBookings}</p>
              <p className="text-[10px] text-[#6C6C6C]">نوبت امروز</p>
            </div>
            <div className="text-center border-r border-[#E7E2DA]">
              <p className="text-lg font-extrabold text-[#6F9A8D]">{stats.completionRate}%</p>
              <p className="text-[10px] text-[#6C6C6C]">نرخ تکمیل</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          const { logout } = useAppStore.getState();
          logout();
          window.location.reload();
        }}
        className="w-full flex items-center justify-center gap-2 bg-white border border-[#B35D67]/20 text-[#B35D67] font-bold text-sm py-3 rounded-2xl hover:bg-[#F8ECEE] transition-colors"
      >
        <LogOut size={16} />
        خروج از حساب
      </button>
    </div>
  );
}