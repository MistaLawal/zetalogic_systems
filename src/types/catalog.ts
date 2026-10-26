import type { Kobo } from '../lib/money';

// Mirrors the Phase 2 `products` table. Prices are integer kobo.
export type ProductType = 'physical' | 'downloadable' | 'software';
export type Condition = 'new' | 'used' | 'refurbished';

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  type: ProductType;
  brand?: string;
  categorySlug: string;
  priceKobo: Kobo;
  salePriceKobo?: Kobo | null;
  stock: number | null; // null = not stock-tracked (digital)
  condition?: Condition;
  imageUrl?: string;
  imageAlt?: string;
  rating?: { average: number; count: number } | null; // only from verified reviews
};

export type Testimonial = { id: string; quote: string; name: string; context?: string };
export type PostSummary = { id: string; slug: string; title: string; excerpt: string; topic: string; publishedAt: string };
