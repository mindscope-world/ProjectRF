import React, { useState } from 'react';
import { X, Check, ShoppingCart } from 'lucide-react';
import { Product, ProductOption } from '../types';
import { ProductArtwork, UsaDomesticSeal } from './ProductArtwork';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, option: ProductOption, quantity: number) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  if (!product) return null;

  const [selectedOption, setSelectedOption] = useState<ProductOption>(
    product.options[0]
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [addedNotice, setAddedNotice] = useState(false);

  const handleAdd = () => {
    onAddToCart(product, selectedOption, quantity);
    setAddedNotice(true);
    setTimeout(() => {
      setAddedNotice(false);
      onClose();
    }, 900);
  };

  const isOutOfStock = product.badges?.some((b) => b.variant === 'out-of-stock');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col border border-gray-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Artwork Container */}
            <div className="w-full md:w-1/2 relative bg-slate-50 border border-gray-200 rounded-lg p-2 flex items-center justify-center">
              <ProductArtwork imageKey={product.imageKey} name={product.name} />
              {product.hasUsaDomesticBadge && (
                <div className="absolute bottom-2 right-2">
                  <UsaDomesticSeal className="w-14 h-14" />
                </div>
              )}
            </div>

            {/* Info & Options */}
            <div className="w-full md:w-1/2 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 capitalize leading-tight mb-1">
                  {product.name}
                </h2>
                <div className="text-lg font-black text-[#0066cc] mb-2">
                  {product.currency || '$'}{selectedOption.price * quantity}
                  <span className="text-xs font-normal text-gray-500 ml-2">
                    ({product.currency || '$'}{ (selectedOption.price / selectedOption.quantity).toFixed(2) }/unit)
                  </span>
                </div>

                {product.description && (
                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                    {product.description}
                  </p>
                )}

                {/* Package Size Select */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Select Package:
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {product.options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedOption(opt)}
                        className={`flex items-center justify-between p-2 rounded border text-xs font-medium transition-all cursor-pointer ${
                          selectedOption.label === opt.label
                            ? 'border-[#fed000] bg-amber-50 text-gray-900 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              selectedOption.label === opt.label
                                ? 'border-amber-600 bg-amber-500 text-white'
                                : 'border-gray-400'
                            }`}
                          >
                            {selectedOption.label === opt.label && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                          </div>
                          <span>{opt.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {opt.savings && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              {opt.savings}
                            </span>
                          )}
                          <span className="font-bold text-gray-900">{product.currency || '$'}{opt.price}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-bold text-gray-700">Quantity:</span>
                  <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs font-bold text-gray-900 min-w-8 text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div>
                <button
                  type="button"
                  disabled={isOutOfStock || addedNotice}
                  onClick={handleAdd}
                  className={`w-full py-3 px-4 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                    isOutOfStock
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : addedNotice
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#fed000] hover:bg-[#ffc800] text-gray-950'
                  }`}
                >
                  {isOutOfStock ? (
                    'Out of Stock'
                  ) : addedNotice ? (
                    <>
                      <Check className="w-4 h-4" />
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart • ${(selectedOption.price * quantity).toFixed(2)}
                    </>
                  )}
                </button>

                <div className="mt-2 text-center text-[11px] text-amber-700 font-semibold">
                  ★ Pay with Bitcoin and get an instant 5% off!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
