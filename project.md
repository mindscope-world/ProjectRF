# RapidFinil Storefront

A React + Vite e‑commerce storefront for RapidFinil, a nootropic and medication retailer serving both USA Domestic and EU‑to‑EU markets. The site presents product listings, filtering, cart management, and modular UI sections (hero, feature bars, testimonials, etc.) with Tailwind‑CSS styling.

---

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Components Overview](#components-overview)
- [Data Models](#data-models)
- [Styling & Them­ing](#styling--theming)
- [Running the Project](#running-the-project)
- [Build & Preview](#build--preview)
- [Environment Variables](#environment-variables)
- [Future Enhancements](#future-enhancements)

---

## Overview

The RapidFinil storefront is a single‑page React application built with Vite. It displays two main storefronts:

- **USA Domestic** – products shipping within the United States.
- **EU to EU** – products shipping within the European Union.

Users can navigate between sections via the top navigation bar, filter products by category or search term, view product details in a modal, add items to a cart, and proceed to checkout (checkout logic is not implemented in this seed project).

The UI is composed of reusable sections (Hero, FeatureBar, TrustBadges, CustomerTestimonials, Footers, etc.) and a product grid rendered via `<ProductCard />`. State is managed with React hooks (`useState`, `useMemo`, `useRef`) inside `App.tsx`.

---

## Tech Stack

| Category | Technology | Version (from package.json) |
|----------|------------|-----------------------------|
| Framework | React | ^19.0.1 |
| Renderer | React DOM | ^19.0.1 |
| Build Tool | Vite | ^6.2.3 |
| CSS Framework | Tailwind CSS (via Vite plugin) | ^4.1.14 |
| Icons | Lucide React | ^0.546.0 |
| Animations | Motion | ^12.23.24 |
| Type Checking | TypeScript | ~5.8.2 |
| Linting | `tsc --noEmit` (via npm script) | — |
| Server (optional) | Express (for potential backend) | ^4.21.2 |
| Environment | Dotenv | ^17.2.3 |
| AI Integration (placeholder) | Google GenAI | ^2.4.0 |

**Dev Dependencies**
- `@types/node`, `@types/express`, `autoprefixer`, `esbuild`, `tsx`, `typescript`, `vite`, `@vitejs/plugin-react`

---

## Project Structure

```
rapidfinil/
├── .claude/                 # Claude Code settings (skills, agent config)
├── .git/
├── public/                  # Static assets (favicon, images)
├── src/
│   ├── App.tsx              # Root component – layout, routing logic, state
│   ├── main.tsx             # React entry point
│   ├── types.ts             # TypeScript interfaces (Product, CartItem, etc.)
│   ├── vite-env.d.ts        # Vite TypeScript declarations
│   ├── constants/
│   │   └── categories.ts    # Category names for filters
│   ├── data/
│   │   ├── products.ts      # USA Domestic best‑seller & other products
│   │   ├── euProducts.ts    # EU‑to‑EU product list
│   │   └── euReviews.ts     # Review data for EU section
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx   # Top bar with announcement, search, cart
│   │   │   ├── Navbar.tsx   # Sub‑navigation (Home, USA Domestic, UK, EU, Contact)
│   │   │   ├── Footer.tsx   # Standard footer for USA section
│   │   │   ├── EuFooter.tsx # 4‑column footer for EU section
│   │   │   └── ...          # Additional layout pieces
│   │   ├── ui/
│   │   │   ├── ProductCard.tsx   # Product grid item
│   │   │   ├── ProductModal.tsx  # Detail modal
│   │   │   ├── CartDrawer.tsx    # Side cart
│   │   │   ├── CategoryDrawer.tsx# Filter drawer
│   │   │   ├── Hero.tsx          # USA hero section
│   │   │   ├── EuHero.tsx        # EU hero section
│   │   │   ├── FeatureBar.tsx    # Highlight bar (4 icons)
│   │   │   ├── TrustBadges.tsx   # Payment & trust icons
│   │   │   ├── CustomerTestimonials.tsx
│   │   │   ├── ContactUs.tsx     # Stand‑alone contact page
│   │   │   ├── OfferZoneModal.tsx# Promo modal
│   │   │   └── ...               # Misc UI components
│   │   └── ...                   # Additional components (mascots, videos, etc.)
└── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
└── .env.example
```

---

## Key Features

- **Dual Storefront** – Switch between USA Domestic and EU‑to‑EU views via navigation or footer links.
- **Dynamic Filtering** – Filter products by category (e.g., ADHD, Anxiety meds, Best Sellers, Erectile dysfunction, etc.) and free‑text search.
- **Product Cards** – Show image, name, rating, badges (price‑drop, back‑in‑stock, sealed‑bottle, no‑fent, EU delivery, etc.), price range, and options.
- **Modal Product Detail** – Clicking a product opens a modal with all available options (quantity, price, savings) and an “Add to Cart” button.
- **Shopping Cart** – Side‑drawer cart displays line items, total quantity, and permits quantity updates, removal, and clear cart.
- **Persistent UI State** – Navigation, selected category, search query, drawer/cart openness are stored in React state.
- **Responsive Design** – Tailwind utility classes ensure mobile‑friendly layout; drawers collapse on narrow screens.
- **Animated Elements** – Uses `motion` for subtle entrance animations (fade‑in, etc.).
- **Contact Page** – Stand‑alone `/Contact Us` form placeholder.
- **EU‑Specific Sections** – Dedicated hero, promo banners, reviews, mascots/videos, and a 4‑column footer.

---

## Components Overview

### Layout

- **Header** – Top bar showing announcement badge, site logo, search input, cart icon, and navigation toggle.
- **Navbar** – Horizontal links: Home, USA Domestic, UK domestic, EU to EU, Join Subreddit, Contact Us. Controls active nav and category selection.
- **Footer / EuFooter** – Bottom navigation; standard footer for USA view, four‑column footer for EU view.

### UI Components

- **ProductCard** – Displays a single product’s thumbnail, name, rating, badges, price range, and a “Quick View” button that opens the ProductModal.
- **ProductModal** – Detailed view of a product with all options (size/quantity, price, savings). Calls `handleAddToCart` from App.
- **CartDrawer** – Side panel listing cart items, totals, and actions (update quantity, remove, clear).
- **CategoryDrawer** – Side panel shown on mobile for picking a category; also used to set selectedCategory.
- **Hero / EuHero** – Full‑width banner with background image, headline, sub‑text, and a call‑to‑action button (scroll to “Why Choose Us” section).
- **FeatureBar** – Row of four icon‑text features (e.g., Fastest Delivery, Lab‑Tested Purity, Discreet Packaging, 24/7 Support).
- **TrustBadges** – Row of payment processor logos, security seals, and shipping guarantees.
- **CustomerTestimonials** – Rotating testimonial cards.
- **ContactUs** – Simple form placeholder (name, email, message).
- **OfferZoneModal** – Promotional modal for special offers.
- **EuPromoBanners**, **EuReviewsSection**, **EuMascotsAndVideos** – EU‑specific sections showcasing delivery promises, review grids, and brand mascots/video testimonials.

### Data & Utilities

- **Data Files** – `products.ts` (USA), `euProducts.ts`, `euReviews.ts` contain static product arrays.
- **Constants** – `categories.ts` defines strings for filter categories.
- **Types** – `Product`, `ProductOption`, `CartItem`, etc.

---

## Data Models

### Product (src/types.ts)

```ts
export interface ProductOption {
  quantity: number;
  label: string;
  price: number;
  savings?: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'bestseller' | 'other';
  priceRange: string;
  rating: number; // 0‑5
  ratingCount?: number;
  badges?: {
    text: string;
    variant: 'price-drop' | 'back-in-stock' | 'out-of-stock' | 'sealed-bottle' | 'no-fent' | 'eu-delivery';
  }[];
  hasUsaDomesticBadge?: boolean;
  imageKey: string;
  options: ProductOption[];
  description?: string;
  currency?: string;
}
```

### CartItem

```ts
export interface CartItem {
  id: string; // "${productId}-${option.quantity}"
  productId: string;
  name: string;
  imageKey: string;
  quantity: number;
  packLabel: string;
  unitPrice: number;
  currency?: string;
}
```

Data is imported as static arrays (`BEST_SELLERS`, `OTHER_PRODUCTS`, `EU_PRODUCTS`). Filtering occurs in `App.tsx` via `filterList` function that respects `selectedCategory` and `searchQuery`.

---

## Styling & Theming

- **Tailwind CSS** – Configured via `@tailwindcss/vite` plugin. Utility classes are used throughout JSX.
- **Custom Colors** – The app uses a dark‑gray foreground (`text-gray-900`) on a light background (`bg-[#fcfcfc]`). Accent colors: amber (`bg-amber-50`), red (`text-red-600`), and a selection highlight (`selection:bg-[#fed000] selection:text-black`).
- **Dark Mode** – Not implemented; the design is light‑only but can be extended via Tailwind dark mode (`dark:` variants).
- **Responsive Breakpoints** – Tailwind’s default sm, md, lg, xl prefixes control grid columns and visibility (e.g., `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`).

---

## Running the Project

1. **Clone / ensure you are in the repository root.**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Start the development server**
   ```bash
   npm run dev
   ```
   - The app runs on `http://localhost:3000` (or another port if 3000 is occupied).
   - Vite provides hot‑module replacement (HMR) unless `DISABLE_HMR=true` is set.
4. **Optional: Load environment variables**
   - Copy `.env.example` to `.env` and fill any required keys (e.g., for Google GenAI integration).

---

## Build & Preview

- **Production Build**
  ```bash
  npm run build
  ```
  Output goes to `dist/`.
- **Preview Build**
  ```bash
  npm run preview
  ```
  Serves the built asset from `dist/` at `http://localhost:4173`.

---

## Environment Variables

Create a `.env` file (based on `.env.example`) if you intend to use optional features:

```
# Example
VITE_GENAI_API_KEY=your_google_genai_key
# Other variables as needed
```

Note: Vite exposes only variables prefixed with `VITE_` to the client code.

---

## Future Enhancements

- **Checkout Integration** – Connect cart to a payment gateway (Stripe, PayPal, etc.).
- **Dynamic Data** – Replace static product files with a backend API or CMS.
- **Authentication** – Add user login / profile, order history.
- **Internationalization (i18n)** – Support multiple languages (EN, ES, FR, DE).
- **Accessibility (a11y)** – Improve ARIA labels, keyboard navigation, focus traps.
- **Testing** – Add unit tests (Vitest/Jest) and end‑to‑end tests (Cypress/Playwright).
- **Performance** – Lazy‑load images, implement code‑splitting, add service worker for PWA capabilities.
- **Dark Mode** – Implement Tailwind dark mode toggle.
- **Analytics** – Integrate Google Analytics or Plausible for page views and conversion tracking.
- **CI/CD** – Set up GitHub Actions for lint, test, build, and deploy to Vercel/Netlify.

---

*Documentation generated on 2026‑09‑09.*