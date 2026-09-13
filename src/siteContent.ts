import { API_BASE_URL } from './api/client';

// Mirrors backend/app/schemas/content.py exactly (camelCase, same field
// names) — see that module's docstring for why every field has a default
// matching the storefront's original hardcoded copy.

export interface LogoContent {
  imageUrl: string | null;
  brandName: string;
}

export interface HeroContent {
  headline: string;
  badgeText: string;
  ctaLabel: string;
  backgroundImageUrl: string | null;
}

export interface AnnouncementContent {
  usaText: string;
  euText: string;
}

export interface FooterContent {
  copyrightText: string;
  supportEmail: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
}

export interface OfferZoneOffer {
  title: string;
  description: string;
  couponCode?: string | null;
}

export interface OfferZoneContent {
  title: string;
  offers: OfferZoneOffer[];
}

export interface SiteContent {
  logo: LogoContent;
  hero: HeroContent;
  announcement: AnnouncementContent;
  footer: FooterContent;
  offerZone: OfferZoneContent;
}

// Used synchronously on first render (before the fetch below resolves) and
// as a fallback if the fetch fails — must stay in sync with the backend
// Pydantic defaults so there's no flash of different content once the real
// fetch lands.
export const DEFAULT_SITE_CONTENT: SiteContent = {
  logo: { imageUrl: null, brandName: 'Rapidfinil' },
  hero: {
    headline: '3 Day Delivery',
    badgeText: 'Buy Modafinil USA 3 Day Delivery',
    ctaLabel: 'Why Choose Us?',
    backgroundImageUrl: null,
  },
  announcement: {
    usaText: '📢 Daily Rapid Shipping — Save Flat 25% on your first order!🎯',
    euText: '📣 Bitcoin 5% instant discount at checkout — Daily Rapid Shipping on every order📣',
  },
  footer: {
    copyrightText: '© 2025 RapidFinil',
    supportEmail: 'support@rapidfinil.st',
    facebookUrl: 'https://www.facebook.com/rapidfinil/',
    twitterUrl: 'https://twitter.com/RapidFinil_SE',
    instagramUrl: 'https://www.instagram.com/rapidfinil_se/',
    linkedinUrl: 'https://www.linkedin.com/in/rapidfinil/',
    youtubeUrl: 'https://vimeo.com/user222616820',
  },
  offerZone: {
    title: 'Exclusive Offer Zone',
    offers: [
      {
        title: 'Bitcoin 5% Instant Discount',
        description: 'Select Bitcoin at checkout to automatically save 5% off your entire cart total.',
      },
      {
        title: 'Free USA Domestic Priority Shipping',
        description: 'USPS domestic tracking included on all orders, with delivery in 3 business days.',
      },
      {
        title: 'Bulk Order Bonus',
        description: 'Use this coupon code for orders over $300 to receive a free bonus item in your pack.',
        couponCode: 'BULK10',
      },
    ],
  },
};

export async function fetchSiteContent(): Promise<SiteContent> {
  const response = await fetch(`${API_BASE_URL}/site-content`);
  if (!response.ok) throw new Error(`Failed to load site content (${response.status})`);
  return response.json();
}
