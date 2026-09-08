import React from 'react';
import { Star } from 'lucide-react';
import rocketBannerImage from '../assets/images/superfast_delivery_rocket_1788882496624.jpg';

export const TrustBadges: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      {/* Top 4 Badges Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-items-center mb-8">
        {/* Badge 1: 3 Day Delivery Eagle Shield */}
        <div className="flex flex-col items-center select-none group hover:scale-105 transition-transform duration-300">
          <div className="relative w-32 h-36 flex items-center justify-center">
            <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-lg">
              {/* Shield base */}
              <defs>
                <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a8a" />
                  <stop offset="50%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <path
                d="M 60,8 L 108,24 C 108,80 60,128 60,132 C 60,128 12,80 12,24 Z"
                fill="url(#shieldGrad)"
                stroke="url(#goldRim)"
                strokeWidth="4"
              />
              {/* Eagle head graphic */}
              <path
                d="M 60,35 C 72,35 84,46 84,62 C 84,78 72,82 64,84 L 56,84 C 48,82 36,78 36,62 C 36,46 48,35 60,35 Z"
                fill="#ffffff"
              />
              {/* Eagle beak */}
              <path d="M 60,65 Q 60,78 68,82 Q 58,80 54,72 Z" fill="#f59e0b" />
              {/* Eagle eye */}
              <circle cx="50" cy="54" r="3" fill="#000000" />
              <circle cx="51" cy="53" r="1" fill="#ffffff" />
              {/* Stars on top */}
              <circle cx="36" cy="28" r="2.5" fill="#fef08a" />
              <circle cx="60" cy="22" r="3.5" fill="#fef08a" />
              <circle cx="84" cy="28" r="2.5" fill="#fef08a" />
              {/* 3 DAY banner */}
              <rect x="18" y="90" width="84" height="22" rx="4" fill="#b91c1c" stroke="#fef08a" strokeWidth="1.5" />
              <text x="60" y="104" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="Arial Black">
                ★ 3 DAY ★
              </text>
              <text x="60" y="117" textAnchor="middle" fill="#fef08a" fontSize="8" fontWeight="bold">
                DELIVERY
              </text>
            </svg>
          </div>
        </div>

        {/* Badge 2: 24 Hour Dispatch Alarm Clock */}
        <div className="flex flex-col items-center select-none group hover:scale-105 transition-transform duration-300">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg viewBox="0 0 130 130" className="w-full h-full drop-shadow-lg">
              {/* Clock bells */}
              <circle cx="35" cy="28" r="16" fill="#e11d48" stroke="#fde047" strokeWidth="3" />
              <circle cx="95" cy="28" r="16" fill="#e11d48" stroke="#fde047" strokeWidth="3" />
              <rect x="58" y="12" width="14" height="12" rx="2" fill="#9ca3af" />
              {/* Clock legs */}
              <line x1="32" y1="108" x2="22" y2="122" stroke="#4b5563" strokeWidth="6" strokeLinecap="round" />
              <line x1="98" y1="108" x2="108" y2="122" stroke="#4b5563" strokeWidth="6" strokeLinecap="round" />
              {/* Clock body */}
              <circle cx="65" cy="68" r="46" fill="#ffffff" stroke="#e11d48" strokeWidth="8" />
              <circle cx="65" cy="68" r="42" fill="#ffffff" stroke="#fde047" strokeWidth="3" />
              {/* Clock hands */}
              <line x1="65" y1="68" x2="65" y2="40" stroke="#111827" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="65" y1="68" x2="84" y2="68" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
              <circle cx="65" cy="68" r="4" fill="#e11d48" />
              {/* 24 hour DISPATCH banner overlay */}
              <rect x="8" y="74" width="114" height="34" rx="6" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
              <text x="65" y="90" textAnchor="middle" fill="#111827" fontSize="14" fontWeight="900" fontFamily="Impact, Arial Black">
                24 hour
              </text>
              <text x="65" y="103" textAnchor="middle" fill="#b91c1c" fontSize="12" fontWeight="900" fontFamily="Impact, Arial Black">
                DISPATCH
              </text>
            </svg>
          </div>
        </div>

        {/* Badge 3: No Custom Involvements Officer */}
        <div className="flex flex-col items-center select-none group hover:scale-105 transition-transform duration-300">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg viewBox="0 0 130 130" className="w-full h-full drop-shadow-lg">
              {/* Officer Circle */}
              <circle cx="65" cy="55" r="40" fill="#38bdf8" stroke="#0284c7" strokeWidth="3" />
              {/* Police cap */}
              <path d="M 32,36 Q 65,18 98,36 L 90,46 Q 65,36 40,46 Z" fill="#1e3a8a" />
              <ellipse cx="65" cy="46" rx="28" ry="4" fill="#000000" />
              <polygon points="65,24 68,30 74,30 69,34 71,40 65,36 59,40 61,34 56,30 62,30" fill="#facc15" />
              {/* Face */}
              <ellipse cx="65" cy="58" rx="20" ry="18" fill="#fdba74" />
              {/* Aviator Sunglasses */}
              <path d="M 48,52 Q 56,50 63,52 L 63,60 Q 56,66 48,60 Z" fill="#0f172a" stroke="#d97706" strokeWidth="1.5" />
              <path d="M 67,52 Q 74,50 82,52 L 82,60 Q 74,66 67,60 Z" fill="#0f172a" stroke="#d97706" strokeWidth="1.5" />
              <line x1="63" y1="53" x2="67" y2="53" stroke="#d97706" strokeWidth="2" />
              {/* Mustache */}
              <path d="M 57,68 Q 65,65 73,68 Q 65,71 57,68" fill="#78350f" />
              {/* No Custom Involvements 3D text banner */}
              <rect x="5" y="82" width="120" height="34" rx="6" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" />
              <text x="65" y="97" textAnchor="middle" fill="#0369a1" fontSize="11" fontWeight="900" fontFamily="Arial Black">
                No Custom
              </text>
              <text x="65" y="111" textAnchor="middle" fill="#0284c7" fontSize="10" fontWeight="900" fontFamily="Arial Black">
                Involvements!
              </text>
            </svg>
          </div>
        </div>

        {/* Badge 4: Bitcoin 5% Discount Coin */}
        <div className="flex flex-col items-center select-none group hover:scale-105 transition-transform duration-300">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg viewBox="0 0 130 130" className="w-full h-full drop-shadow-lg">
              <defs>
                <radialGradient id="btcGrad" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </radialGradient>
              </defs>
              {/* Coin body */}
              <circle cx="65" cy="65" r="48" fill="url(#btcGrad)" stroke="#78350f" strokeWidth="2" />
              <circle cx="65" cy="65" r="42" fill="none" stroke="#fef08a" strokeWidth="2" strokeDasharray="3,2" />
              {/* Bitcoin B symbol */}
              <text
                x="65"
                y="77"
                textAnchor="middle"
                fontSize="38"
                fontWeight="900"
                fontFamily="Impact, Arial Black"
                fill="#ffffff"
                style={{ filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.3))' }}
              >
                ₿
              </text>
              {/* Red ribbon with 5% DISCOUNT */}
              <rect x="6" y="5" width="60" height="24" rx="4" fill="#dc2626" stroke="#ffffff" strokeWidth="1" />
              <text x="36" y="17" textAnchor="middle" fill="#fef08a" fontSize="10" fontWeight="900">
                5%
              </text>
              <text x="36" y="25" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold">
                DISCOUNT
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Row with Rocket Banner and Payment Methods Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2 pb-6 border-b border-gray-100">
        {/* Left: Superfast Delivery Banner */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 bg-linear-to-r from-blue-50/50 via-white to-amber-50/50 rounded-xl border border-gray-100">
          <div className="relative max-w-md w-full flex flex-col items-center">
            <img
              src={rocketBannerImage}
              alt="Superfast USA Domestic Delivery Astronaut Rocket"
              className="w-full max-h-48 object-contain drop-shadow-sm rounded-lg"
              onError={(e) => {
                // fallback if image loading fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Superfast USA Domestic Delivery text & stars */}
            <div className="text-center mt-2">
              <div className="flex items-center justify-center gap-1 my-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400 drop-shadow-xs" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Payment Badges Grid */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-end">
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs sm:max-w-sm">
            {/* Apple Pay */}
            <div className="h-14 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg flex items-center justify-center p-2 shadow-xs transition-colors cursor-pointer">
              <div className="flex items-center gap-1 font-semibold text-gray-900 text-sm">
                <svg className="w-5 h-5" viewBox="0 0 170 170" fill="currentColor">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12.01-14.42-6.53-9.87-11.58-20.9-15.15-33.09-3.57-12.19-5.36-23.77-5.36-34.74 0-14.45 3.77-26.65 11.31-36.6 7.54-9.95 17.2-15.03 28.98-15.24 4.58 0 9.87 1.25 15.87 3.75 6 2.5 10.08 3.86 12.24 4.08 2.05-.22 6.25-1.58 12.6-4.08 6.35-2.5 11.58-3.69 15.69-3.57 9.87.55 18.06 4.29 24.58 11.22 6.53 6.93 10.42 14.88 11.68 23.85-8.81 5.34-13.15 12.63-13.02 21.87.12 8.37 3.48 15.43 10.08 21.18 6.6 5.75 14.28 9.07 23.04 9.96-2.12 6.84-4.87 13.57-8.25 20.19zM119.22 31.84c0-7.39 2.68-14.37 8.04-20.94 5.36-6.57 12.04-10.53 20.04-11.9-1.22 7.73-4.14 14.81-8.77 21.24-4.63 6.43-10.74 10.56-18.33 12.39-.33-.26-.65-.49-.98-.79z" />
                </svg>
                <span>Pay</span>
              </div>
            </div>

            {/* Bitcoin */}
            <div className="h-14 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg flex items-center justify-center p-2 shadow-xs transition-colors cursor-pointer">
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shadow-xs">
                  ₿
                </div>
              </div>
            </div>

            {/* Credit Cards */}
            <div className="h-14 bg-slate-900 text-white hover:bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center p-2 shadow-xs transition-colors cursor-pointer">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500 opacity-80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400 opacity-80 -ml-2"></div>
                  <span className="text-[10px] font-mono tracking-tighter">••••</span>
                </div>
                <span className="text-[8px] uppercase tracking-wider text-gray-300">Credit Card</span>
              </div>
            </div>

            {/* Cash App */}
            <div className="h-14 bg-[#00d632] hover:bg-[#00c02d] text-white rounded-lg flex flex-col items-center justify-center p-1.5 shadow-xs transition-colors cursor-pointer">
              <span className="text-xl font-black leading-none">$</span>
              <span className="text-[8px] font-bold tracking-tight">Cash App</span>
            </div>

            {/* Zelle */}
            <div className="h-14 bg-linear-to-b from-purple-100 to-purple-200 border border-purple-300 rounded-lg flex items-center justify-center p-2 shadow-xs transition-colors cursor-pointer">
              <div className="text-purple-800 font-black text-sm tracking-tight flex items-center gap-0.5">
                <span className="text-lg leading-none">ž</span>elle
              </div>
            </div>

            {/* Amazon Pay */}
            <div className="h-14 bg-gray-900 text-white hover:bg-gray-800 border border-gray-700 rounded-lg flex flex-col items-center justify-center p-2 shadow-xs transition-colors cursor-pointer">
              <span className="text-sm font-bold tracking-tighter">pay</span>
              <div className="w-6 h-1 bg-amber-400 rounded-full mt-0.5"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
