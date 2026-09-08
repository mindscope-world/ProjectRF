import React from 'react';

interface EuHeroProps {
  onWhyChooseUsClick?: () => void;
}

export const EuHero: React.FC<EuHeroProps> = ({ onWhyChooseUsClick }) => {
  return (
    <section className="relative w-full bg-black overflow-hidden select-none border-b border-gray-800">
      {/* Background Image: Night view of Europe from space */}
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/images/eu_night_earth_1788885195547.jpg"
          alt="Europe night orbital view"
          className="w-full h-full object-cover object-center opacity-85"
        />
        {/* Dark gradient overlays to balance contrast and match original */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 pointer-events-none"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16 sm:py-24 md:py-32 flex flex-col items-center justify-center text-center">
        {/* Top Text: "Fastest" with chrome shine & cyan star lens flare */}
        <div className="relative inline-block mb-3 sm:mb-4">
          {/* Cyan sparkle star lens flare */}
          <div className="absolute -top-3 -left-5 sm:-top-5 sm:-left-7 w-8 h-8 sm:w-12 sm:h-12 pointer-events-none z-20 flex items-center justify-center animate-pulse">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#38bdf8]">
              <polygon
                points="50,0 56,38 94,44 58,52 50,100 42,52 6,44 44,38"
                fill="#ffffff"
              />
              <circle cx="50" cy="46" r="8" fill="#38bdf8" opacity="0.9" />
            </svg>
          </div>

          <h1
            className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black italic tracking-tight uppercase leading-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]"
            style={{
              fontFamily: "'Impact', 'Barlow Condensed', 'Anton', sans-serif",
              background: 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 45%, #94a3b8 70%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              WebkitTextStroke: '2px #0f172a',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.8))',
            }}
          >
            Fastest
          </h1>
        </div>

        {/* Speech Bubble: "EU to EU Delivery" */}
        <div className="relative my-2 sm:my-4 z-20">
          <div className="relative bg-[#fed000] text-black px-6 sm:px-10 py-2 sm:py-3 rounded-2xl sm:rounded-3xl shadow-[0_8px_25px_rgba(0,0,0,0.7)] border-2 border-black/80 inline-block transform hover:scale-105 transition-transform duration-200">
            <span
              className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight leading-none block whitespace-nowrap"
              style={{
                fontFamily: "'Impact', 'Barlow Condensed', 'Arial Black', sans-serif",
              }}
            >
              EU to EU Delivery
            </span>

            {/* Speech bubble pointer / tail on the bottom-right */}
            <div
              className="absolute -bottom-3 sm:-bottom-4 right-8 sm:right-12 w-0 h-0 border-l-[14px] sm:border-l-[18px] border-l-transparent border-r-[14px] sm:border-r-[18px] border-r-transparent border-t-[14px] sm:border-t-[18px] border-t-[#fed000] filter drop-shadow-[0_4px_2px_rgba(0,0,0,0.5)]"
            ></div>
          </div>
        </div>

        {/* Bottom Text: "in the world !" in yellow heavy italic */}
        <div className="mt-4 sm:mt-6 mb-6 sm:mb-8">
          <span
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic tracking-tight leading-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.95)]"
            style={{
              fontFamily: "'Impact', 'Barlow Condensed', 'Anton', sans-serif",
              color: '#ffe600',
              WebkitTextStroke: '2px #18181b',
              textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 6px 12px rgba(0,0,0,0.8)',
            }}
          >
            in the world !
          </span>
        </div>

        {/* Button: "Why Choose Us?" */}
        <div>
          <button
            type="button"
            onClick={onWhyChooseUsClick}
            className="bg-[#fed000] hover:bg-[#ffdf33] text-black font-extrabold text-sm sm:text-base md:text-lg px-8 sm:px-12 py-3 sm:py-3.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer border border-yellow-600/30 active:scale-95"
          >
            Why Choose Us?
          </button>
        </div>
      </div>
    </section>
  );
};
