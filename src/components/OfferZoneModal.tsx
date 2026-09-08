import React from 'react';
import { X, Tag, Sparkles, Copy, Check } from 'lucide-react';

interface OfferZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfferZoneModal: React.FC<OfferZoneModalProps> = ({ isOpen, onClose }) => {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

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
              Exclusive Offer Zone
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
          {/* Offer 1: Bitcoin */}
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-black text-lg flex items-center justify-center shrink-0">
              ₿
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900">Bitcoin 5% Instant Discount</h4>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                  AUTO-APPLIED
                </span>
              </div>
              <p className="text-[11px] text-gray-600 mt-1">
                Select Bitcoin at checkout to automatically save 5% off your entire cart total.
              </p>
            </div>
          </div>

          {/* Offer 2: Free 3-Day Shipping */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0066cc] text-white font-bold text-xs flex items-center justify-center shrink-0">
              3-DAY
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900">Free USA Domestic Priority Shipping</h4>
                <span className="text-[10px] bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-gray-600 mt-1">
                USPS domestic tracking included on all orders. Guaranteed no customs inspection.
              </p>
            </div>
          </div>

          {/* Offer 3: Coupon Code */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900">Bulk Order Bonus</h4>
                <button
                  type="button"
                  onClick={() => handleCopy('RAPID10')}
                  className="flex items-center gap-1 text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white font-mono font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  {copiedCode === 'RAPID10' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'RAPID10' ? 'COPIED' : 'RAPID10'}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-600 mt-1">
                Use coupon code <span className="font-mono font-bold text-emerald-800">RAPID10</span> for orders over $300 to receive extra sample blisters.
              </p>
            </div>
          </div>
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
