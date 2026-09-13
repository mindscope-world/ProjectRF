import React, { useEffect, useState } from 'react';
import { clearAdminToken, getAdminToken, setAdminToken, verifyAdminToken } from './adminClient';
import { ProductsSection } from './sections/ProductsSection';
import { OrdersSection } from './sections/OrdersSection';
import { ComplianceSection } from './sections/ComplianceSection';
import { RefundsSection } from './sections/RefundsSection';
import { CheckoutsSection } from './sections/CheckoutsSection';
import { AuditLogsSection } from './sections/AuditLogsSection';
import { SiteContentSection } from './sections/SiteContentSection';

type Section = 'orders' | 'products' | 'content' | 'compliance' | 'refunds' | 'checkouts' | 'audit';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
  { id: 'content', label: 'Website Content' },
  { id: 'compliance', label: 'Compliance Queue' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'checkouts', label: 'Checkouts' },
  { id: 'audit', label: 'Audit Logs' },
];

const TokenGate: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!tokenInput.trim()) return;
    setChecking(true);
    setError(null);
    try {
      await verifyAdminToken(tokenInput.trim());
      setAdminToken(tokenInput.trim());
      onVerified();
    } catch {
      setError('That token was rejected. Check ADMIN_API_KEY in backend/.env.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-2xl p-6">
        <h1 className="text-lg font-black text-gray-900 mb-1">Rapidfinil Admin</h1>
        <p className="text-xs text-gray-500 mb-4">
          Enter the admin token (<code className="font-mono">ADMIN_API_KEY</code>) configured in
          backend/.env.
        </p>
        <input
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Admin token"
          autoFocus
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#fed000] mb-3"
        />
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={checking || !tokenInput.trim()}
          className="w-full py-2 bg-[#fed000] hover:bg-[#ffc800] disabled:opacity-50 text-gray-950 font-bold text-sm rounded cursor-pointer"
        >
          {checking ? 'Checking…' : 'Enter'}
        </button>
      </div>
    </div>
  );
};

export default function AdminApp() {
  const [verified, setVerified] = useState(false);
  const [checkingStored, setCheckingStored] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>('orders');

  useEffect(() => {
    const stored = getAdminToken();
    if (!stored) {
      setCheckingStored(false);
      return;
    }
    verifyAdminToken(stored)
      .then(() => setVerified(true))
      .catch(() => clearAdminToken())
      .finally(() => setCheckingStored(false));
  }, []);

  if (checkingStored) {
    return <div className="min-h-screen bg-gray-950" />;
  }

  if (!verified) {
    return <TokenGate onVerified={() => setVerified(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-56 shrink-0 bg-gray-950 text-white flex flex-col">
        <div className="px-4 py-5 border-b border-gray-800">
          <span className="font-black text-lg">
            <span className="text-[#fed000]">Rapidfinil</span> Admin
          </span>
        </div>
        <nav className="flex-1 py-3">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors ${
                activeSection === s.id
                  ? 'bg-gray-900 text-[#fed000] border-l-4 border-[#fed000]'
                  : 'text-gray-300 hover:bg-gray-900 hover:text-white border-l-4 border-transparent'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            type="button"
            onClick={() => {
              clearAdminToken();
              setVerified(false);
            }}
            className="text-xs text-gray-400 hover:text-white cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {activeSection === 'orders' && <OrdersSection />}
        {activeSection === 'products' && <ProductsSection />}
        {activeSection === 'content' && <SiteContentSection />}
        {activeSection === 'compliance' && <ComplianceSection />}
        {activeSection === 'refunds' && <RefundsSection />}
        {activeSection === 'checkouts' && <CheckoutsSection />}
        {activeSection === 'audit' && <AuditLogsSection />}
      </main>
    </div>
  );
}
