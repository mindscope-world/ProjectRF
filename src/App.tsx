import React, { useState, useRef, useMemo, useEffect } from 'react';
import { addCartItem, ApiError, fetchCart, fetchProducts, removeCartItem, updateCartItem } from './api/client';
import { Product, ProductOption, CartItem } from './types';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { FeatureBar } from './components/FeatureBar';
import { ProductCard } from './components/ProductCard';
import { TrustBadges } from './components/TrustBadges';
import { CustomerTestimonials } from './components/CustomerTestimonials';
import { Footer } from './components/Footer';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CategoryDrawer } from './components/CategoryDrawer';
import { OfferZoneModal } from './components/OfferZoneModal';
import { EuHero } from './components/EuHero';
import { EuPromoBanners } from './components/EuPromoBanners';
import { EuReviewsSection } from './components/EuReviewsSection';
import { EuMascotsAndVideos } from './components/EuMascotsAndVideos';
import { EuFooter } from './components/EuFooter';
import { ContactUs } from './components/ContactUs';
import { CartPage } from './components/CartPage';
import { CheckoutPage } from './components/CheckoutPage';
import { OrderResult } from './api/client';

export default function App() {
  // Navigation & Filtering States
  const [activeNav, setActiveNav] = useState<string>('Home');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drawers & Modals
  const [isCategoriesOpen, setIsCategoriesOpen] = useState<boolean>(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isOffersOpen, setIsOffersOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Catalog State — fetched from the backend (see workplan.md Phase 3)
  // instead of the old static src/data/products.ts / euProducts.ts.
  const [usaProducts, setUsaProducts] = useState<Product[]>([]);
  const [euCatalogProducts, setEuCatalogProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts('usa').then(setUsaProducts).catch((err) => console.error('Failed to load USA catalog', err));
    fetchProducts('eu').then(setEuCatalogProducts).catch((err) => console.error('Failed to load EU catalog', err));
    fetchCart().then(setCartItems).catch((err) => console.error('Failed to load cart', err));
  }, []);

  const BEST_SELLERS = useMemo(() => usaProducts.filter((p) => p.category === 'bestseller'), [usaProducts]);
  const OTHER_PRODUCTS = useMemo(() => usaProducts.filter((p) => p.category === 'other'), [usaProducts]);
  const EU_PRODUCTS = euCatalogProducts;

  // Ref for smooth scrolling to "Why Choose Us"
  const trustSectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToTrustSection = () => {
    if (trustSectionRef.current) {
      trustSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isEuPage = activeNav === 'EU to EU' || selectedCategory === 'EU to EU';
  const isContactUsPage = activeNav === 'Contact Us';

  // Cart & Checkout pages (see backend/app/api/v1/checkout.py, orders.py)
  const [isCartPageOpen, setIsCartPageOpen] = useState(false);
  const [isCheckoutPageOpen, setIsCheckoutPageOpen] = useState(false);

  const goToCart = () => {
    setIsCartOpen(false);
    setIsCheckoutPageOpen(false);
    setIsCartPageOpen(true);
  };

  const goToCheckout = () => {
    setIsCartOpen(false);
    setIsCartPageOpen(false);
    setIsCheckoutPageOpen(true);
  };

  const exitCartAndCheckout = () => {
    setIsCartPageOpen(false);
    setIsCheckoutPageOpen(false);
  };

  const handleOrderPlaced = (_order: OrderResult) => {
    // The order is already cleared server-side by checkout — mirror that locally.
    setCartItems([]);
  };

  // Navigating anywhere via the main nav (Home, a category, EU to EU, ...)
  // should exit the cart/checkout pages rather than leave the user stuck on
  // them — goToCart/goToCheckout don't touch activeNav/selectedCategory, so
  // this only fires on genuine navigation, not on entering cart/checkout.
  useEffect(() => {
    exitCartAndCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNav, selectedCategory]);

  const handleFooterNavSelect = (nav: string) => {
    if (nav === 'Home') {
      setSelectedCategory('All Categories');
      setSearchQuery('');
      setIsCategoriesOpen(true);
      setActiveNav('Home');
    } else if (nav === 'USA Domestic') {
      setSelectedCategory('USA To USA');
      setActiveNav('USA Domestic');
    } else if (nav === 'UK domestic') {
      setSelectedCategory('UK to UK');
      setActiveNav('UK domestic');
    } else if (nav === 'EU to EU') {
      setSelectedCategory('EU to EU');
      setActiveNav('EU to EU');
    } else if (nav === 'Contact Us') {
      setSelectedCategory('All Categories');
      setSearchQuery('');
      setIsCategoriesOpen(true);
      setActiveNav('Contact Us');
    }
  };

  const [isSubredditModalOpen, setIsSubredditModalOpen] = useState(false);

  // Filter products based on search and category
  const filterList = (list: Product[]) => {
    return list.filter((p) => {
      // Search matching
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Category matching
      if (!selectedCategory || selectedCategory === 'All Categories' || selectedCategory === 'EU to EU') {
        return true;
      }

      switch (selectedCategory) {
        case 'ADHD':
          return p.categorySlug === 'adhd';

        case 'Anxiety meds':
          return p.categorySlug === 'anxiety-meds';

        case 'Erectile dysfunction':
          return p.categorySlug === 'erectile-dysfunction';

        case 'Insomnia':
          return p.categorySlug === 'insomnia';

        case 'Pain Meds':
          return p.categorySlug === 'pain-meds';

        case 'Weight Loss':
          return p.categorySlug === 'weight-loss';

        case 'Best Sellers':
          return p.category === 'bestseller';

        case 'USA To USA':
        case 'USA Domestic':
          return !!p.hasUsaDomesticBadge;

        case 'UK to UK':
          return !!p.hasUkDomesticBadge;

        default:
          return true;
      }
    });
  };

  const filteredBestSellers = useMemo(() => filterList(BEST_SELLERS), [BEST_SELLERS, searchQuery, selectedCategory]);
  const filteredOtherProducts = useMemo(() => filterList(OTHER_PRODUCTS), [OTHER_PRODUCTS, searchQuery, selectedCategory]);
  const filteredEuProducts = useMemo(() => filterList(EU_PRODUCTS), [EU_PRODUCTS, searchQuery, selectedCategory]);

  // Cart operations — delegate to the server-side cart (backend/app/api/v1/cart.py).
  // Price and stock are always resolved from the backend, never trusted from
  // local product/option data; setCartItems is only ever populated from the
  // API's response so the UI can't drift from what the server has recorded.
  const handleAddToCart = (product: Product, option: ProductOption, quantity: number) => {
    if (!option.variantId) {
      console.error('Cannot add to cart: product option has no variantId', product, option);
      return;
    }
    addCartItem(option.variantId, quantity)
      .then(setCartItems)
      .catch((err: ApiError) => {
        window.alert(err.code === 'STOCK_INSUFFICIENT' ? err.message : 'Could not add item to cart. Please try again.');
      });
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    updateCartItem(id, qty)
      .then(setCartItems)
      .catch((err: ApiError) => {
        window.alert(err.code === 'STOCK_INSUFFICIENT' ? err.message : 'Could not update quantity. Please try again.');
      });
  };

  const handleRemoveItem = (id: string) => {
    removeCartItem(id).then(setCartItems).catch((err) => console.error('Failed to remove cart item', err));
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] text-gray-900 font-sans selection:bg-[#fed000] selection:text-black">
      {/* 1. Header with Red Announcement & Yellow Search/Brand Bar */}
      <Header
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          if (cat === 'EU to EU') {
            setActiveNav('EU to EU');
          }
        }}
        isEuPage={isEuPage}
        onLogoClick={() => {
          setActiveNav('Home');
          setSelectedCategory('All Categories');
          setSearchQuery('');
        }}
      />

      {/* 2. Subheader Navigation Bar */}
      <Navbar
        isCategoriesOpen={isCategoriesOpen}
        onToggleCategories={() => setIsCategoriesOpen((prev) => !prev)}
        onCloseCategories={() => setIsCategoriesOpen(false)}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          if (cat === 'EU to EU') {
            setActiveNav('EU to EU');
          }
          if (window.innerWidth < 768) {
            setIsCategoriesOpen(false);
          }
        }}
        selectedCategory={selectedCategory}
        onSelectNav={(nav) => {
          if (nav === 'Join Subreddit') {
            setIsSubredditModalOpen(true);
            return;
          }
          setActiveNav(nav);
          if (nav === 'Home') {
            setSelectedCategory('All Categories');
            setSearchQuery('');
            setIsCategoriesOpen(true);
          } else if (nav === 'USA Domestic') {
            setSelectedCategory('USA To USA');
          } else if (nav === 'UK domestic') {
            setSelectedCategory('UK to UK');
          } else if (nav === 'EU to EU') {
            setSelectedCategory('EU to EU');
          } else if (nav === 'Contact Us') {
            // Reset category and search when navigating to Contact Us page
            setSelectedCategory('All Categories');
            setSearchQuery('');
            setIsCategoriesOpen(true);
          }
        }}
        activeNav={activeNav}
        onOpenOffers={() => setIsOffersOpen(true)}
      />

      {isCheckoutPageOpen ? (
        /* ==================== CHECKOUT PAGE ==================== */
        <div className="w-full flex-1 flex flex-col">
          <CheckoutPage items={cartItems} onOrderPlaced={handleOrderPlaced} onBackToCart={exitCartAndCheckout} />
          <Footer onCategoryClick={setSelectedCategory} onNavSelect={handleFooterNavSelect} />
        </div>
      ) : isCartPageOpen ? (
        /* ==================== CART PAGE ==================== */
        <div className="w-full flex-1 flex flex-col">
          <CartPage
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onProceedToCheckout={goToCheckout}
            onContinueShopping={exitCartAndCheckout}
          />
          <Footer onCategoryClick={setSelectedCategory} onNavSelect={handleFooterNavSelect} />
        </div>
      ) : isContactUsPage ? (
        /* ==================== CONTACT US PAGE ==================== */
        <ContactUs />
      ) : isEuPage ? (
        /* ==================== EU TO EU DEDICATED PAGE ==================== */
        <div className="w-full flex-1 flex flex-col">
          {/* EU Hero Section (Night earth view, Fastest metallic, EU to EU yellow bubble) */}
          <EuHero onWhyChooseUsClick={() => {
            const el = document.getElementById('eu-reviews-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }} />

          {/* Feature Highlights Bar */}
          <FeatureBar />

          {/* Cosmic Promo Banners (Superfast Intra-EU Delivery Astronaut + Bitcoin + SEPA) */}
          <EuPromoBanners />

          {/* EU Products Grid */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
            {/* Active Filter Info Banner (if filtered) */}
            {(selectedCategory !== 'EU to EU' && selectedCategory !== 'All Categories' || searchQuery.trim() !== '') && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded flex items-center justify-between text-xs">
                <div>
                  <span>Filtered EU Products: </span>
                  {selectedCategory !== 'EU to EU' && selectedCategory !== 'All Categories' && (
                    <span className="font-bold text-gray-900 mr-2">
                      Category: &ldquo;{selectedCategory}&rdquo;
                    </span>
                  )}
                  {searchQuery && (
                    <span className="font-bold text-gray-900">
                      Search: &ldquo;{searchQuery}&rdquo;
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('EU to EU');
                    setSearchQuery('');
                  }}
                  className="text-red-600 font-bold hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* Products Grid */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-200">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                  EU to EU Products
                </h2>
                <span className="text-xs font-semibold text-gray-500">
                  {filteredEuProducts.length} items available
                </span>
              </div>

              {filteredEuProducts.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded border border-gray-200 text-gray-500 text-xs">
                  No EU products match your search or filter criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredEuProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelectOptions={setSelectedProduct}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Our Reviews Section in Mint Green Container */}
            <EuReviewsSection />

            {/* Mascots (Crash & Donkey Kong) + Video Customer Reviews */}
            <EuMascotsAndVideos />
          </main>

          {/* EU Specialized 4-Column Footer */}
          <EuFooter
            onNavSelect={(nav) => {
              if (nav === 'Home') {
                setSelectedCategory('All Categories');
                setSearchQuery('');
                setIsCategoriesOpen(true);
                setActiveNav('Home');
              } else if (nav === 'USA Domestic') {
                setSelectedCategory('USA To USA');
                setActiveNav('USA Domestic');
              } else if (nav === 'UK domestic') {
                setSelectedCategory('UK to UK');
                setActiveNav('UK domestic');
              } else if (nav === 'EU to EU') {
                setSelectedCategory('EU to EU');
                setActiveNav('EU to EU');
              } else if (nav === 'Contact Us') {
                setSelectedCategory('All Categories');
                setSearchQuery('');
                setIsCategoriesOpen(true);
                setActiveNav('Contact Us');
              }
            }}
          />
        </div>
      ) : (
        /* ==================== USA DOMESTIC DEFAULT PAGE ==================== */
        <div className="w-full flex-1 flex flex-col">
          {/* 3. Hero Section (Earth background, USA Domestic flag text, 3 Day Delivery) */}
          <Hero onWhyChooseUsClick={scrollToTrustSection} />

          {/* 4. Feature Highlights Bar (4 columns) */}
          <FeatureBar />

          {/* Main Store Content Area */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
            {/* Active Filter Info Banner (if filtered) */}
            {(selectedCategory !== 'All Categories' || searchQuery.trim() !== '') && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded flex items-center justify-between text-xs">
                <div>
                  <span>Filtered by: </span>
                  {selectedCategory !== 'All Categories' && (
                    <span className="font-bold text-gray-900 mr-2">
                      Category: &ldquo;{selectedCategory}&rdquo;
                    </span>
                  )}
                  {searchQuery && (
                    <span className="font-bold text-gray-900">
                      Search: &ldquo;{searchQuery}&rdquo;
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All Categories');
                    setSearchQuery('');
                  }}
                  className="text-red-600 font-bold hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* 5. Best Sellers Section */}
            <section className="mb-14" id="best-sellers-section">
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-200">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                  Best Sellers
                </h2>
                <span className="text-xs font-semibold text-gray-500">
                  {filteredBestSellers.length} items
                </span>
              </div>

              {filteredBestSellers.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded border border-gray-200 text-gray-500 text-xs">
                  No best sellers match your search or filter criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredBestSellers.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelectOptions={setSelectedProduct}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* 6. Trust Badges & Payment Methods Row ("Why Choose Us") */}
            <div ref={trustSectionRef} id="why-choose-us-section" className="scroll-mt-16">
              <TrustBadges />
            </div>

            {/* 7. Other Products Section */}
            <section className="my-14" id="other-products-section">
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-200">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                  Other Products
                </h2>
                <span className="text-xs font-semibold text-gray-500">
                  {filteredOtherProducts.length} items
                </span>
              </div>

              {filteredOtherProducts.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded border border-gray-200 text-gray-500 text-xs">
                  No other products match your search or filter criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredOtherProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelectOptions={setSelectedProduct}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* 8. Customer Testimonials Section */}
            <CustomerTestimonials />
          </main>

          {/* 9. Standard Footer */}
          <Footer onCategoryClick={setSelectedCategory} onNavSelect={handleFooterNavSelect} />
        </div>
      )}

      {/* Modals & Drawers */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onViewCart={goToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onViewCart={goToCart}
        onProceedToCheckout={goToCheckout}
      />

      <CategoryDrawer
        isOpen={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
        onSelectCategory={setSelectedCategory}
        selectedCategory={selectedCategory}
      />

      <OfferZoneModal
        isOpen={isOffersOpen}
        onClose={() => setIsOffersOpen(false)}
      />

      {/* Subreddit Community Modal */}
      {isSubredditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#ff4500] text-white flex items-center justify-center font-black text-2xl shadow-md">
                r/
              </div>
              <div>
                <h3 className="font-black text-lg text-gray-900">r/Rapidfinil</h3>
                <p className="text-xs text-gray-500">Official Reddit Community • 14.8k Members</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Join our subreddit for unfiltered customer delivery reviews, restock alerts, bulk-order tips for boutiques and resellers, and shipping timeline updates for USA and EU warehouses.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 mb-5">
              <span className="font-bold">Community Rules:</span> Keep it friendly and on-topic. Verified moderators respond within 4 hours.
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setIsSubredditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Close
              </button>
              <a
                href="https://reddit.com"
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsSubredditModalOpen(false)}
                className="px-5 py-2 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded-lg text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>Visit Subreddit</span>
                <span>&rarr;</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
