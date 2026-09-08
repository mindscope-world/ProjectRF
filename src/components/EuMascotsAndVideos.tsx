import React, { useState } from 'react';
import { Play, Volume2, MoreHorizontal, X } from 'lucide-react';

export const EuMascotsAndVideos: React.FC = () => {
  const [activeVideo, setActiveVideo] = useState<{
    title: string;
    person: string;
    caption: string;
    duration: string;
    image: string;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 my-14">
      {/* 1. Mascot Promotional Banners (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {/* Left: Crash Bandicoot 5 Years Nitro Fueled Delivery */}
        <div className="relative rounded-2xl overflow-hidden shadow-xl border-2 border-amber-400 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 p-6 flex flex-col justify-between min-h-[220px] group">
          <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-overlay">
            <img
              src="/src/assets/images/crash_mascot_banner_1788885249392.jpg"
              alt="Nitro Fueled Delivery Background"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-4">
            {/* Left Typography */}
            <div className="flex flex-col text-left">
              <span
                className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                style={{ fontFamily: "'Impact', 'Barlow Condensed', sans-serif" }}
              >
                5 YEARS EMR
              </span>
              <span
                className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-white tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                style={{ fontFamily: "'Impact', 'Barlow Condensed', sans-serif" }}
              >
                RAPID & RELIABLE
              </span>
              <span
                className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider text-yellow-200 leading-none mt-1 drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]"
                style={{
                  fontFamily: "'Impact', 'Barlow Condensed', sans-serif",
                  WebkitTextStroke: '1px #7f1d1d',
                }}
              >
                NITRO FUELED
              </span>
              <span
                className="text-2xl sm:text-3xl font-black italic text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-serif mt-0.5"
              >
                Delivery
              </span>
            </div>

            {/* Mascot Image Thumbnail */}
            <div className="shrink-0 w-32 h-32 sm:w-40 sm:h-40 relative rounded-xl overflow-hidden shadow-2xl border-2 border-yellow-300 group-hover:scale-105 transition-transform duration-300">
              <img
                src="/src/assets/images/crash_mascot_banner_1788885249392.jpg"
                alt="Crash Bandicoot Nitro Fueled Mascot"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="relative z-10 mt-4 flex items-center gap-2">
            <span className="bg-black/60 backdrop-blur-xs text-amber-300 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-amber-400/40">
              Dispatched daily • Intra-EU express
            </span>
          </div>
        </div>

        {/* Right: Donkey Kong 5% Discount with Bitcoin Payment */}
        <div className="relative rounded-2xl overflow-hidden shadow-xl border-2 border-yellow-400 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-6 flex flex-col justify-between min-h-[220px] group">
          <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-overlay">
            <img
              src="/src/assets/images/dk_mascot_banner_1788885265697.jpg"
              alt="Bitcoin Discount Background"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-4">
            {/* Left Typography */}
            <div className="flex flex-col text-left">
              <span
                className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]"
                style={{
                  fontFamily: "'Impact', 'Barlow Condensed', sans-serif",
                  color: '#fff',
                  WebkitTextStroke: '2px #78350f',
                }}
              >
                5% DISCOUNT
              </span>
              <span
                className="text-lg sm:text-xl md:text-2xl font-black uppercase text-gray-950 tracking-wider leading-tight mt-1"
                style={{ fontFamily: "'Impact', 'Barlow Condensed', sans-serif" }}
              >
                WITH BITCOIN PAYMENT
              </span>
              <span className="text-xs sm:text-sm font-bold text-amber-950 mt-2 max-w-xs">
                Automatic instant discount deducted during checkout with crypto.
              </span>
            </div>

            {/* Mascot Image Thumbnail */}
            <div className="shrink-0 w-32 h-32 sm:w-40 sm:h-40 relative rounded-xl overflow-hidden shadow-2xl border-2 border-white group-hover:scale-105 transition-transform duration-300">
              <img
                src="/src/assets/images/dk_mascot_banner_1788885265697.jpg"
                alt="Donkey Kong Mascot"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="relative z-10 mt-4 flex items-center gap-2">
            <span className="bg-gray-950 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-yellow-400">
              ₿ Instant Verification • No ID Required
            </span>
          </div>
        </div>
      </div>

      {/* 2. Video Reviews: "What Our Customers Say About Us ?" */}
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
          What Our Customers Say About Us ?
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Video Card 1: Woman with peasant top */}
        <div
          onClick={() => {
            setActiveVideo({
              title: 'Eurofinil Intra-EU Fast Delivery Review',
              person: 'Sarah (Verified Customer, Spain)',
              caption: 'Everything arrived in 3 days in discrete packaging.',
              duration: '00:59',
              image: '/src/assets/images/video_review_woman_one_1788885280589.jpg',
            });
            setIsPlaying(true);
          }}
          className="relative rounded-xl overflow-hidden shadow-lg border border-gray-300 bg-black aspect-[16/10] group cursor-pointer"
        >
          <img
            src="/src/assets/images/video_review_woman_one_1788885280589.jpg"
            alt="Customer Video Review 1"
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 opacity-90"
          />

          {/* Top 3-dots Menu */}
          <div className="absolute top-3 right-3 text-white bg-black/40 backdrop-blur-xs p-1 rounded-full hover:bg-black/60 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </div>

          {/* Center Large Translucent Play Button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 border-2 border-white/80 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#fed000] group-hover:border-[#fed000] transition-all duration-200 shadow-2xl">
              <Play className="w-7 h-7 sm:w-9 sm:h-9 text-white group-hover:text-black fill-current ml-1" />
            </div>
          </div>

          {/* Bottom Vimeo Style Player Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 flex items-center gap-3 text-white text-xs select-none">
            <button type="button" className="hover:text-amber-400">
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
            <span className="font-mono text-[11px] font-semibold text-gray-200">00:59</span>
            {/* Scrubber Bar */}
            <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-[#00adef]"></div>
            </div>
            <Volume2 className="w-4 h-4 text-gray-200" />
            {/* Vimeo 'v' logo */}
            <div className="w-4 h-4 bg-white rounded-xs flex items-center justify-center font-bold text-black text-[9px] italic">
              v
            </div>
          </div>
        </div>

        {/* Video Card 2: Brunette woman with caption */}
        <div
          onClick={() => {
            setActiveVideo({
              title: 'If You Have Been Looking for Modafinil in Europe',
              person: 'Elena (Verified Customer, Germany)',
              caption: 'if you’ve been looking for Modafinil',
              duration: '01:02',
              image: '/src/assets/images/video_review_woman_two_1788885295167.jpg',
            });
            setIsPlaying(true);
          }}
          className="relative rounded-xl overflow-hidden shadow-lg border border-gray-300 bg-black aspect-[16/10] group cursor-pointer"
        >
          <img
            src="/src/assets/images/video_review_woman_two_1788885295167.jpg"
            alt="Customer Video Review 2"
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 opacity-90"
          />

          {/* Top 3-dots Menu */}
          <div className="absolute top-3 right-3 text-white bg-black/40 backdrop-blur-xs p-1 rounded-full hover:bg-black/60 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </div>

          {/* Text Overlay: "if you've been looking for Modafinil" (Matching Image 4) */}
          <div className="absolute top-1/4 inset-x-6 flex justify-center pointer-events-none">
            <span className="bg-black/75 text-white font-bold text-sm sm:text-base px-4 py-1.5 rounded-lg shadow-lg border border-white/20">
              if you&apos;ve been looking for Modafinil
            </span>
          </div>

          {/* Center Large Translucent Play Button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 border-2 border-white/80 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#fed000] group-hover:border-[#fed000] transition-all duration-200 shadow-2xl">
              <Play className="w-7 h-7 sm:w-9 sm:h-9 text-white group-hover:text-black fill-current ml-1" />
            </div>
          </div>

          {/* Bottom Vimeo Style Player Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 flex items-center gap-3 text-white text-xs select-none">
            <button type="button" className="hover:text-amber-400">
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
            <span className="font-mono text-[11px] font-semibold text-gray-200">01:02</span>
            {/* Scrubber Bar */}
            <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div className="w-1/2 h-full bg-[#00adef]"></div>
            </div>
            <Volume2 className="w-4 h-4 text-gray-200" />
            {/* Vimeo 'v' logo */}
            <div className="w-4 h-4 bg-white rounded-xs flex items-center justify-center font-bold text-black text-[9px] italic">
              v
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Video Modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-gray-950 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Video Player Header */}
            <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 text-white">
              <div>
                <h4 className="font-bold text-base text-[#fed000]">{activeVideo.title}</h4>
                <p className="text-xs text-gray-400">{activeVideo.person}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="text-gray-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <img
                src={activeVideo.image}
                alt={activeVideo.title}
                className="w-full h-full object-cover"
              />

              {/* Subtitles Overlay */}
              <div className="absolute bottom-16 inset-x-8 text-center pointer-events-none">
                <span className="bg-black/80 text-white text-sm sm:text-base font-semibold px-4 py-1.5 rounded-lg border border-gray-700 inline-block shadow-md">
                  &ldquo;{activeVideo.caption}&rdquo;
                </span>
              </div>

              {/* Central Play/Pause Toggle */}
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer"
              >
                <div className="w-20 h-20 rounded-full bg-[#fed000] text-black flex items-center justify-center shadow-2xl">
                  {isPlaying ? (
                    <div className="flex gap-2">
                      <div className="w-2.5 h-7 bg-black rounded-xs"></div>
                      <div className="w-2.5 h-7 bg-black rounded-xs"></div>
                    </div>
                  ) : (
                    <Play className="w-9 h-9 fill-current ml-1" />
                  )}
                </div>
              </button>
            </div>

            {/* Player Controls */}
            <div className="p-4 bg-gray-900 flex items-center justify-between text-white text-xs border-t border-gray-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-[#fed000] font-bold text-sm"
                >
                  {isPlaying ? 'PAUSE' : 'PLAY'}
                </button>
                <span className="text-gray-400 font-mono">00:18 / {activeVideo.duration}</span>
              </div>
              <span className="text-xs text-gray-400">Verified Customer Video Testimonial</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
