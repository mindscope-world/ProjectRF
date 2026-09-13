import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, Copy } from 'lucide-react';
import { CartItem } from '../types';
import { COUNTRIES } from '../constants/countries';
import {
  ApiError,
  buildRampWidgetUrl,
  computeOrderTotals,
  capturePayment,
  createOrder,
  getSavedAddress,
  OrderResult,
  PaymentMethod,
  saveAddress,
  ShippingAddress,
} from '../api/client';

interface CheckoutPageProps {
  items: CartItem[];
  onOrderPlaced: (order: OrderResult) => void;
  onBackToCart: () => void;
}

interface AddressFormState {
  firstName: string;
  lastName: string;
  companyName: string;
  countryCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postalCode: string;
  phone: string;
}

const emptyAddress: AddressFormState = {
  firstName: '',
  lastName: '',
  companyName: '',
  countryCode: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  county: '',
  postalCode: '',
  phone: '',
};

function toFormState(saved: ShippingAddress | null): AddressFormState {
  if (!saved) return emptyAddress;
  return {
    firstName: saved.firstName,
    lastName: saved.lastName,
    companyName: saved.companyName || '',
    countryCode: saved.countryCode,
    addressLine1: saved.addressLine1,
    addressLine2: saved.addressLine2 || '',
    city: saved.city,
    county: saved.county || '',
    postalCode: saved.postalCode || '',
    phone: saved.phone || '',
  };
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ items, onOrderPlaced, onBackToCart }) => {
  const [address, setAddress] = useState<AddressFormState>(() => toFormState(getSavedAddress()));
  const [email, setEmail] = useState('');
  const [shipToDifferentAddress, setShipToDifferentAddress] = useState(false);
  const [shippingAddressForm, setShippingAddressForm] = useState<AddressFormState>(emptyAddress);
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card_link');
  const [refundAddress, setRefundAddress] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderResult | null>(null);
  // Set for checkoutMode="blockonomics" (always — there's no hosted
  // checkout page to redirect to), and also for checkoutMode="ramp" when
  // VITE_RAMP_HOST_API_KEY isn't configured — there's nowhere to redirect,
  // so show the raw address instead of pretending the order is complete.
  const [manualCryptoPayment, setManualCryptoPayment] = useState<{
    order: OrderResult;
    address: string;
    amount: number;
    currency: string;
  } | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const currency = items[0]?.currency || '$';
  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const shippingKnown = address.countryCode.trim() !== '';
  const totals = computeOrderTotals(subtotal, paymentMethod, shippingKnown);

  const updateField = (field: keyof AddressFormState, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const updateShippingField = (field: keyof AddressFormState, value: string) => {
    setShippingAddressForm((prev) => ({ ...prev, [field]: value }));
  };

  const toShippingAddress = (form: AddressFormState): ShippingAddress => ({
    firstName: form.firstName,
    lastName: form.lastName,
    companyName: form.companyName || undefined,
    addressLine1: form.addressLine1,
    addressLine2: form.addressLine2 || undefined,
    city: form.city,
    county: form.county || undefined,
    postalCode: form.postalCode || undefined,
    countryCode: form.countryCode,
    phone: form.phone || undefined,
  });

  const isAddressComplete = (form: AddressFormState) =>
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.countryCode.trim() &&
    form.addressLine1.trim() &&
    form.city.trim() &&
    form.county.trim() &&
    form.postalCode.trim() &&
    form.phone.trim();

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    setCouponMessage('Coupon codes are not available yet — check back soon.');
  };

  const handlePlaceOrder = async () => {
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }
    if (!isAddressComplete(address) || !email.trim()) {
      setErrorMessage('Please fill in all required billing details.');
      return;
    }
    if (shipToDifferentAddress && !isAddressComplete(shippingAddressForm)) {
      setErrorMessage('Please fill in all required shipping details.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage('You must agree to the website terms and conditions to place an order.');
      return;
    }

    const shippingAddress = toShippingAddress(shipToDifferentAddress ? shippingAddressForm : address);

    setSubmitting(true);
    try {
      const { order, payment } = await createOrder(
        {
          email: email.trim(),
          shippingAddress,
          paymentMethod,
          refundAddress: paymentMethod === 'crypto' && refundAddress.trim() ? refundAddress.trim() : undefined,
          orderNotes: orderNotes.trim() || undefined,
        },
        idempotencyKey
      );
      saveAddress(shippingAddress);

      // The order now exists (awaiting_payment) — how the customer actually
      // pays depends on what the backend configured (backend/README.md's
      // "Card-to-Bitcoin via Ramp Network" section):
      if (payment.checkoutMode === 'blockonomics' && payment.cryptoAddress) {
        // Direct crypto payment: Blockonomics has no hosted checkout page to
        // redirect to, just a bare receive address — show it directly. The
        // order stays "awaiting_payment" until Blockonomics' callback
        // confirms it server-side.
        setManualCryptoPayment({
          order,
          address: payment.cryptoAddress,
          amount: order.totalAmount,
          currency: order.currency,
        });
        return;
      }

      if (payment.checkoutMode === 'ramp' && payment.cryptoAddress) {
        const rampUrl = buildRampWidgetUrl(payment.cryptoAddress, order.totalAmount, order.currency);
        if (rampUrl) {
          window.location.href = rampUrl;
          return;
        }
        // VITE_RAMP_HOST_API_KEY isn't configured — nowhere to redirect.
        // Show the raw address rather than pretend the order is complete.
        setManualCryptoPayment({
          order,
          address: payment.cryptoAddress,
          amount: order.totalAmount,
          currency: order.currency,
        });
        return;
      }

      // checkoutMode === "none": no real provider configured (dev/CI
      // default) — fall back to the fake provider's instant capture so the
      // whole flow stays demoable without any credentials.
      const { order: capturedOrder } = await capturePayment(payment.id, 'succeed');
      setConfirmedOrder(capturedOrder);
      onOrderPlaced(capturedOrder);
    } catch (err) {
      const apiErr = err as ApiError;
      setErrorMessage(apiErr.message || 'Something went wrong placing your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (manualCryptoPayment) {
    return (
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete your Bitcoin payment</h1>
        <p className="text-sm text-gray-600 mb-6">
          Order <span className="font-bold text-gray-900">{manualCryptoPayment.order.orderNumber}</span> is
          reserved and awaiting payment. Send exactly{' '}
          <span className="font-bold text-gray-900">
            {manualCryptoPayment.currency === 'USD' ? '$' : '€'}
            {manualCryptoPayment.amount.toFixed(2)}
          </span>{' '}
          worth of BTC to the address below — your order confirms automatically once the payment is detected.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 border border-gray-300 rounded font-mono text-sm text-gray-900 break-all mb-2">
          {manualCryptoPayment.address}
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(manualCryptoPayment.address)}
            className="p-1 text-gray-500 hover:text-gray-900 cursor-pointer shrink-0"
            title="Copy address"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-6">
          Pay directly from your own Bitcoin wallet — no card or account needed.
        </p>
        <button
          type="button"
          onClick={onBackToCart}
          className="px-6 py-2.5 bg-[#fed000] hover:bg-[#ffc800] text-gray-950 text-sm font-bold rounded shadow-xs cursor-pointer"
        >
          Continue Shopping
        </button>
      </main>
    );
  }

  if (confirmedOrder) {
    return (
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you! Your order has been received.</h1>
        <p className="text-sm text-gray-600 mb-6">
          Order <span className="font-bold text-gray-900">{confirmedOrder.orderNumber}</span> for{' '}
          <span className="font-bold text-gray-900">
            {confirmedOrder.currency === 'USD' ? '$' : confirmedOrder.currency === 'EUR' ? '€' : ''}
            {confirmedOrder.totalAmount.toFixed(2)}
          </span>{' '}
          is now being processed.
          {paymentMethod === 'crypto'
            ? ' Payment instructions for your cryptocurrency payment will be sent to your email shortly.'
            : ' A secure payment link will be sent to your email shortly.'}
        </p>
        <button
          type="button"
          onClick={onBackToCart}
          className="px-6 py-2.5 bg-[#fed000] hover:bg-[#ffc800] text-gray-950 text-sm font-bold rounded shadow-xs cursor-pointer"
        >
          Continue Shopping
        </button>
      </main>
    );
  }

  const renderAddressFields = (
    form: AddressFormState,
    update: (field: keyof AddressFormState, value: string) => void,
    idPrefix: string
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor={`${idPrefix}-first`} className="block text-xs font-semibold text-gray-700 mb-1">
          First name *
        </label>
        <input
          id={`${idPrefix}-first`}
          type="text"
          required
          value={form.firstName}
          onChange={(e) => update('firstName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000]"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-last`} className="block text-xs font-semibold text-gray-700 mb-1">
          Last name *
        </label>
        <input
          id={`${idPrefix}-last`}
          type="text"
          required
          value={form.lastName}
          onChange={(e) => update('lastName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000]"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-company`} className="block text-xs font-semibold text-gray-700 mb-1">
          Company name (optional)
        </label>
        <input
          id={`${idPrefix}-company`}
          type="text"
          value={form.companyName}
          onChange={(e) => update('companyName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000]"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-country`} className="block text-xs font-semibold text-gray-700 mb-1">
          Country / Region *
        </label>
        <div className="relative">
          <select
            id={`${idPrefix}-country`}
            required
            value={form.countryCode}
            onChange={(e) => update('countryCode', e.target.value)}
            className="w-full appearance-none px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#fed000]"
          >
            <option value="">Select a country / region…</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-address1`} className="block text-xs font-semibold text-gray-700 mb-1">
          Street address *
        </label>
        <input
          id={`${idPrefix}-address1`}
          type="text"
          required
          placeholder="House number and street name"
          value={form.addressLine1}
          onChange={(e) => update('addressLine1', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000] mb-2"
        />
        <input
          type="text"
          placeholder="Apartment, suite, unit, etc. (optional)"
          value={form.addressLine2}
          onChange={(e) => update('addressLine2', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000]"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-city`} className="block text-xs font-semibold text-gray-700 mb-1">
          Town / City *
        </label>
        <input
          id={`${idPrefix}-city`}
          type="text"
          required
          value={form.city}
          onChange={(e) => update('city', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000]"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-state`} className="block text-xs font-semibold text-gray-700 mb-1">
          State *
        </label>
        <input
          id={`${idPrefix}-state`}
          type="text"
          required
          value={form.county}
          onChange={(e) => update('county', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000]"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-zip`} className="block text-xs font-semibold text-gray-700 mb-1">
          ZIP Code *
        </label>
        <input
          id={`${idPrefix}-zip`}
          type="text"
          required
          value={form.postalCode}
          onChange={(e) => update('postalCode', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000]"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-phone`} className="block text-xs font-semibold text-gray-700 mb-1">
          Phone *
        </label>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          required
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000]"
        />
      </div>
    </div>
  );

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout</h1>
      <button
        type="button"
        onClick={() => setCouponOpen((v) => !v)}
        className="text-sm text-[#0066cc] hover:underline cursor-pointer mb-6"
      >
        Have a coupon? Click here to enter your code
      </button>
      {couponOpen && (
        <div className="flex items-center gap-2 mb-6 -mt-4">
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
            Apply
          </button>
          {couponMessage && <span className="text-xs text-amber-700">{couponMessage}</span>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Billing details */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
            Billing details
          </h2>
          {renderAddressFields(address, updateField, 'billing')}

          <div className="mt-4">
            <label htmlFor="billing-email" className="block text-xs font-semibold text-gray-700 mb-1">
              Email address *
            </label>
            <input
              id="billing-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000]"
            />
          </div>

          <label className="flex items-center gap-2 mt-4 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={shipToDifferentAddress}
              onChange={(e) => setShipToDifferentAddress(e.target.checked)}
              className="w-4 h-4"
            />
            Ship to a different address?
          </label>

          {shipToDifferentAddress && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Shipping address</h3>
              {renderAddressFields(shippingAddressForm, updateShippingField, 'shipping')}
            </div>
          )}

          <div className="mt-4">
            <label htmlFor="order-notes" className="block text-xs font-semibold text-gray-700 mb-1">
              Order notes (optional)
            </label>
            <textarea
              id="order-notes"
              rows={3}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Notes about your order, e.g. special notes for delivery."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000]"
            />
          </div>
        </div>

        {/* Order summary + payment */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">Your order</h2>

          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2.5 px-4 font-semibold">Product</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 text-gray-700">
                      <span className="capitalize">{item.name}</span> ({item.packLabel}) &times; {item.quantity}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      {item.currency || currency}
                      {(item.unitPrice * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2.5 px-4 text-gray-600">Subtotal</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-gray-900">
                    {currency}
                    {totals.subtotal.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-gray-600">Shipment</td>
                  <td className="py-2.5 px-4 text-right text-gray-700">
                    {shippingKnown ? (
                      <>
                        Flat rate: {currency}
                        {totals.shippingAmount.toFixed(2)}
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">Enter your address to view shipping options.</span>
                    )}
                  </td>
                </tr>
                {totals.discountAmount > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 text-emerald-700">Bitcoin discount (5%)</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                      -{currency}
                      {totals.discountAmount.toFixed(2)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-2.5 px-4 text-gray-600">Taxes &amp; Payment processing fee</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-gray-900">
                    {currency}
                    {totals.taxAmount.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-4 font-bold text-gray-900">Total</td>
                  <td className="py-3 px-4 text-right font-extrabold text-[#0066cc] text-base">
                    {currency}
                    {totals.totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment method */}
          <div className="space-y-3 mb-6">
            <label
              className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors ${
                paymentMethod === 'card_link' ? 'border-[#fed000] bg-amber-50' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === 'card_link'}
                onChange={() => setPaymentMethod('card_link')}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold text-gray-800">
                Apple Pay / Amazon Pay / cash app / Zelle / Credit Card Payment Link
              </span>
            </label>

            <label
              className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors ${
                paymentMethod === 'crypto' ? 'border-[#fed000] bg-amber-50' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === 'crypto'}
                onChange={() => setPaymentMethod('crypto')}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold text-gray-800">Cryptocurrency</span>
            </label>

            {paymentMethod === 'crypto' && (
              <div className="ml-7 p-4 bg-amber-50 border border-amber-200 rounded space-y-3">
                <p className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                  <span>₿</span> 5% discount with bitcoin
                </p>
                <div>
                  <label htmlFor="refund-address" className="block text-xs font-semibold text-gray-700 mb-1">
                    Refund Address (optional)
                  </label>
                  <input
                    id="refund-address"
                    type="text"
                    value={refundAddress}
                    onChange={(e) => setRefundAddress(e.target.value)}
                    placeholder="Wallet address to receive a refund, if needed"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000]"
                  />
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Your personal data will be used to process your order, support your experience throughout this
            website, and for other purposes described in our privacy policy.
          </p>

          <label className="flex items-start gap-2 text-sm text-gray-800 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5"
            />
            <span>I have read and agree to the website terms and conditions *</span>
          </label>

          <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 mb-6 text-xs text-gray-700 space-y-2">
            <p className="font-bold text-gray-900">A few notes before you order</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Payment links are typically sent within a few hours of placing your order.</li>
              <li>Most orders ship within 24-48 hours of payment being confirmed.</li>
              <li>Tracking numbers are emailed as soon as your order is dispatched.</li>
              <li>Questions about a bulk or custom order? Reach out any time — see Contact Us below.</li>
            </ol>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={submitting || items.length === 0}
            className="w-full py-3.5 px-4 bg-[#fed000] hover:bg-[#ffc800] disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-bold text-sm uppercase tracking-wider rounded shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
        </div>
      </div>
    </main>
  );
};
