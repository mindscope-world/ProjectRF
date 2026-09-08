import React, { useRef, useEffect } from 'react';
import { SHOP_CATEGORIES, ShopCategory } from '../constants/categories';

interface NavbarProps {
  isCategoriesOpen: boolean;
  onToggleCategories: () => void;
  onCloseCategories: () => void;
  onSelectCategory: (cat: string) => void;
  selectedCategory: string;
  onSelectNav: (nav: string) => void;
  activeNav: string;
  onOpenOffers: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isCategoriesOpen,
  onToggleCategories,
  onCloseCategories,
  onSelectCategory,
  selectedCategory,
  onSelectNav,
  activeNav,
  onOpenOffers,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onCloseCategories();
      }
    };

    if (isCategoriesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoriesOpen, onCloseCategories]);

  const handleCategoryClick = (cat: string) => {
    onSelectCategory(cat);
    // Smooth scroll down to products section
    const target = document.getElementById('best-sellers-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-sm font-medium text-gray-700 h-12">
        {/* Left: Shop by categories button & Dropdown container */}
        <div className="flex items-center h-full">
          <div ref={dropdownRef} className="relative h-full">
            <button
              id="shop-by-categories-button"
              type="button"
              onClick={onToggleCategories}
              className={`flex items-center gap-2.5 px-4 h-full w-56 sm:w-64 border-l-2 border-[#fed000] border-r border-gray-200 hover:bg-gray-50 transition-colors font-semibold text-gray-800 cursor-pointer select-none bg-white ${
                isCategoriesOpen ? 'bg-gray-50' : ''
              }`}
              aria-expanded={isCategoriesOpen}
              aria-haspopup="true"
            >
              {/* Green Hamburger icon */}
              <div className="flex flex-col gap-1 w-4 shrink-0">
                <span className="w-full h-0.5 bg-[#22c55e] rounded-full"></span>
                <span className="w-full h-0.5 bg-[#22c55e] rounded-full"></span>
                <span className="w-full h-0.5 bg-[#22c55e] rounded-full"></span>
              </div>
              <span className="text-[14px] sm:text-[15px] text-gray-800 whitespace-nowrap">
                Shop By Categories
              </span>
            </button>

            {/* Dropdown Menu Container */}
            {isCategoriesOpen && (
              <div
                id="shop-by-categories-menu"
                className="absolute top-full left-0 w-56 sm:w-64 bg-white border-l-2 border-[#fed000] border-r border-gray-200 border-b-4 border-[#fed000] shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <div className="flex flex-col">
                  {SHOP_CATEGORIES.map((cat: ShopCategory) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        id={`category-item-${cat.toLowerCase().replace(/[\s&]+/g, '-')}`}
                        type="button"
                        onClick={() => handleCategoryClick(cat)}
                        className={`w-full text-left px-5 py-3 text-[14px] border-b border-gray-100 transition-colors cursor-pointer block ${
                          isSelected
                            ? 'bg-amber-50 text-gray-950 font-bold'
                            : 'text-gray-800 hover:bg-gray-50 hover:text-black font-normal'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="hidden sm:flex items-center pl-6 gap-5 md:gap-6">
            <button
              type="button"
              onClick={() => onSelectNav('Home')}
              className={`hover:text-amber-600 transition-colors cursor-pointer ${
                activeNav === 'Home' ? 'text-gray-950 font-bold' : 'text-gray-600'
              }`}
            >
              Home
            </button>
            <span className="text-gray-300">|</span>

            <button
              type="button"
              onClick={() => onSelectNav('USA Domestic')}
              className={`hover:text-amber-600 transition-colors cursor-pointer ${
                activeNav === 'USA Domestic' ? 'text-gray-950 font-bold' : 'text-gray-600'
              }`}
            >
              USA Domestic
            </button>
            <span className="text-gray-300">|</span>

            <button
              type="button"
              onClick={() => onSelectNav('UK domestic')}
              className={`hover:text-amber-600 transition-colors cursor-pointer ${
                activeNav === 'UK domestic' ? 'text-gray-950 font-bold' : 'text-gray-600'
              }`}
            >
              UK Domestic
            </button>
            <span className="text-gray-300">|</span>

            <button
              type="button"
              onClick={() => onSelectNav('EU to EU')}
              className={`hover:text-amber-600 transition-colors cursor-pointer ${
                activeNav === 'EU to EU' ? 'text-gray-950 font-bold border-b-2 border-[#fed000] pb-0.5' : 'text-gray-600'
              }`}
            >
              EU to EU
            </button>
            <span className="text-gray-300">|</span>

            <button
              type="button"
              onClick={() => onSelectNav('Join Subreddit')}
              className={`hover:text-amber-600 transition-colors cursor-pointer ${
                activeNav === 'Join Subreddit' ? 'text-gray-950 font-bold' : 'text-gray-600'
              }`}
            >
              Join Subreddit
            </button>
          </div>
        </div>

        {/* Right: Offer Zone */}
        <div>
          <button
            type="button"
            onClick={onOpenOffers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-amber-50 text-gray-800 font-semibold transition-colors cursor-pointer"
          >
            <span className="text-lg">👋</span>
            <span>Offer Zone</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

