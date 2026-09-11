import React from 'react';
import { X, Tag, Copy, Check } from 'lucide-react';
import { useSiteContent } from '../SiteContentContext';

interface OfferZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Icon/color treatment per offer slot is fixed (index-based) — only the
// text (and an optional coupon code) is admin-editable, since a slot's
// visual identity (Bitcoin orange, shipping blue, coupon green) is brand
// styling, not copy.
const OFFER_STYLES = [
  { badge: '₿', badgeClass: 'bg-amber-500', boxClass: 'bg-amber-50 border-amber-300', tagClass: 'bg-amber-200 text-amber-900' },
  { badge: '3-DAY', badgeClass: 'bg-[#0066cc] text-xs font-bold', boxClass: 'bg-blue-50 border-blue-200', tagClass: 'bg-blue-200 text-blue-900' },
  { badge: null, badgeClass: 'bg-emerald-600', boxClass: 'bg-emerald-50 border-emerald-200', tagClass: 'bg-emerald-700 text-white' },
];

export const OfferZoneModal: React.FC<OfferZoneModalProps> = ({ isOpen, onClose }) => {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  const { offerZone } = useSiteContent();

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg max-w-md w-full shadow-2xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-[#fed000] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">👋</span>
            <h3 className="font-black text-gray-950 text-base uppercase tracking-wider">
              {offerZone.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-800 hover:text-black cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {offerZone.offers.map((offer, i) => {
            const style = OFFER_STYLES[i % OFFER_STYLES.length];
            return (
              <div key={i} className={`${style.boxClass} border rounded-lg p-3.5 flex items-start gap-3`}>
                <div className={`w-10 h-10 rounded-full ${style.badgeClass} text-white flex items-center justify-center shrink-0`}>
                  {style.badge ?? <Tag className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-gray-900">{offer.title}</h4>
                    {offer.couponCode ? (
                      <button
                        type="button"
                        onClick={() => handleCopy(offer.couponCode!)}
                        className="flex items-center gap-1 text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white font-mono font-bold px-2 py-0.5 rounded cursor-pointer transition-colors shrink-0"
                      >
                        {copiedCode === offer.couponCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode === offer.couponCode ? 'COPIED' : offer.couponCode}</span>
                      </button>
                    ) : (
                      <span className={`text-[10px] ${style.tagClass} px-1.5 py-0.5 rounded font-bold shrink-0`}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1">{offer.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded cursor-pointer transition-colors"
          >
            Got It, Back to Store
          </button>
        </div>
      </div>
    </div>
  );
};
