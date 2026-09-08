import React, { useState } from 'react';
import { User, Star } from 'lucide-react';
import { EU_REVIEWS, EuReview } from '../data/euReviews';

export const EuReviewsSection: React.FC = () => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 my-14" id="eu-reviews-section">
      {/* Outer Mint/Sage Green Container */}
      <div className="bg-[#dcefe8] rounded-2xl p-6 sm:p-8 md:p-10 border border-[#c3dfd5] shadow-xs">
        {/* Section Heading */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Our Reviews
          </h2>
        </div>

        {/* 6 Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {EU_REVIEWS.map((review: EuReview) => (
            <div
              key={review.id}
              className="bg-white rounded-xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                {/* Review Title */}
                <h3 className="font-bold text-gray-950 text-base mb-2 line-clamp-1">
                  {review.title}
                </h3>

                {/* 5 Bright Orange Stars (Matching Image 3) */}
                <div className="flex items-center gap-0.5 mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-xs bg-[#ff6b00] flex items-center justify-center p-0.5 shadow-2xs"
                    >
                      <Star className="w-3 h-3 fill-white text-white" />
                    </div>
                  ))}
                </div>

                {/* Review Body */}
                <p className="text-xs sm:text-[13px] text-gray-700 leading-relaxed mb-4">
                  {review.body}
                </p>

                {/* Customer Photo Attachment (if present) */}
                {review.image && (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(review.image || null)}
                      className="relative rounded-lg overflow-hidden border border-gray-200 group block cursor-pointer w-32 h-24 sm:w-36 sm:h-28"
                      title="Click to view full photo"
                    >
                      <img
                        src={review.image}
                        alt={`Photo by ${review.author}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          View
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Author and Date Footer */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-2">
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-gray-900 leading-tight">
                    {review.author}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {review.date}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-xl overflow-hidden p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto}
              alt="Review Attachment"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
