import React, { useEffect, useState } from 'react';
import { AdminCheckout, fetchAdminCheckouts } from '../adminClient';

const PAYMENT_STATUSES = [
  'created',
  'pending',
  'requires_action',
  'authorized',
  'captured',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
  'expired',
];

export const CheckoutsSection: React.FC = () => {
  const [checkouts, setCheckouts] = useState<AdminCheckout[]>([]);
  const [total, setTotal] = useState(0);
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAdminCheckouts({ provider: provider || undefined, status: status || undefined, limit: 100 })
      .then((res) => {
        setCheckouts(res.items);
        setTotal(res.meta.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [provider, status]);

  return (
    <div>
      <h2 className="text-xl font-black text-gray-900 mb-1">Checkouts ({total})</h2>
      <p className="text-xs text-gray-500 mb-4">Every payment attempt — one row per checkout, regardless of whether it completed.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1.5">
          <option value="">All providers</option>
          <option value="blockonomics">blockonomics</option>
          <option value="fake">fake</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1.5">
          <option value="">All statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">Order #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Provider</th>
              <th className="p-3">Method</th>
              <th className="p-3">Checkout Mode</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && checkouts.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-400">
                  No checkouts found.
                </td>
              </tr>
            )}
            {checkouts.map((c) => (
              <tr key={c.paymentId} className="hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{c.orderNumber}</td>
                <td className="p-3">{c.customerEmail}</td>
                <td className="p-3">{c.provider}</td>
                <td className="p-3">{c.paymentMethod}</td>
                <td className="p-3">{c.checkoutMode}</td>
                <td className="p-3">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                      c.status === 'captured'
                        ? 'bg-emerald-100 text-emerald-800'
                        : c.status === 'failed' || c.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="p-3 text-right font-semibold">
                  {c.currency} {c.amount.toFixed(2)}
                </td>
                <td className="p-3 text-gray-500 text-xs">{new Date(c.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
