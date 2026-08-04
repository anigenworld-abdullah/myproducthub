import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import { useCurrency } from "@/hooks/useCurrency";
import { ArrowLeft, ExternalLink, Download, Sparkles } from "lucide-react";
import { safeUrl } from "@/lib/utils";
import { ShareButtons } from "@/components/ShareButtons";
import { RelatedProducts } from "@/components/RelatedProducts";

const SITE = "https://myproducthub.lovable.app";

type SeoProduct = {
  name: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  price_currency: string | null;
  is_digital?: boolean | null;
} | null;

/** Isomorphic lightweight fetch used for SSR-safe social metadata. */
async function fetchProductSeo(id: string): Promise<SeoProduct> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=name,description,image_url,price,price_currency,is_digital&limit=1`,
      { headers: { apikey: key, accept: "application/json" } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as any[];
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => ({ seo: await fetchProductSeo(params.id) }),
  head: ({ params, loaderData }) => {
    const p = loaderData?.seo;
    const title = p ? `${p.name} — MY PRODUCT HUB` : "Product — MY PRODUCT HUB";
    const description =
      (p?.description ?? "").trim().slice(0, 155) ||
      (p ? `${p.name} available now on MY PRODUCT HUB.` : "Discover hand-picked products on MY PRODUCT HUB.");
    const canonical = `${SITE}/product/${params.id}`;
    const image = p?.image_url && /^https?:\/\//.test(p.image_url) ? p.image_url : null;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: p
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: p.name,
                description,
                ...(image ? { image } : {}),
                offers: {
                  "@type": "Offer",
                  price: Number(p.price ?? 0),
                  priceCurrency: p.price_currency ?? "USD",
                  url: canonical,
                },
              }),
            },
          ]
        : undefined,
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { id } = useParams({ from: "/product/$id" });
  const q = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, slug)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const video = useResolvedMedia((q.data as any)?.video_url);
  const { format } = useCurrency();

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!q.data) return <div className="text-sm text-muted-foreground">Product not found.</div>;

  const p = q.data as any;
  const extras: string[] = Array.isArray(p.image_urls) ? p.image_urls : [];
  const allImages = Array.from(new Set([p.image_url, ...extras].filter(Boolean))) as string[];

  return (
    <article className="space-y-10 animate-fade-in">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {allImages.length > 0 && (
            <div className="columns-1 sm:columns-2 gap-3 [column-fill:_balance]">
              {allImages.map((path, i) => (
                <GalleryImage key={path + i} path={path} alt={`${p.name} ${i + 1}`} index={i} />
              ))}
            </div>
          )}
          {video && <video src={video} controls className="w-full rounded-3xl shadow-card bg-black" />}
        </div>

        <div className="space-y-4 animate-fade-in-up">
          <div className="flex flex-wrap items-center gap-2">
            {p.categories?.slug && (
              <Link
                to="/category/$slug"
                params={{ slug: p.categories.slug }}
                className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground transition hover:scale-105"
              >
                {p.categories.name}
              </Link>
            )}
            {p.is_digital && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary animate-glow">
                <Sparkles className="h-3 w-3" /> Digital product
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold leading-tight">{p.name}</h1>
          <div className="font-display text-3xl font-bold text-primary">
            {format(Number(p.price), p.price_currency ?? "USD")}
          </div>
          {p.description && (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{p.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {safeUrl(p.product_link) && (
              <a
                href={safeUrl(p.product_link)!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-hero px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sky transition hover:scale-105 animate-glow"
              >
                Visit product page <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {p.is_digital && safeUrl(p.download_url) && (
              <a
                href={safeUrl(p.download_url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border bg-card px-6 py-3 text-sm font-semibold transition hover:scale-105"
              >
                Get / download <Download className="h-4 w-4" />
              </a>
            )}
          </div>

          {canPoster && <PosterDialog product={p} />}

          <ShareButtons path={`/product/${id}`} title={p.name} />
        </div>
      </div>

      <RelatedProducts productId={id} categoryId={p.category_id ?? null} />
    </article>
  );
}

function GalleryImage({ path, alt, index }: { path: string; alt: string; index: number }) {
  const url = useResolvedMedia(path);
  if (!url) return <div className="mb-3 break-inside-avoid aspect-square rounded-2xl bg-secondary animate-pulse" />;
  return (
    <div
      className="mb-3 break-inside-avoid overflow-hidden rounded-2xl bg-secondary shadow-card animate-fade-in-up tilt-on-hover"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className="w-full h-auto object-cover transition-transform duration-700 hover:scale-105"
      />
    </div>
  );
}
