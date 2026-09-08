import React from 'react';
import { Truck, Tag, Headphones, CreditCard } from 'lucide-react';

export const FeatureBar: React.FC = () => {
  const features = [
    {
      icon: Truck,
      title: 'Daily Rapid Shipping',
      subtitle: 'With Tracking',
    },
    {
      icon: Tag,
      title: 'Bitcoin 5% discount',
      subtitle: 'BTC 5% off',
    },
    {
      icon: Headphones,
      title: '24*7 Online Support',
      subtitle: '8 Hours max',
    },
    {
      icon: CreditCard,
      title: 'Easy Secure Payment',
      subtitle: 'Multiple options',
    },
  ];

  return (
    <div className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-gray-200">
          {features.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center gap-4 px-4 justify-center sm:justify-start lg:justify-center">
                <div className="text-gray-800">
                  <Icon className="w-9 h-9 stroke-[1.5]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 leading-tight">
                    {item.title}
                  </div>
                  <div className="text-xs text-gray-500 font-normal">
                    {item.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
