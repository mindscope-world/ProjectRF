import React, { useEffect, useState } from 'react';
import { AdminComplianceReview, approveCompliance, fetchComplianceQueue, rejectCompliance } from '../adminClient';

export const ComplianceSection: React.FC = () => {
  const [reviews, setReviews] = useState<AdminComplianceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchComplianceQueue()
      .then(setReviews)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decide = async (orderId: string, decision: 'approve' | 'reject') => {
    const reason = window.prompt(`Reason for ${decision === 'approve' ? 'approving' : 'rejecting'} this order (optional):`) || undefined;
    setBusyOrderId(orderId);
    try {
      if (decision === 'approve') await approveCompliance(orderId, reason);
      else await rejectCompliance(orderId, reason);
      setReviews((prev) => prev.filter((r) => r.orderId !== orderId));
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-black text-gray-900 mb-1">Compliance Queue</h2>
      <p className="text-xs text-gray-500 mb-4">
        Orders awaiting a compliance decision (only products flagged <code className="font-mono">requiresPrescription</code> ever land here —
        the current catalog has none, so this is expected to stay empty).
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-sm text-gray-400">Nothing pending review.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.orderId} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-mono text-xs text-gray-500">{r.orderNumber}</span>
                  <span className="ml-2 font-semibold text-sm">{r.customerEmail}</span>
                </div>
                <span className="text-sm font-bold">
                  {r.currency} {r.totalAmount.toFixed(2)}
                </span>
              </div>
              <ul className="text-xs text-gray-600 mb-3 list-disc list-inside">
                {r.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.productName}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyOrderId === r.orderId}
                  onClick={() => decide(r.orderId, 'approve')}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded cursor-pointer disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyOrderId === r.orderId}
                  onClick={() => decide(r.orderId, 'reject')}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded cursor-pointer disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
