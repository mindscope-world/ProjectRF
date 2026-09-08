import React from 'react';
import { Star } from 'lucide-react';
import { Product } from '../types';
import { ProductArtwork, UsaDomesticSeal } from './ProductArtwork';

interface ProductCardProps {
  product: Product;
  onSelectOptions: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectOptions }) => {
  return (
    <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-sm p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-md relative group">
      {/* Top Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
        {product.badges?.map((badge, idx) => {
          if (badge.variant === 'price-drop') {
            return (
              <div
                key={idx}
                className="bg-black text-white text-[11px] font-black px-2 py-0.5 rounded-xs flex items-center gap-1 shadow-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Price Drop</span>
              </div>
            );
          }
          if (badge.variant === 'back-in-stock') {
            return (
              <div
                key={idx}
                className="bg-[#fed000] text-black text-[11px] font-black px-2 py-0.5 rounded-xs uppercase tracking-tight shadow-xs leading-none"
              >
                BACK IN<br />STOCK
              </div>
            );
          }
          if (badge.variant === 'out-of-stock') {
            return (
              <div
                key={idx}
                className="bg-black text-white text-[11px] font-black px-2 py-0.5 rounded-xs uppercase tracking-tight shadow-xs leading-none"
              >
                OUT OF<br />STOCK
              </div>
            );
          }
          if (badge.variant === 'sealed-bottle') {
            return (
              <div
                key={idx}
                className="bg-[#fed000] text-black text-[10px] font-black px-2 py-0.5 rounded-xs uppercase shadow-xs leading-none"
              >
                SEALED<br />BOTTLE
              </div>
            );
          }
          if (badge.variant === 'no-fent') {
            return (
              <div
                key={idx}
                className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-xs flex items-center gap-1 shadow-xs"
              >
                <span>✓</span>
                <span>Tested No Fent</span>
              </div>
            );
          }
          if (badge.variant === 'eu-delivery') {
            return (
              <div
                key={idx}
                className="bg-[#fed000] text-black text-[11px] font-black px-2.5 py-1 rounded-xs uppercase tracking-tight shadow-md -rotate-2 border border-black/10 select-none"
              >
                EU TO EU DELIVERY
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Product Image Box with USA Domestic seal */}
      <div className="relative w-full mb-3 flex items-center justify-center overflow-hidden">
        <ProductArtwork imageKey={product.imageKey} name={product.name} />

        {/* USA DOMESTIC badge seal */}
        {product.hasUsaDomesticBadge && (
          <div className="absolute bottom-1 right-1 z-10 pointer-events-none">
            <UsaDomesticSeal className="w-14 h-14 sm:w-16 sm:h-16" />
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="flex flex-col flex-1 justify-between">
        <div>
          {/* Title */}
          <h3 className="text-sm font-bold text-gray-900 leading-snug mb-1 min-h-[2.5rem] line-clamp-2">
            {product.name}
          </h3>

          {/* Star Rating */}
          <div className="flex items-center gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => {
              const isFilled = product.rating > 0 && i < product.rating;
              return (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    isFilled
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-amber-300 fill-transparent stroke-[1.5]'
                  }`}
                />
              );
            })}
          </div>

          {/* Price Range */}
          <div className="text-sm md:text-base font-bold text-[#0066cc] mb-3">
            {product.priceRange}
          </div>
        </div>

        {/* Select Options Button */}
        <button
          type="button"
          onClick={() => onSelectOptions(product)}
          className="w-full py-2 px-3 border-2 border-[#fed000] hover:bg-[#fed000] text-gray-900 text-xs font-bold rounded-xs transition-colors duration-150 text-center cursor-pointer select-none"
        >
          Select options
        </button>
      </div>
    </div>
  );
};
