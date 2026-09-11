import React, { useState } from 'react';
import { ShoppingCart, ChevronDown } from 'lucide-react';
import { SHOP_CATEGORIES } from '../constants/categories';
import { BrandLogo } from './BrandLogo';
import { useSiteContent } from '../SiteContentContext';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  isEuPage?: boolean;
  onLogoClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  isEuPage = false,
  onLogoClick,
}) => {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const { announcement } = useSiteContent();

  const categories = ['All Categories', ...SHOP_CATEGORIES];

  return (
    <header className="w-full">
      {/* Top Red Announcement Banner */}
      <div className="bg-[#e60000] text-white text-xs md:text-sm font-medium py-1.5 px-4 text-center select-none shadow-inner tracking-wide">
        {isEuPage ? announcement.euText : announcement.usaText}
      </div>

      {/* Main Yellow Bar */}
      <div className="bg-[#fed000] py-2 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
          {/* Logo */}
          <div className="flex items-center cursor-pointer select-none">
            <button
              type="button"
              onClick={onLogoClick}
              className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none"
            >
              {isEuPage ? (
                /* Brimline Europe EU Stars Ring Logo */
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                      {/* Ring of 12 Golden Stars */}
                      {[...Array(12)].map((_, i) => {
                        const angle = (i * 30 * Math.PI) / 180;
                        const cx = 50 + 38 * Math.sin(angle);
                        const cy = 50 - 38 * Math.cos(angle);
                        return (
                          <polygon
                            key={i}
                            points={`${cx},${cy - 5} ${cx + 1.5},${cy - 1.5} ${cx + 5},${cy - 1.5} ${cx + 2.5},${cy + 1} ${cx + 3.5},${cy + 4.5} ${cx},${cy + 2.5} ${cx - 3.5},${cy + 4.5} ${cx - 2.5},${cy + 1} ${cx - 5},${cy - 1.5} ${cx - 1.5},${cy - 1.5}`}
                            fill="#f59e0b"
                            stroke="#b45309"
                            strokeWidth="0.5"
                          />
                        );
                      })}
                      {/* Central flame */}
                      <path
                        d="M 50,22 C 58,35 68,44 68,58 C 68,69 60,76 50,76 C 40,76 32,69 32,58 C 32,46 44,36 50,22 Z"
                        fill="#dc2626"
                      />
                      <path
                        d="M 50,34 C 55,42 60,49 60,58 C 60,65 55,70 50,70 C 45,70 40,65 40,58 C 40,50 46,43 50,34 Z"
                        fill="#f97316"
                      />
                      <path
                        d="M 50,44 C 53,50 56,54 56,60 C 56,64 53,67 50,67 C 47,67 44,64 44,60 C 44,55 48,51 50,44 Z"
                        fill="#fde047"
                      />
                    </svg>
                  </div>
                  <div className="text-xl md:text-2xl font-black italic tracking-tighter text-red-700 leading-none drop-shadow-[0_2px_1px_rgba(255,255,255,0.8)] [text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]">
                    <span className="text-red-700">Brim</span>
                    <span className="text-amber-300">line</span>
                  </div>
                </div>
              ) : (
                <BrandLogo height={36} />
              )}
            </button>
          </div>

          {/* Search Box */}
          <div className="w-full md:max-w-xl flex items-stretch rounded overflow-hidden shadow-sm bg-white border border-gray-300">
            {/* Category Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="h-full px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs md:text-sm font-medium border-r border-gray-300 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <span>{selectedCategory}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>

              {showCategoryDropdown && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded shadow-lg border border-gray-200 z-50 py-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        onSelectCategory(cat);
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 cursor-pointer ${
                        selectedCategory === cat ? 'bg-amber-100 font-bold text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input Field */}
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs md:text-sm text-gray-800 placeholder-gray-400 outline-none bg-white"
            />

            {/* Search Button */}
            <button
              type="button"
              className="bg-[#1f2421] hover:bg-black text-white px-5 py-1.5 text-xs md:text-sm font-semibold tracking-wide transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>

          {/* Shopping Cart */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={onOpenCart}
              className="relative p-1.5 rounded-full hover:bg-amber-300/40 transition-colors cursor-pointer flex items-center gap-1"
              aria-label="View Cart"
            >
              <ShoppingCart className="w-6 h-6 text-[#22c55e] stroke-[2.2]" />
              <div className="w-4 h-4 bg-[#1f2421] text-white text-[10px] font-black rounded-full flex items-center justify-center -ml-2 -mt-3 shadow-sm">
                {cartCount}
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
