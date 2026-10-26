# Zetalogic Systems website — Phase 1

React + TypeScript + Tailwind CSS (Vite). Phase 1 covers the brand system, navigation, homepage, About, IT Services (index + 6 detail pages), Software Solutions and Contact.

## Run it

```bash
npm install
npm run dev            # local development at http://localhost:5173
npm run build          # production build into dist/ (deploy to Vercel or Netlify)
npm run build:preview  # one self-contained HTML file in dist-preview/ (hash routing)
```

For Vercel/Netlify with `BrowserRouter`, add a rewrite so every path serves `index.html`
(Vercel: `vercel.json` → `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }`).

## Environment variables

Copy `.env.example` to `.env`.

| Variable | Phase | Notes |
|---|---|---|
| `VITE_ROUTER` | 1 | `browser` (default) or `hash` |
| `VITE_SUPABASE_URL` | 2 | When set, forms post to Supabase Edge Functions |
| `VITE_SUPABASE_ANON_KEY` | 2 | Public anon key only. Never put the service role key in frontend code |
| `PAYSTACK_SECRET_KEY` | 3 | Edge Function secret only, never `VITE_` prefixed |

## Where things live

| Path | What |
|---|---|
| `src/config/site.ts` | Company details, nav, categories, services, values. Edit copy here |
| `tailwind.config.js` | Design tokens. Green `#4CB748` sampled from the logo |
| `src/lib/money.ts` | Naira formatting; all amounts are integer kobo |
| `src/lib/forms.ts` | Form submission service + validators (honeypot included) |
| `src/data/useCollection.ts` | Data layer for products, testimonials, posts. Returns empty until Phase 2 |
| `src/components/ProductCard.tsx` | Ready for Phase 2: sale price, stock, condition |
| `src/pages/Upcoming.tsx` | Holding page for store, cart, account, blog, FAQ and policy routes |

## Placeholders to replace before launch

- Street address (`xyz street`) in `site.ts`
- Business hours in `site.ts` (current values are assumptions)
- Social media URLs in `site.ts` (links stay hidden while empty)
- `YOUR-DOMAIN` in `public/robots.txt`
- Product, category and about-page photography
- The white logo file has a solid black background, so the footer uses pure black. A transparent white logo PNG/SVG would let dark sections use `#101010`.

## Design decisions

- Buttons use black text on green: white text on `#4CB748` fails WCAG contrast.
- Green text uses `#2F7F2C` for the same reason.
- The angled wedge shape echoes the triangle in the logo mark; the logo itself is used unaltered.
- Database-driven sections (products, offers, testimonials, articles) show designed empty states. No product, review or statistic is invented.
- Forms validate on the client; without a backend they offer to send the same details on WhatsApp.
