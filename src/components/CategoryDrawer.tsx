import React from 'react';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import { SHOP_CATEGORIES } from '../constants/categories';

interface CategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (cat: string) => void;
  selectedCategory: string;
}

export const CategoryDrawer: React.FC<CategoryDrawerProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
  selectedCategory,
}) => {
  if (!isOpen) return null;

  const categories = [
    { name: 'All Categories', badge: 'Popular' },
    ...SHOP_CATEGORIES.map((cat) => ({
      name: cat,
      badge: cat === 'USA To USA' ? '3-Day' : cat === 'Best Sellers' ? 'Top' : undefined,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xs h-full shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="p-4 bg-[#fed000] flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-gray-900 text-sm uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-red-600" />
            <span>Shop Categories</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-800 hover:text-black rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories list */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-gray-100">
          {categories.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => {
                onSelectCategory(cat.name);
                onClose();
              }}
              className={`w-full py-3 px-3 flex items-center justify-between rounded text-xs font-semibold transition-colors cursor-pointer text-left ${
                selectedCategory === cat.name
                  ? 'bg-amber-100/70 text-gray-950 font-bold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{cat.name}</span>
                {cat.badge && (
                  <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">
                    {cat.badge}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-xs font-bold text-gray-800">Need Custom Orders?</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Email us for custom quantities or embroidery</p>
          <a
            href="mailto:support@brimline.example"
            className="inline-block mt-2 text-xs font-bold text-[#0066cc] hover:underline"
          >
            support@brimline.example
          </a>
        </div>
      </div>
    </div>
  );
};
