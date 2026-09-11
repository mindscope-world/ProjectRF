export const SHOP_CATEGORIES = [
  'Bucket Hats',
  'Baseball Caps',
  'Beanies',
  'Sun Hats',
  'Berets',
  'Best Sellers',
  'USA To USA',
  'UK to UK',
  'EU to EU',
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number];
