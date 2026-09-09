import React, { useState } from 'react';
import { Trash2, ShoppingBag } from 'lucide-react';
import { CartItem } from '../types';
import { ProductArtwork } from './ProductArtwork';
import { computeOrderTotals, getSavedAddress } from '../api/client';

interface CartPageProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onProceedToCheckout: () => void;
  onContinueShopping: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onContinueShopping,
}) => {
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');

  const currency = items[0]?.currency || '$';
  const savedAddress = getSavedAddress();

  const quantityFor = (item: CartItem) => pendingQuantities[item.id] ?? item.quantity;

  const hasPendingChanges = items.some(
    (item) => pendingQuantities[item.id] !== undefined && pendingQuantities[item.id] !== item.quantity
  );

  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * quantityFor(item), 0);
  const totals = computeOrderTotals(subtotal, 'card_link', items.length > 0);

  const handleUpdateCart = () => {
    Object.entries(pendingQuantities).forEach(([id, qty]: [string, number]) => {
      const original = items.find((item) => item.id === id);
      if (original && qty !== original.quantity && qty > 0) {
        onUpdateQuantity(id, qty);
      }
    });
    setPendingQuantities({});
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    setCouponMessage('Coupon codes are not available yet — check back soon.');
  };

  if (items.length === 0) {
    return (
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4 stroke-1" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-sm text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
        <button
          type="button"
          onClick={onContinueShopping}
          className="px-6 py-2.5 bg-[#fed000] hover:bg-[#ffc800] text-gray-950 text-sm font-bold rounded shadow-xs cursor-pointer"
        >
          Return to Shop
        </button>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">Cart</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart items table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-2 font-semibold w-8"></th>
                <th className="py-3 pr-2 font-semibold w-20">Thumbnail</th>
                <th className="py-3 pr-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">Price</th>
                <th className="py-3 px-4 font-semibold">Quantity</th>
                <th className="py-3 pl-4 font-semibold text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-4 pr-2 align-middle">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove item"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="py-4 pr-2 align-middle">
                    <div className="w-16 h-16 overflow-hidden rounded border border-gray-200 relative bg-slate-50">
                      <div className="absolute top-1/2 left-1/2 w-40 -translate-x-1/2 -translate-y-1/2 scale-[0.4] origin-center pointer-events-none">
                        <ProductArtwork imageKey={item.imageKey} name={item.name} />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4 align-middle">
                    <div className="font-bold text-gray-900 capitalize">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.packLabel}</div>
                  </td>
                  <td className="py-4 px-4 align-middle text-gray-700">
                    {item.currency || currency}
                    {item.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 align-middle">
                    <input
                      type="number"
                      min={1}
                      value={quantityFor(item)}
                      onChange={(e) =>
                        setPendingQuantities((prev) => ({
                          ...prev,
                          [item.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                        }))
                      }
                      aria-label={`${item.name} quantity`}
                      className="w-16 px-2 py-1.5 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-[#fed000]"
                    />
                  </td>
                  <td className="py-4 pl-4 align-middle text-right font-bold text-gray-900">
                    {item.currency || currency}
                    {(item.unitPrice * quantityFor(item)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000]"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-4 py-2 border-2 border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white text-sm font-bold rounded transition-colors cursor-pointer"
              >
                Apply coupon
              </button>
            </div>
            <button
              type="button"
              onClick={handleUpdateCart}
              disabled={!hasPendingChanges}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-800 text-sm font-bold rounded transition-colors cursor-pointer"
            >
              Update cart
            </button>
          </div>
          {couponMessage && <p className="text-xs text-amber-700 mt-2">{couponMessage}</p>}
        </div>

        {/* Cart totals */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
              Cart totals
            </h2>

            <div className="flex justify-between items-center text-sm py-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-gray-900">
                {currency}
                {totals.subtotal.toFixed(2)}
              </span>
            </div>

            <div className="py-2 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Shipment</div>
              <div className="text-xs text-gray-700 pl-2">
                Flat rate: {currency}
                {totals.shippingAmount.toFixed(2)}
              </div>
              {savedAddress ? (
                <div className="text-xs text-gray-500 pl-2 mt-1">
                  Shipping to {savedAddress.city}, {savedAddress.postalCode}, {savedAddress.countryCode}.{' '}
                  <button
                    type="button"
                    onClick={onProceedToCheckout}
                    className="text-[#0066cc] hover:underline cursor-pointer"
                  >
                    Change address
                  </button>
                </div>
              ) : (
                <div className="text-xs text-gray-500 pl-2 mt-1">
                  <button
                    type="button"
                    onClick={onProceedToCheckout}
                    className="text-[#0066cc] hover:underline cursor-pointer"
                  >
                    Add an address
                  </button>{' '}
                  to confirm shipping.
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-sm py-2 border-t border-gray-200">
              <span className="text-gray-600">Taxes &amp; Payment processing fee</span>
              <span className="font-semibold text-gray-900">
                {currency}
                {totals.taxAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center text-base py-3 border-t border-gray-300 mb-4">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-extrabold text-[#0066cc] text-lg">
                {currency}
                {totals.totalAmount.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full py-3 px-4 bg-[#fed000] hover:bg-[#ffc800] text-gray-950 font-bold text-sm uppercase tracking-wider rounded shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              Proceed to checkout
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
