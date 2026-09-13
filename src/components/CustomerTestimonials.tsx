import React, { useState } from 'react';
import { Play, Pause, MoreVertical, Volume2, VolumeX } from 'lucide-react';
import videoOneThumb from '../assets/images/testimonial_video_one_1788882449979.jpg';
import videoTwoThumb from '../assets/images/testimonial_video_two_1788882477711.jpg';

export const CustomerTestimonials: React.FC = () => {
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = (id: number) => {
    if (playingVideo === id) {
      setPlayingVideo(null);
    } else {
      setPlayingVideo(id);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-10 tracking-tight">
        What Our Customers Say About Us ?
      </h2>

      {/* 2 Video Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Video Card 1 */}
        <div className="bg-black rounded-lg overflow-hidden shadow-2xl relative aspect-16/10 flex flex-col justify-between group border border-gray-800">
          {/* Background image / video poster */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
            <img
              src={videoOneThumb}
              alt="Customer testimonial video 1"
              className={`h-full w-auto max-w-full object-contain transition-transform duration-500 ${
                playingVideo === 1 ? 'scale-102 filter-none' : 'group-hover:scale-102 brightness-95'
              }`}
            />
          </div>

          {/* Top Bar with Options */}
          <div className="relative z-10 p-3 flex justify-end">
            <div className="bg-black/60 hover:bg-black/80 text-white p-1 rounded-full cursor-pointer transition-colors backdrop-blur-xs">
              <MoreVertical className="w-4 h-4" />
            </div>
          </div>

          {/* Center Play/Pause Button */}
          <div className="relative z-10 flex items-center justify-center my-auto">
            <button
              type="button"
              onClick={() => togglePlay(1)}
              className="w-14 h-14 bg-black/75 hover:bg-black text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer border border-white/20"
              aria-label={playingVideo === 1 ? 'Pause testimonial' : 'Play testimonial'}
            >
              {playingVideo === 1 ? (
                <Pause className="w-6 h-6 fill-white" />
              ) : (
                <Play className="w-6 h-6 fill-white ml-0.5" />
              )}
            </button>
          </div>

          {/* Bottom Vimeo Style Player Controls */}
          <div className="relative z-10 p-3 bg-linear-to-t from-black via-black/80 to-transparent flex flex-col gap-1.5">
            {/* Progress bar */}
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full bg-[#fed000] rounded-full transition-all duration-300 ${
                  playingVideo === 1 ? 'w-2/3 animate-pulse' : 'w-1/4'
                }`}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/90">
              <div className="flex items-center gap-2">
                <span className="font-mono">{playingVideo === 1 ? '00:38' : '00:59'}</span>
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="hover:text-amber-300 transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Vimeo 'v' logo icon */}
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M22.396 7.164c-.093 2.026-1.507 4.799-4.245 8.32C15.323 19.161 12.935 21 10.99 21c-1.214 0-2.24-1.119-3.079-3.359l-1.68-6.16c-.622-2.24-1.29-3.36-2.004-3.36-.156 0-.7.328-1.634.98l-.979-1.26c1.026-.902 2.04-1.806 3.037-2.709 1.368-1.182 2.395-1.805 3.08-1.868 1.618-.156 2.614.95 2.988 3.32l1.246 6.845c.435 2.18.964 3.27 1.587 3.27.498 0 1.214-.778 2.148-2.333.933-1.556 1.431-2.741 1.493-3.553.125-1.307-.373-1.96-1.493-1.96-.53 0-1.074.124-1.634.373 1.09-3.582 3.177-5.326 6.26-5.234 2.272.062 3.33 1.524 3.176 4.388z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Video Card 2 */}
        <div className="bg-black rounded-lg overflow-hidden shadow-2xl relative aspect-16/10 flex flex-col justify-between group border border-gray-800">
          {/* Background image / video poster */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
            <img
              src={videoTwoThumb}
              alt="Customer testimonial video 2"
              className={`h-full w-auto max-w-full object-contain transition-transform duration-500 ${
                playingVideo === 2 ? 'scale-102 filter-none' : 'group-hover:scale-102 brightness-95'
              }`}
            />
          </div>

          {/* Text bubble caption overlay matching screenshot 5 */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 w-44 bg-white/90 text-gray-900 text-[10px] font-bold py-1 px-2.5 rounded shadow text-center select-none backdrop-blur-xs">
            if you&apos;ve been looking for reliable delivery
          </div>

          {/* Top Bar with Options */}
          <div className="relative z-10 p-3 flex justify-end">
            <div className="bg-black/60 hover:bg-black/80 text-white p-1 rounded-full cursor-pointer transition-colors backdrop-blur-xs">
              <MoreVertical className="w-4 h-4" />
            </div>
          </div>

          {/* Center Play/Pause Button */}
          <div className="relative z-10 flex items-center justify-center my-auto">
            <button
              type="button"
              onClick={() => togglePlay(2)}
              className="w-14 h-14 bg-black/75 hover:bg-black text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer border border-white/20"
              aria-label={playingVideo === 2 ? 'Pause testimonial' : 'Play testimonial'}
            >
              {playingVideo === 2 ? (
                <Pause className="w-6 h-6 fill-white" />
              ) : (
                <Play className="w-6 h-6 fill-white ml-0.5" />
              )}
            </button>
          </div>

          {/* Bottom Vimeo Style Player Controls */}
          <div className="relative z-10 p-3 bg-linear-to-t from-black via-black/80 to-transparent flex flex-col gap-1.5">
            {/* Progress bar */}
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full bg-[#fed000] rounded-full transition-all duration-300 ${
                  playingVideo === 2 ? 'w-1/2 animate-pulse' : 'w-1/6'
                }`}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/90">
              <div className="flex items-center gap-2">
                <span className="font-mono">{playingVideo === 2 ? '00:45' : '01:02'}</span>
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="hover:text-amber-300 transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Vimeo 'v' logo icon */}
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M22.396 7.164c-.093 2.026-1.507 4.799-4.245 8.32C15.323 19.161 12.935 21 10.99 21c-1.214 0-2.24-1.119-3.079-3.359l-1.68-6.16c-.622-2.24-1.29-3.36-2.004-3.36-.156 0-.7.328-1.634.98l-.979-1.26c1.026-.902 2.04-1.806 3.037-2.709 1.368-1.182 2.395-1.805 3.08-1.868 1.618-.156 2.614.95 2.988 3.32l1.246 6.845c.435 2.18.964 3.27 1.587 3.27.498 0 1.214-.778 2.148-2.333.933-1.556 1.431-2.741 1.493-3.553.125-1.307-.373-1.96-1.493-1.96-.53 0-1.074.124-1.634.373 1.09-3.582 3.177-5.326 6.26-5.234 2.272.062 3.33 1.524 3.176 4.388z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
