import React from 'react';
import { Star } from 'lucide-react';
import rocketBannerImage from '../assets/images/banners/superfast-delivery-banner.jpg';
import paymentIconsGrid from '../assets/images/banners/payment-icons-grid.jpeg';
import badgeThreeDayDelivery from '../assets/images/banners/badge-3-day-delivery.jpg';
import badgeTwentyFourHourDispatch from '../assets/images/banners/badge-24-hour-dispatch.png';
import badgeNoCustoms from '../assets/images/banners/badge-no-customs.png';
import badgeBitcoinDiscount from '../assets/images/banners/badge-bitcoin-5-discount.png';

export const TrustBadges: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      {/* Top 4 Badges Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-items-center mb-8">
        {/* Badge 1: 3 Day Delivery */}
        <div className="flex flex-col items-center select-none group hover:scale-105 transition-transform duration-300">
          <img src={badgeThreeDayDelivery} alt="3 Day Delivery" className="w-32 h-36 object-contain drop-shadow-lg" />
        </div>

        {/* Badge 2: 24 Hour Dispatch */}
        <div className="flex flex-col items-center select-none group hover:scale-105 transition-transform duration-300">
          <img
            src={badgeTwentyFourHourDispatch}
            alt="24 Hour Dispatch"
            className="w-36 h-36 object-contain drop-shadow-lg"
          />
        </div>

        {/* Badge 3: No Customs Involvement */}
        <div className="flex flex-col items-center select-none group hover:scale-105 transition-transform duration-300">
          <img src={badgeNoCustoms} alt="No Customs Involvement" className="w-36 h-36 object-contain drop-shadow-lg" />
        </div>

        {/* Badge 4: Bitcoin 5% Discount */}
        <div className="flex flex-col items-center select-none group hover:scale-105 transition-transform duration-300">
          <img
            src={badgeBitcoinDiscount}
            alt="5% Discount With Bitcoin"
            className="w-36 h-36 object-contain drop-shadow-lg"
          />
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
          <img
            src={paymentIconsGrid}
            alt="Accepted payment methods: Apple Pay, Bitcoin, Credit Card, Cash App, Zelle, Amazon Pay"
            className="w-full max-w-xs sm:max-w-sm object-contain"
          />
        </div>
      </div>
    </section>
  );
};
