import React from 'react';
import heroEarthImage from '../assets/images/earth_space_hero_1788882424617.jpg';
import { resolveImageSrc } from './ProductArtwork';
import { useSiteContent } from '../SiteContentContext';

interface HeroProps {
  onWhyChooseUsClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onWhyChooseUsClick }) => {
  const { hero } = useSiteContent();
  const backgroundSrc = (hero.backgroundImageUrl && resolveImageSrc(hero.backgroundImageUrl)) || heroEarthImage;

  return (
    <div className="relative w-full overflow-hidden bg-black text-white min-h-[440px] md:min-h-[520px] flex items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={backgroundSrc}
          alt="Hero background"
          className="w-full h-full object-cover object-center opacity-85 brightness-90"
        />
        {/* Soft vignette overlay */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/60 pointer-events-none"></div>
      </div>

      {/* Hero Content Stack */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 flex flex-col items-center text-center">
        {/* USA Domestic Typography: USA with US flag pattern, Domestic in solid yellow */}
        <div className="flex items-center justify-center mb-1 select-none w-full">
          <svg
            viewBox="0 0 680 95"
            className="w-full max-w-[440px] sm:max-w-[560px] md:max-w-[660px] h-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] overflow-visible"
          >
            <defs>
              <pattern
                id="usaFlagPattern"
                x="130"
                y="10"
                width="142"
                height="70"
                patternUnits="userSpaceOnUse"
              >
                {/* 13 Red and White Stripes */}
                <rect y="0" width="142" height="5.4" fill="#b91c1c" />
                <rect y="5.4" width="142" height="5.4" fill="#ffffff" />
                <rect y="10.8" width="142" height="5.4" fill="#b91c1c" />
                <rect y="16.2" width="142" height="5.4" fill="#ffffff" />
                <rect y="21.6" width="142" height="5.4" fill="#b91c1c" />
                <rect y="27.0" width="142" height="5.4" fill="#ffffff" />
                <rect y="32.4" width="142" height="5.4" fill="#b91c1c" />
                <rect y="37.8" width="142" height="5.4" fill="#ffffff" />
                <rect y="43.2" width="142" height="5.4" fill="#b91c1c" />
                <rect y="48.6" width="142" height="5.4" fill="#ffffff" />
                <rect y="54.0" width="142" height="5.4" fill="#b91c1c" />
                <rect y="59.4" width="142" height="5.4" fill="#ffffff" />
                <rect y="64.8" width="142" height="5.4" fill="#b91c1c" />

                {/* Blue canton for the stars on upper-left */}
                <rect x="0" y="0" width="60" height="37.8" fill="#1e3a8a" />

                {/* White Stars */}
                <g fill="#ffffff">
                  <circle cx="10" cy="7" r="1.6" />
                  <circle cx="23" cy="7" r="1.6" />
                  <circle cx="36" cy="7" r="1.6" />
                  <circle cx="49" cy="7" r="1.6" />

                  <circle cx="16" cy="14" r="1.6" />
                  <circle cx="29" cy="14" r="1.6" />
                  <circle cx="42" cy="14" r="1.6" />

                  <circle cx="10" cy="21" r="1.6" />
                  <circle cx="23" cy="21" r="1.6" />
                  <circle cx="36" cy="21" r="1.6" />
                  <circle cx="49" cy="21" r="1.6" />

                  <circle cx="16" cy="28" r="1.6" />
                  <circle cx="29" cy="28" r="1.6" />
                  <circle cx="42" cy="28" r="1.6" />

                  <circle cx="10" cy="34" r="1.6" />
                  <circle cx="23" cy="34" r="1.6" />
                  <circle cx="36" cy="34" r="1.6" />
                  <circle cx="49" cy="34" r="1.6" />
                </g>
              </pattern>
            </defs>

            {/* USA: filled with USA Flag */}
            <text
              x="272"
              y="74"
              textAnchor="end"
              fontSize="76"
              fontWeight="900"
              fontFamily="'Impact', 'Barlow Condensed', 'Oswald', 'Anton', sans-serif"
              fill="url(#usaFlagPattern)"
              letterSpacing="2"
            >
              USA
            </text>

            {/* Domestic: filled with bright yellow */}
            <text
              x="288"
              y="74"
              textAnchor="start"
              fontSize="76"
              fontWeight="900"
              fontFamily="'Impact', 'Barlow Condensed', 'Oswald', 'Anton', sans-serif"
              fill="#fed000"
              letterSpacing="0.5"
            >
              Domestic
            </text>
          </svg>
        </div>

        {/* Headline */}
        <h1
          style={{ fontFamily: "'Impact', 'Barlow Condensed', 'Oswald', 'Anton', sans-serif" }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-[88px] font-black text-[#fed000] tracking-tight leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] my-2 select-none"
        >
          {hero.headline}
        </h1>

          {/* Badge */}
          <div className="mt-3 mb-6 inline-block bg-[#1a5baf] hover:bg-[#164e96] transition-colors border border-blue-400/40 rounded-full px-7 py-2.5 shadow-lg">
            <span className="text-lg sm:text-xl md:text-2xl font-black tracking-wide text-white">
              {hero.badgeText}
            </span>
          </div>

          {/* CTA Button */}
          <button
            type="button"
            onClick={onWhyChooseUsClick}
            className="bg-[#fed000] hover:bg-[#ffc800] text-gray-950 font-bold px-7 py-2.5 rounded-md shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer text-sm sm:text-base"
          >
            {hero.ctaLabel}
          </button>
        </div>
      </div>
  );
};
