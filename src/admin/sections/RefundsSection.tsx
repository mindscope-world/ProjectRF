import React, { useEffect, useState } from 'react';
import { AdminRefund, createAdminRefund, fetchAdminRefunds } from '../adminClient';

export const RefundsSection: React.FC = () => {
  const [refunds, setRefunds] = useState<AdminRefund[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAdminRefunds({ limit: 100 })
      .then((res) => {
        setRefunds(res.items);
        setTotal(res.meta.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async () => {
    const parsedAmount = Number(amount);
    if (!paymentId.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid payment ID and a positive amount.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAdminRefund(paymentId.trim(), parsedAmount, reason || undefined);
      setShowForm(false);
      setPaymentId('');
      setAmount('');
      setReason('');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-gray-900">Refunds ({total})</h2>
        <button type="button" onClick={() => setShowForm(!showForm)} className="text-sm bg-[#fed000] hover:bg-[#ffc800] px-3 py-1.5 rounded font-bold cursor-pointer">
          {showForm ? 'Close' : '+ New Refund'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-5 mb-4">
          <p className="text-xs text-gray-500 mb-3">
            Find the payment ID on the Orders or Checkouts screen (each order shows its payment; each checkout row is one payment).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input placeholder="Payment ID" value={paymentId} onChange={(e) => setPaymentId(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1.5 font-mono" />
            <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1.5" />
            <input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1.5" />
          </div>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <button type="button" onClick={submit} disabled={saving} className="px-4 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded cursor-pointer disabled:opacity-50">
            {saving ? 'Processing…' : 'Issue refund'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">Order #</th>
              <th className="p-3">Payment ID</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && refunds.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-400">
                  No refunds yet.
                </td>
              </tr>
            )}
            {refunds.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{r.orderNumber}</td>
                <td className="p-3 font-mono text-xs text-gray-400">{r.paymentId}</td>
                <td className="p-3 text-right font-semibold">${r.amount.toFixed(2)}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 text-gray-600">{r.reason || '—'}</td>
                <td className="p-3 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
