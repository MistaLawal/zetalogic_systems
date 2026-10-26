# Zetalogic Systems website

React + TypeScript + Tailwind CSS (Vite) on Supabase (Postgres, Auth, Storage, Edge Functions).

| Phase | Scope | Status |
|---|---|---|
| 1 | Brand system, navigation, homepage, About, IT Services, Software, Contact | Done |
| 2 | Database schema, authentication, catalogue, categories, search, product pages | Done |
| 3 | Cart, checkout, Paystack payments, orders, physical inventory | Next |
| 4 | Digital products, private downloads, software licences, delivery emails | |
| 5 | Admin dashboard, reporting, content management, customer support | |
| 6 | Security testing, SEO, performance, deployment docs | |

## Run it

```bash
npm install
cp .env.example .env   # then fill in the publishable key
npm run dev            # http://localhost:5173
npm run build          # production build into dist/
```

Deploying on Vercel: import the GitHub repo, add the two `VITE_SUPABASE_*` variables, deploy. `vercel.json` already handles page routing and security headers.

## Environment variables

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | `https://ysfefuyefmjjxphpcoxi.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | `sb_publishable_...` from Supabase > Settings > API Keys. Safe in the browser because RLS protects every table |
| `VITE_ROUTER` | Frontend | `browser` (default) or `hash` for single-file previews |
| `IP_HASH_SALT` | Edge Function secret (optional) | Random string used to hash visitor IPs for rate limiting |
| `PAYSTACK_SECRET_KEY` | Edge Function secret (Phase 3) | Never in a `VITE_` variable |

Secret / service-role keys are only ever used inside Edge Functions, which read them from Supabase's built-in `SUPABASE_SECRET_KEYS`.

## One-time setup in the Supabase dashboard

1. **Auth > URL Configuration:** set *Site URL* to your live domain and add `http://localhost:5173/**` and your Vercel preview URL to *Redirect URLs*. Sign-up confirmation and password-reset links only work for listed URLs.
2. **Auth > Emails > SMTP:** Supabase's built-in email sender is limited to a few emails per hour. Connect a provider (Resend, Brevo, Zoho) before launch.
3. **Make yourself an admin:** sign up on the site, then run `supabase/snippets/make-super-admin.sql`.
4. **Add products:** until the admin dashboard (Phase 5), use `supabase/snippets/add-a-product.sql` or the Table Editor. Upload photos to the `product-images` storage bucket.

## Database

Migrations live in `supabase/migrations/` and are applied to project `ysfefuyefmjjxphpcoxi`.

- **Identity:** `profiles` (created by trigger on sign-up), `user_roles` (staff roles: super_admin, store_manager, order_manager, content_manager, customer_support), `addresses`.
- **Catalogue:** `categories`, `brands`, `products`, `product_variants`, `product_images`, `inventory_movements` (stock ledger; a trigger applies each movement), `product_reviews`, `wishlists`.
- **Content and forms:** `store_settings` (announcement, hours, socials), `testimonials`, `blog_posts`, `service_enquiries`, `newsletter_subscriptions`.
- **Audit:** `audit_logs`, written by triggers on products, variants, roles and settings.
- **Read API:** `catalog_products` view (security_invoker) and `catalog_search` / `catalog_facets` functions for search, filtering, sorting and pagination.

Rules enforced in the database, not just the UI:
- Money is `bigint` kobo. Sale price must be below the regular price.
- Used and refurbished products cannot be saved without a condition disclosure.
- Stock can't go below zero.
- Customers see only published products, approved reviews and their own profile, addresses and wishlist.
- Only catalogue staff can change products; only super admins can grant roles.
- Enquiries and newsletter sign-ups are written only by Edge Functions (server validation, honeypot, rate limit by hashed IP).

Regenerate TypeScript types after schema changes: `npm run gen:types` (needs the Supabase CLI and login).

## Where things live

| Path | What |
|---|---|
| `src/config/site.ts` | Company details, nav, services copy, fallback settings |
| `src/lib/supabase.ts` | Browser client (publishable key) and friendly error messages |
| `src/data/catalog.ts` | Catalogue queries: search, facets, product detail, related, collections |
| `src/context/AuthContext.tsx` | Session, profile and roles |
| `src/context/ShopperContext.tsx` | Wishlist (database), compare and recently viewed (browser) |
| `src/pages/store/` | Store listing, product page, compare |
| `src/pages/auth/`, `src/pages/account/` | Sign in, sign up, password reset, account area |
| `supabase/functions/` | `submit-enquiry`, `newsletter-subscribe` Edge Functions |
| `supabase/snippets/` | SQL templates for adding products and the first admin |

## Placeholders to replace before launch

- Street address (`xyz street`) in `site.ts`
- Business hours and social links (`store_settings` table)
- `YOUR-DOMAIN` in `public/robots.txt`
- Product, category and about-page photography
- A transparent white logo would let dark sections use `#101010` instead of pure black

## Design decisions

- Buttons use black text on green: white text on `#4CB748` fails WCAG contrast. Green text uses `#2F7F2C`.
- The angled wedge shape echoes the triangle in the logo mark; the logo itself is used unaltered.
- Empty sections show designed empty states with a WhatsApp route. No product, review or statistic is invented.
