import React, { useMemo } from 'react';
import { X, Layers, Scissors, Car } from 'lucide-react';
import { useServicesPortfolio } from '../../api/queries';
import { useModalStore } from '../../stores/modalStore';
import { toPersianDigits } from '../../utils/persianUtils';
import { BeautyActivityIcon } from '../ui/BeautyActivityIcon';

/**
 * Customer-facing showcase of sample-work images ("نمونه‌کار خدمات").
 * Grouped by service under the chosen salon, or across all salons when no
 * salon is selected. Independent (owner-rooted) services have salonId null and
 * are labelled as independent-specialist work. Only published services are
 * shown — the endpoint returns everything, we filter `publicationStatus` here
 * so a pending item never reaches a customer.
 */
export const ServicesShowcaseModal: React.FC = () => {
  const { isShowcaseModalOpen, showcaseSalonId, closeShowcaseModal } = useModalStore();
  const { data: allServices = [], isLoading } = useServicesPortfolio();

  const groups = useMemo(() => {
    const visible = allServices.filter(
      (s) => s.publicationStatus === 'active' && (s.portfolio || []).length > 0,
    );
    const scoped = showcaseSalonId != null
      ? visible.filter((s) => String(s.salonId) === String(showcaseSalonId))
      : visible;
    // Group by service line (hair/nail/...) so the showcase reads like a catalog.
    const byLine = new Map<string, typeof scoped>();
    for (const s of scoped) {
      const arr = byLine.get(s.serviceLineId) || [];
      arr.push(s);
      byLine.set(s.serviceLineId, arr);
    }
    return Array.from(byLine.entries());
  }, [allServices, showcaseSalonId]);

  if (!isShowcaseModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm animate-fadeIn text-right"
      dir="rtl"
      onClick={closeShowcaseModal}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl border border-[#E7E2DA] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#E7E2DA] flex items-center justify-between bg-white/95 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <button
              onClick={closeShowcaseModal}
              className="w-8 h-8 rounded-full bg-[#E8F0EF] border border-[#173B3F]/20 flex items-center justify-center text-[#173B3F] hover:bg-[#173B3F] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-sm font-bold text-[#173B3F] font-serif flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                نمایشگاه نمونه‌کار خدمات
              </h3>
              <p className="text-[10.5px] text-[#6C6C6C]">
                {showcaseSalonId != null ? 'نمونه‌کارهای همین سالن' : 'منتخب نمونه‌کارهای همه سالن‌ها'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
          {isLoading ? (
            <p className="text-xs text-[#6C6C6C] text-center py-8">در حال بارگذاری نمونه‌کارها…</p>
          ) : groups.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Scissors className="w-8 h-8 text-[#6F9A8D] mx-auto" />
              <p className="text-sm font-bold text-[#173B3F]">هنوز نمونه‌کاری منتشر نشده است</p>
              <p className="text-xs text-[#6C6C6C">به‌زودی تصاویر نمونه‌کار خدمات در اینجا نمایش داده می‌شود.</p>
            </div>
          ) : (
            groups.map(([lineId, services]) => (
              <section key={lineId} className="space-y-3">
                <div className="flex items-center gap-2">
                  <BeautyActivityIcon activityId={lineId} size="sm" />
                  <h4 className="text-sm font-bold text-[#173B3F]">
                    {services.length > 0 && <span className="text-[#6C6C6C] text-[11px] mr-1">
                      {toPersianDigits(services.length)} خدمت
                    </span>}
                  </h4>
                </div>
                {services.map((s) => (
                  <div key={s.id} className="bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#1C1C1C]">{s.name}</span>
                        {s.salonId == null && (
                          <span className="text-[9px] bg-[#E8F0EF] text-[#173B3F] border border-[#173B3F]/20 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Car className="w-2.5 h-2.5" />
                            متخصص مستقل
                          </span>
                        )}
                        {s.isMobileAvailable && (
                          <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold">
                            قابل اعزام
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#6C6C6C]">
                        {toPersianDigits(s.durationMinutes)} دقیقه
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {s.portfolio.map((p) => (
                        <figure
                          key={p.id}
                          className="relative aspect-square rounded-xl overflow-hidden border border-[#E7E2DA] group"
                        >
                          <img
                            src={p.imageUrl}
                            alt={p.title || s.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {p.title && (
                            <figcaption className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[9px] px-1.5 py-1 truncate">
                              {p.title}
                            </figcaption>
                          )}
                        </figure>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
