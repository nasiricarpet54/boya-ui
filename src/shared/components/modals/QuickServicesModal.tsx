import React from 'react';
import { X, Sparkles, ChevronLeft } from 'lucide-react';
import { Salon } from '../../data/marketplaceData';
import { toPersianDigits, formatPrice } from '../../utils/persianUtils';

interface QuickServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  salon: Salon | null;
  onSelectService: (service: any) => void;
}

export const QuickServicesModal: React.FC<QuickServicesModalProps> = ({
  isOpen,
  onClose,
  salon,
  onSelectService,
}) => {
  if (!isOpen || !salon) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#173B3F]/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#E7E2DA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[#E7E2DA]">
              <img src={salon.coverImage} className="w-full h-full object-cover" alt={salon.name} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#173B3F]">{salon.name}</h3>
              <p className="text-[10px] text-[#6C6C6C] font-semibold">{salon.district}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F7F3EE] transition-colors"
          >
            <X className="w-5 h-5 text-[#173B3F]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#D9A2B0]" />
            <span className="text-xs font-bold text-[#173B3F]">لیست خدمات اصلی</span>
          </div>

          <div className="space-y-2.5">
            {salon.services.map((service) => (
              <button
                key={service.id}
                onClick={() => onSelectService(service)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#FAF7F2] border border-transparent hover:border-[#D9A2B0] hover:bg-white transition-all group"
              >
                <div className="text-right">
                  <div className="text-xs font-bold text-[#173B3F] mb-1">{service.name}</div>
                  <div className="text-[10px] text-[#6C6C6C]">{toPersianDigits(service.durationMinutes)} دقیقه</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-extrabold text-[#173B3F]">
                    {formatPrice(service.price)}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-[#173B3F] transition-colors">
                    <ChevronLeft className="w-4 h-4 text-[#173B3F] group-hover:text-[#D9A2B0]" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 bg-[#F7F3EE]">
          <p className="text-[10px] text-center text-[#6C6C6C] leading-relaxed">
            برای مشاهده جزئیات بیشتر و انتخاب متخصص، روی خدمت مورد نظر کلیک کنید.
          </p>
        </div>
      </div>
    </div>
  );
};
