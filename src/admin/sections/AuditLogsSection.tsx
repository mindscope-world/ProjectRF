import React, { useEffect, useState } from 'react';
import { AdminAuditLog, fetchAuditLogs } from '../adminClient';

const ENTITY_TYPES = ['product', 'product_variant', 'order', 'payment'];

export const AuditLogsSection: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAuditLogs({ entityType: entityType || undefined, limit: 100 })
      .then((res) => {
        setLogs(res.items);
        setTotal(res.meta.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [entityType]);

  return (
    <div>
      <h2 className="text-xl font-black text-gray-900 mb-1">Audit Logs ({total})</h2>
      <p className="text-xs text-gray-500 mb-4">
        Every admin-panel mutation, in order. There's no per-operator login yet (a single shared admin token gates the
        whole panel), so <code className="font-mono">actor</code> is always "admin" for now.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1.5">
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-400">
                  No audit entries yet.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 align-top">
                <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="p-3">{log.actor}</td>
                <td className="p-3 font-mono text-xs">{log.action}</td>
                <td className="p-3 font-mono text-xs text-gray-500">
                  {log.entityType}/{log.entityId.slice(0, 8)}…
                </td>
                <td className="p-3 text-xs text-gray-600 font-mono max-w-md truncate" title={JSON.stringify(log.details)}>
                  {log.details ? JSON.stringify(log.details) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
