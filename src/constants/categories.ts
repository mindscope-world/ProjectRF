export const SHOP_CATEGORIES = [
  'ADHD',
  'Anxiety meds',
  'Best Sellers',
  'Erectile dysfunction',
  'Insomnia',
  'Pain Meds',
  'Weight Loss',
  'USA To USA',
  'UK to UK',
  'EU to EU',
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number];
