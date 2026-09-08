import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  if (!isOpen) return null;

  const currency = items[0]?.currency || '$';
  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const bitcoinDiscount = subtotal * 0.05;
  const bitcoinTotal = subtotal - bitcoinDiscount;

  const handleCheckout = () => {
    setCheckoutComplete(true);
    setTimeout(() => {
      onClearCart();
      setCheckoutComplete(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-amber-50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-700" />
            <h2 className="text-base font-bold text-gray-900">Your Shopping Cart</h2>
            <span className="text-xs bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              {items.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <ShoppingBag className="w-16 h-16 text-gray-300 mb-4 stroke-1" />
              <p className="text-base font-bold text-gray-700 mb-1">Your cart is empty</p>
              <p className="text-xs text-gray-500 mb-6">
                Explore our best sellers and other USA domestic products!
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-[#fed000] hover:bg-[#ffc800] text-gray-950 text-xs font-bold rounded shadow-xs cursor-pointer"
              >
                Return to Shop
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-gray-900 capitalize">{item.name}</h4>
                  <div className="text-[11px] text-gray-500">{item.packLabel}</div>
                  <div className="text-xs font-bold text-[#0066cc] mt-0.5">
                    {item.currency || '$'}{(item.unitPrice * item.quantity).toFixed(2)}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center border border-gray-200 rounded">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    className="px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-2 text-xs font-bold text-gray-800">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer & Checkout */}
        {items.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            {/* Bitcoin Discount highlight */}
            <div className="bg-amber-100/70 border border-amber-300 rounded p-2.5 mb-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-900 flex items-center gap-1">
                <span>₿</span> Bitcoin 5% Discount:
              </span>
              <span className="font-bold text-emerald-700">-{currency}{bitcoinDiscount.toFixed(2)}</span>
            </div>

            {/* Subtotals */}
            <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
              <span>Subtotal:</span>
              <span className="font-bold text-gray-800">{currency}{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-gray-900 mb-4">
              <span>Total (Standard):</span>
              <span className="text-base text-[#0066cc]">{currency}{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-amber-800 mb-4 pb-2 border-b border-gray-200">
              <span>Total with Bitcoin (5% OFF):</span>
              <span className="text-sm font-extrabold text-amber-700">
                {currency}{bitcoinTotal.toFixed(2)}
              </span>
            </div>

            {checkoutComplete ? (
              <div className="bg-emerald-600 text-white py-3 px-4 rounded text-center font-bold text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Order Placed! Thank you for choosing RapidFinil.
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full py-3 px-4 bg-[#fed000] hover:bg-[#ffc800] text-gray-950 font-bold text-xs uppercase tracking-wider rounded shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <p className="text-[10px] text-center text-gray-500 mt-2">
              Free 3-Day USA Domestic Shipping with Tracking Included
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
