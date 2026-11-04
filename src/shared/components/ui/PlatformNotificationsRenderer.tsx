import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Megaphone,
  Sparkles,
  Tag,
  AlertTriangle,
  Info,
  X,
  ExternalLink,
  ChevronLeft,
  CheckCircle2,
  BellRing
} from 'lucide-react';
import { useDataStore, PlatformNotification } from '../../stores/dataStore';
import { useUIStore } from '../../stores/uiStore';
import { useNavigate } from '@tanstack/react-router';

interface PlatformNotificationsRendererProps {
  currentPanelOverride?: 'customer' | 'salon' | 'admin';
}

export const PlatformNotificationsRenderer: React.FC<PlatformNotificationsRendererProps> = ({
  currentPanelOverride,
}) => {
  const { notifications, trackNotificationView, trackNotificationClick } = useDataStore();
  const { appMode } = useUIStore();
  const navigate = useNavigate();

  // Track dismissed notifications in this session so dismissed alerts don't persist annoyingly
  const [dismissedIds, setDismissedIds] = useState<number[]>(() => {
    try {
      const stored = sessionStorage.getItem('boya_dismissed_notifs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const viewedIdsRef = useRef<Set<number>>(new Set());

  const handleDismiss = (id: number) => {
    setDismissedIds((prev) => {
      const next = [...prev, id];
      try {
        sessionStorage.setItem('boya_dismissed_notifs', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Determine current active panel context
  const currentPanel = useMemo(() => {
    if (currentPanelOverride) return currentPanelOverride;
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) return 'admin';
      if (path.startsWith('/salon-admin') || path.startsWith('/salon-panel') || (path.startsWith('/salon') && !path.startsWith('/salons'))) {
        return 'salon';
      }
    }
    if (appMode === 'admin_panel') return 'admin';
    if (appMode === 'salon_panel') return 'salon';
    return 'customer';
  }, [currentPanelOverride, appMode]);

  // Filter active, non-expired, panel-matching, non-dismissed notifications
  const activeNotifs = useMemo(() => {
    const now = Date.now();
    return notifications.filter((n) => {
      if (!n.isActive) return false;
      if (dismissedIds.includes(n.id)) return false;

      // Expiration check
      if (n.expiresAt) {
        const expTime = new Date(n.expiresAt).getTime();
        if (!isNaN(expTime) && expTime < now) return false;
      }

      // Check target panels
      const targetPanels = (n.targetPanels || n.targetAudience || 'all').toLowerCase();
      if (targetPanels === 'all') return true;
      if (targetPanels.includes(currentPanel)) return true;
      if (currentPanel === 'customer' && targetPanels.includes('customer')) return true;
      if (currentPanel === 'salon' && (targetPanels.includes('salon') || targetPanels.includes('specialist'))) return true;
      if (currentPanel === 'admin' && targetPanels.includes('admin')) return true;

      return false;
    });
  }, [notifications, dismissedIds, currentPanel]);

  // Track impressions (views) once per notification
  useEffect(() => {
    activeNotifs.forEach((n) => {
      if (!viewedIdsRef.current.has(n.id)) {
        viewedIdsRef.current.add(n.id);
        trackNotificationView(n.id);
      }
    });
  }, [activeNotifs, trackNotificationView]);

  const handleActionClick = (n: PlatformNotification) => {
    trackNotificationClick(n.id);
    if (!n.actionUrl) return;

    if (n.actionUrl.startsWith('http://') || n.actionUrl.startsWith('https://')) {
      window.open(n.actionUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Local app navigation
      try {
        navigate({ to: n.actionUrl as any });
      } catch {
        window.location.href = n.actionUrl;
      }
    }
    // Also dismiss modal if it's a popup
    if (n.displayPosition === 'popup') {
      handleDismiss(n.id);
    }
  };

  // Group notifications by display position
  const banners = activeNotifs.filter((n) => (n.displayPosition || 'banner') === 'banner');
  const popups = activeNotifs.filter((n) => n.displayPosition === 'popup');
  const toasts = activeNotifs.filter((n) => n.displayPosition === 'toast');

  // Active popup to show (show the latest one if multiple exist)
  const activePopup = popups.length > 0 ? popups[0] : null;

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'discount':
        return {
          bannerBg: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white',
          badgeBg: 'bg-emerald-500/30 text-emerald-100 border-emerald-400/40',
          popupIconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          btnBg: 'bg-emerald-500 hover:bg-emerald-400 text-white',
          icon: Tag,
        };
      case 'promotional':
        return {
          bannerBg: 'bg-gradient-to-r from-amber-600 via-amber-700 to-rose-700 text-white',
          badgeBg: 'bg-amber-500/30 text-amber-100 border-amber-400/40',
          popupIconBg: 'bg-amber-100 text-amber-700 border-amber-200',
          btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
          icon: Sparkles,
        };
      case 'alert':
        return {
          bannerBg: 'bg-gradient-to-r from-rose-700 to-red-800 text-white',
          badgeBg: 'bg-rose-500/30 text-rose-100 border-rose-400/40',
          popupIconBg: 'bg-rose-100 text-rose-700 border-rose-200',
          btnBg: 'bg-rose-600 hover:bg-rose-500 text-white',
          icon: AlertTriangle,
        };
      case 'informational':
      default:
        return {
          bannerBg: 'bg-gradient-to-r from-[#173B3F] to-[#255257] text-white',
          badgeBg: 'bg-[#FAF7F2]/20 text-white border-white/30',
          popupIconBg: 'bg-[#173B3F]/10 text-[#173B3F] border-[#173B3F]/20',
          btnBg: 'bg-[#173B3F] hover:bg-[#122e31] text-white',
          icon: Megaphone,
        };
    }
  };

  return (
    <>
      {/* 1. FIXED TOP BANNERS */}
      {banners.length > 0 && (
        <div className="w-full flex flex-col gap-1 z-30" dir="rtl">
          {banners.map((b) => {
            const styles = getTypeStyles(b.type);
            const IconComp = styles.icon;
            return (
              <aside
                key={b.id}
                aria-label={b.title}
                className={`w-full py-2.5 px-4 shadow-md transition-all flex items-center justify-between gap-3 text-xs ${styles.bannerBg}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="shrink-0 p-1.5 rounded-xl bg-white/15 backdrop-blur-xs">
                    <IconComp className="w-4 h-4 text-white" />
                  </span>
                  {b.badgeText && (
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles.badgeBg}`}>
                      {b.badgeText}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <strong className="font-bold truncate text-[11px] sm:text-xs">
                      {b.title}:
                    </strong>
                    <span className="opacity-95 truncate text-[11px] font-medium">
                      {b.content}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {b.actionUrl && (
                    <button
                      onClick={() => handleActionClick(b)}
                      className="px-3 py-1 rounded-xl bg-white text-[#173B3F] font-bold text-[11px] hover:bg-[#FAF7F2] active:scale-95 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>{b.actionText || 'مشاهده'}</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(b.id)}
                    className="p-1 rounded-lg hover:bg-white/20 active:scale-95 transition-all text-white/80 hover:text-white cursor-pointer"
                    title="بستن اعلان"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </aside>
            );
          })}
        </div>
      )}

      {/* 2. POPUP MODAL (HIGH-CONVERTING PROMO / ANNOUNCEMENT) */}
      {activePopup && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          {(() => {
            const styles = getTypeStyles(activePopup.type);
            const IconComp = styles.icon;
            return (
              <div
                role="dialog"
                aria-modal="true"
                className="bg-white rounded-[32px] border border-[#E7E2DA] max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-scaleUp text-[#1C1C1C]"
              >
                {/* Decorative header glow */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#D9A2B0] via-[#173B3F] to-[#2E5E52]" />

                <button
                  onClick={() => handleDismiss(activePopup.id)}
                  className="absolute top-4 left-4 p-1.5 rounded-full bg-[#FAF7F2] text-[#6C6C6C] hover:text-[#173B3F] hover:bg-[#E7E2DA] transition-all cursor-pointer"
                  title="بستن"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center pt-2 space-y-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xs ${styles.popupIconBg}`}>
                    <IconComp className="w-7 h-7" />
                  </div>

                  {activePopup.badgeText && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF7F2] text-[#173B3F] border border-[#E7E2DA]">
                      {activePopup.badgeText}
                    </span>
                  )}

                  <h3 className="text-base sm:text-lg font-bold text-[#173B3F] font-serif leading-snug">
                    {activePopup.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#6C6C6C] leading-relaxed whitespace-pre-line px-2">
                    {activePopup.content}
                  </p>

                  <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-3">
                    {activePopup.actionUrl ? (
                      <button
                        onClick={() => handleActionClick(activePopup)}
                        className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer ${styles.btnBg}`}
                      >
                        <span>{activePopup.actionText || 'مشاهده و استفاده'}</span>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => handleDismiss(activePopup.id)}
                      className="px-5 py-3 rounded-2xl bg-[#FAF7F2] border border-[#E7E2DA] text-[#6C6C6C] hover:text-[#173B3F] text-xs font-bold transition-all hover:bg-[#E7E2DA] cursor-pointer"
                    >
                      متوجه شدم
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 3. FLOATING TOAST / NOTIFICATION (BOTTOM CORNER) */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-20 left-4 z-40 max-w-sm w-full flex flex-col gap-2 pointer-events-none"
          dir="rtl"
        >
          {toasts.slice(0, 2).map((t) => {
            const styles = getTypeStyles(t.type);
            const IconComp = styles.icon;
            return (
              <div
                key={t.id}
                className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl border border-[#E7E2DA] p-3.5 shadow-xl flex items-start gap-3 animate-slideInLeft text-[#1C1C1C]"
              >
                <div className={`p-2 rounded-xl shrink-0 ${styles.popupIconBg}`}>
                  <IconComp className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs font-bold text-[#173B3F] truncate">{t.title}</h4>
                    {t.badgeText && (
                      <span className="text-[9px] font-bold bg-[#FAF7F2] text-[#6C6C6C] px-1.5 py-0.5 rounded-md border border-[#E7E2DA]">
                        {t.badgeText}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6C6C6C] line-clamp-2 leading-relaxed">
                    {t.content}
                  </p>
                  {t.actionUrl && (
                    <button
                      onClick={() => handleActionClick(t)}
                      className="mt-2 text-[11px] font-bold text-[#173B3F] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t.actionText || 'مشاهده جزئیات'}</span>
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleDismiss(t.id)}
                  className="p-1 text-[#6C6C6C] hover:text-[#173B3F] transition-all cursor-pointer shrink-0"
                  title="بستن"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
