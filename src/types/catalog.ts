import type { Kobo } from '../lib/money';

export type ProductType = 'physical' | 'downloadable' | 'software';
export type Condition = 'new' | 'used' | 'refurbished';

/** Listing shape returned by `catalog_search` / `catalog_products`. Prices in kobo. */
export type ProductSummary = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  type: ProductType;
  condition: Condition | null;
  shortDescription: string | null;
  categorySlug: string;
  categoryName: string;
  brandSlug: string | null;
  brandName: string | null;
  priceKobo: Kobo;
  effectivePriceKobo: Kobo;
  onSale: boolean;
  variantCount: number;
  stock: number | null; // null = not stock-tracked (digital)
  lowStockThreshold: number;
  imageUrl: string | null;
  imageAlt: string | null;
  rating: { average: number; count: number } | null; // verified, approved reviews only
};

export type Variant = {
  id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  priceKobo: Kobo | null;
  salePriceKobo: Kobo | null;
  stock: number;
};

export type ProductImage = { id: string; url: string; alt: string };
export type Review = { id: string; rating: number; title: string | null; body: string | null; reviewerName: string; createdAt: string };

export type ProductDetail = ProductSummary & {
  description: string | null;
  specs: Record<string, string>;
  conditionNotes: string | null;
  warrantyMonths: number | null;
  warrantyNotes: string | null;
  systemRequirements: string | null;
  licenceType: string | null;
  licenceDurationMonths: number | null;
  deliveryNotes: string | null;
  saleEndsAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string;
  variants: Variant[];
  images: ProductImage[];
  reviews: Review[];
};

export type Category = { id: string; slug: string; name: string; description: string | null; icon: string | null };

export type Facets = {
  brands: { slug: string; name: string; count: number }[];
  types: ProductType[];
  conditions: Condition[];
  minKobo: number | null;
  maxKobo: number | null;
  total: number;
};

export type Testimonial = { id: string; quote: string; name: string; context?: string | null };
export type PostSummary = { id: string; slug: string; title: string; excerpt: string | null; topic: string; publishedAt: string };
