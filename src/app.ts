import { useAppStore } from './store';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { BookingModal } from './components/ui/BookingModal';
import { HomeScreen } from './features/home/HomeScreen';
import { SalonsScreen } from './features/salons/SalonsScreen';
import { BookingsScreen } from './features/bookings/BookingsScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { LoginScreen } from './features/auth/LoginScreen';
import { SalonAdminDashboard } from './features/salon-admin/SalonAdminDashboard';

function App() {
  const { currentTab, toastMessage, isAuthenticated, user } = useAppStore();

  // اگر کاربر لاگین نکرده، صفحه لاگین را نمایش بده
  if (!isAuthenticated || !user) {
    return <LoginScreen />;
  }

  // اگر کاربر از کارکنان سالن است (مدیر، متخصص، سیار، مدیر لاین)
  const isSalonStaff = user.role === 'salon_admin' || 
                       user.role === 'salon_specialist' || 
                       user.role === 'mobile_specialist' || 
                       user.role === 'line_manager';
  
  if (isSalonStaff) {
    return (
      <div className="min-h-screen bg-[#E7E2DA] flex flex-col selection:bg-[#D9A2B0] selection:text-[#173B3F]">
        <div className="flex justify-center w-full min-h-screen">
          <div className="w-full max-w-[430px] bg-[#F7F3EE] min-h-screen text-[#1C1C1C] relative flex flex-col shadow-[0_0_50px_rgba(23,59,63,0.18)] sm:rounded-[36px] overflow-hidden sm:border-[8px] sm:border-[#173B3F]">
            <Header />
            <main className="flex-1 px-4 pt-4 pb-6 overflow-y-auto">
              <SalonAdminDashboard />
            </main>
            
            {toastMessage && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#173B3F] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-[#D9A2B0]/40 flex items-center gap-2 animate-fade-in-up">
                <span>✓</span>
                <span>{toastMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // در غیر این صورت، پنل مشتری را نمایش بده
  const renderScreen = () => {
    switch (currentTab) {
      case 'home':
        return <HomeScreen />;
      case 'salons':
        return <SalonsScreen />;
      case 'bookings':
        return <BookingsScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-[#E7E2DA] flex flex-col selection:bg-[#D9A2B0] selection:text-[#173B3F]">
      <div className="flex justify-center w-full min-h-screen">
        <div className="w-full max-w-[430px] bg-[#F7F3EE] min-h-screen text-[#1C1C1C] relative flex flex-col shadow-[0_0_50px_rgba(23,59,63,0.18)] sm:rounded-[36px] overflow-hidden sm:border-[8px] sm:border-[#173B3F]">
          <Header />
          <main className="flex-1 px-4 pt-4 pb-20 overflow-y-auto">
            {renderScreen()}
          </main>
          <BottomNav />
          
          {toastMessage && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#173B3F] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-[#D9A2B0]/40 flex items-center gap-2 animate-fade-in-up">
              <span>✓</span>
              <span>{toastMessage}</span>
            </div>
          )}
        </div>
      </div>

      <BookingModal />
    </div>
  );
}

export default App;