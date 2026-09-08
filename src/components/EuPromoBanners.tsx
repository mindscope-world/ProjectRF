import React from 'react';

export const EuPromoBanners: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 my-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Superfast Intra-Eu Delivery Banner with Astronaut & Rocket */}
        <div className="lg:col-span-8 relative rounded-xl overflow-hidden shadow-lg border border-slate-700/60 bg-[#090d16] flex flex-col sm:flex-row items-center justify-between p-5 sm:p-6 min-h-[160px] group">
          {/* Cosmic background image */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <img
              src="/src/assets/images/eu_astronaut_banner_1788885220443.jpg"
              alt="Space background"
              className="w-full h-full object-cover object-right"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b14] via-[#0b1220]/90 to-transparent pointer-events-none"></div>

          {/* Left Text content */}
          <div className="relative z-10 flex flex-col items-start text-left mb-4 sm:mb-0 max-w-md">
            {/* Superfast Title */}
            <div
              className="text-3xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-wider leading-tight"
              style={{
                fontFamily: "'Impact', 'Barlow Condensed', sans-serif",
                background: 'linear-gradient(180deg, #ffffff 0%, #38bdf8 60%, #0284c7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                WebkitTextStroke: '1px #0369a1',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
              }}
            >
              Superfast
            </div>

            {/* Intra-Eu Delivery Title */}
            <div
              className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight leading-none mt-1"
              style={{
                fontFamily: "'Impact', 'Barlow Condensed', sans-serif",
                background: 'linear-gradient(180deg, #fef08a 0%, #f97316 60%, #dc2626 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                WebkitTextStroke: '1px #7f1d1d',
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.9))',
              }}
            >
              Intra-Eu Delivery
            </div>

            {/* 5 Golden Stars */}
            <div className="flex items-center gap-1.5 mt-3">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-amber-400 text-amber-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                >
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              ))}
            </div>
          </div>

          {/* Right Visual Artwork */}
          <div className="relative z-10 flex items-center justify-center shrink-0 w-44 h-32 sm:w-56 sm:h-36">
            <img
              src="/src/assets/images/eu_astronaut_banner_1788885220443.jpg"
              alt="Astronaut & Rocket Intra-EU Delivery"
              className="w-full h-full object-cover rounded-lg shadow-md border border-cyan-500/30 group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>

        {/* Right: Payment Badges (Bitcoin + SEPA) */}
        <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col justify-between gap-4">
          {/* BITCOIN accepted here Gold Badge */}
          <div className="flex-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 p-0.5 rounded-xl shadow-md">
            <div className="bg-[#18181b] rounded-[10px] p-3.5 flex items-center gap-3.5 h-full">
              {/* Gold Coin Icon */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-300 p-1 flex items-center justify-center shadow-lg shrink-0 border-2 border-amber-300">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center font-black text-2xl text-gray-950 shadow-inner">
                  ₿
                </div>
              </div>

              {/* Text */}
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 leading-none">
                  Instant Payment
                </span>
                <span className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                  BITCOIN accepted here
                </span>
                <span className="text-[11px] text-gray-400 font-medium">
                  Extra 5% discount at checkout
                </span>
              </div>
            </div>
          </div>

          {/* SEPA (Single Euro Payments Area) EU Seal */}
          <div className="flex-1 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 p-0.5 rounded-xl shadow-md">
            <div className="bg-[#002266] rounded-[10px] p-3.5 flex items-center gap-3.5 h-full relative overflow-hidden">
              {/* Subtle EU stars ring in background */}
              <div className="absolute right-0 top-0 bottom-0 opacity-15 pointer-events-none flex items-center">
                <svg viewBox="0 0 100 100" className="w-24 h-24 fill-amber-300">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#facc15" strokeWidth="2" strokeDasharray="6,14" />
                </svg>
              </div>

              {/* SEPA Badge Logo */}
              <div className="w-14 h-14 rounded-lg bg-gradient-to-b from-[#003399] to-[#001f5c] border border-blue-400/40 flex flex-col items-center justify-center shadow-md shrink-0">
                {/* 3 mini gold stars */}
                <div className="flex gap-1 mb-0.5">
                  <span className="text-[8px] text-amber-300">★</span>
                  <span className="text-[8px] text-amber-300">★</span>
                  <span className="text-[8px] text-amber-300">★</span>
                </div>
                <div className="text-base font-black tracking-tight text-white leading-none">
                  S<span className="text-amber-300">€</span>PA
                </div>
              </div>

              {/* Text */}
              <div className="flex flex-col z-10">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300 leading-none">
                  <span>★ ★ ★</span>
                  <span className="uppercase">Euro Transfer</span>
                </div>
                <span className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                  SEPA Instant Bank Wire
                </span>
                <span className="text-[11px] text-blue-200 font-medium">
                  Zero fee IBAN payments across Europe
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
