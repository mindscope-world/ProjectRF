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
              <BrandLogo height={36} />
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
