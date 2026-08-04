# Downloadable 9:16 Product Poster

Add a one-click "Download poster" that turns any product into a clean 9:16 (1080x1920) image — product photo on top, name and description below, price badge — ready to post on Instagram/WhatsApp status or send to anyone.

## What you get

- A **Download poster** button on the product page and in the admin product list.
- A small preview dialog before download, with:
  - **Style**: Clean white, Dark premium, or Theme (uses your current site colors).
  - **Branding**: on/off toggle — adds "MY PRODUCT HUB" + the product link at the bottom.
- The file downloads as PNG named after the product, e.g. `blue-hoodie-poster.png`.

## Who can use it

A new setting in **Admin → Settings**: *Allow visitors to download product posters*.

- Off (default): the button only shows for main admin and admins.
- On: everyone sees it on the product page.

## Poster layout (fixed, disciplined)

```text
+---------------------------+
|        margin             |
|   [ product image        ]|  ~55% height, cropped to fill, rounded
|   [ (cover image)        ]|
|                           |
|   PRODUCT NAME            |  large, 2 lines max, auto-shrink
|   description text...     |  wrapped, clamped to ~6 lines with ellipsis
|                           |
|   [  PRICE BADGE  ]       |  price in the product's own currency
|                           |
|   MY PRODUCT HUB          |  optional footer + short link
+---------------------------+
```

Every element is measured before drawing, so text never overflows or overlaps; long names and descriptions are shrunk or truncated automatically.

## Technical notes

- New client module `src/lib/poster.ts`: renders to an offscreen `<canvas>` at 1080x1920 with word-wrap, font auto-fit, line clamping, rounded-corner image draw (`object-fit: cover` math), gradient/solid backgrounds per style, then `canvas.toBlob()` → download.
- Product image comes from `resolveMediaUrl()` (signed storage URL or external); loaded with `crossOrigin="anonymous"` so the canvas isn't tainted. If a remote image blocks CORS, we fall back to a solid theme panel with the product name so the download still works.
- Price uses the existing `useCurrency().format()` with the product's `price_currency`.
- Theme style reads live CSS variables (`--primary`, `--accent`, `--background`) from the document.
- New component `src/components/PosterDialog.tsx` (shadcn Dialog) with style/branding controls and a scaled-down live preview.
- Migration: add `allow_public_poster boolean not null default false` to `site_settings`; toggle added to the Settings tab in `src/routes/admin.tsx`.
- Visibility gate uses existing `useAuth()` (`isMainAdmin` / `isModerator`) plus that setting.
