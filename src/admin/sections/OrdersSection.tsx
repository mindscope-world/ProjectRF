import React, { useEffect, useState } from 'react';
import { AdminOrder, fetchAdminOrders, updateAdminOrder } from '../adminClient';

const ORDER_STATUSES = [
  'pending',
  'awaiting_payment',
  'payment_received',
  'compliance_review',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

const FULFILLMENT_STATUSES = ['pending', 'processing', 'packed', 'shipped', 'delivered', 'returned', 'cancelled'];

const EditRow: React.FC<{ order: AdminOrder; onSaved: (o: AdminOrder) => void }> = ({ order, onSaved }) => {
  const [fulfillmentStatus, setFulfillmentStatus] = useState(order.fulfillmentStatus);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [carrier, setCarrier] = useState(order.carrier || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAdminOrder(order.id, {
        fulfillmentStatus,
        trackingNumber: trackingNumber || null,
        carrier: carrier || null,
        notes: notes || null,
      });
      onSaved(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-amber-50/40">
      <td colSpan={7} className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {order.items.map((item) => (
            <div key={item.id} className="text-xs text-gray-600 col-span-2 md:col-span-4">
              {item.quantity}× {item.productName} ({item.sku}) — ${item.subtotal.toFixed(2)}
            </div>
          ))}
          {order.payments.map((p) => (
            <div key={p.id} className="text-xs text-gray-600 col-span-2 md:col-span-4">
              Payment: {p.provider}/{p.paymentMethod} — {p.status} — ${p.amount.toFixed(2)}
              {p.checkoutUrl && (
                <>
                  {' '}
                  —{' '}
                  <a href={p.checkoutUrl} target="_blank" rel="noreferrer" className="text-[#0066cc] underline">
                    checkout link
                  </a>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fulfillment</label>
            <select
              value={fulfillmentStatus}
              onChange={(e) => setFulfillmentStatus(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
            >
              {FULFILLMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tracking #</label>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Carrier</label>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-3 px-4 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </td>
    </tr>
  );
};

export const OrdersSection: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [fulfillmentStatus, setFulfillmentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAdminOrders({ status: status || undefined, fulfillmentStatus: fulfillmentStatus || undefined, search: search || undefined, limit: 50 })
      .then((res) => {
        setOrders(res.items);
        setTotal(res.meta.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, fulfillmentStatus]);

  return (
    <div>
      <h2 className="text-xl font-black text-gray-900 mb-4">Orders ({total})</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          placeholder="Search order # or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          className="text-sm border border-gray-300 rounded px-3 py-1.5"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1.5">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={fulfillmentStatus}
          onChange={(e) => setFulfillmentStatus(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1.5"
        >
          <option value="">All fulfillment</option>
          {FULFILLMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={load}
          className="text-sm bg-[#fed000] hover:bg-[#ffc800] px-3 py-1.5 rounded font-bold cursor-pointer"
        >
          Search
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">Order #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Status</th>
              <th className="p-3">Fulfillment</th>
              <th className="p-3">Compliance</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-400">
                  No orders found.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <React.Fragment key={o.id}>
                <tr className="hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{o.orderNumber}</td>
                  <td className="p-3">{o.customerEmail}</td>
                  <td className="p-3">{o.status}</td>
                  <td className="p-3">{o.fulfillmentStatus}</td>
                  <td className="p-3">{o.complianceStatus}</td>
                  <td className="p-3 text-right font-semibold">
                    {o.currency} {o.totalAmount.toFixed(2)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                      className="text-xs font-bold text-[#0066cc] cursor-pointer"
                    >
                      {expanded === o.id ? 'Close' : 'Manage'}
                    </button>
                  </td>
                </tr>
                {expanded === o.id && (
                  <EditRow
                    order={o}
                    onSaved={(updated) => {
                      setOrders((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
