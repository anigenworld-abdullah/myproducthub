import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import { useCurrency } from "@/hooks/useCurrency";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/product/$id")({
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

  const video = useResolvedMedia(q.data?.video_url);
  const { format } = useCurrency();

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!q.data) return <div className="text-sm text-muted-foreground">Product not found.</div>;

  const p = q.data;
  const extras: string[] = Array.isArray((p as any).image_urls) ? (p as any).image_urls : [];
  const allImages = Array.from(new Set([p.image_url, ...extras].filter(Boolean))) as string[];

  return (
    <article className="space-y-6 animate-fade-in">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {allImages.length > 0 && (
            <div className="columns-1 sm:columns-2 gap-3 [column-fill:_balance]">
              {allImages.map((path, i) => (
                <GalleryImage key={path + i} path={path} alt={`${p.name} ${i + 1}`} />
              ))}
            </div>
          )}
          {video && (
            <video src={video} controls className="w-full rounded-3xl shadow-card bg-black" />
          )}
        </div>

        <div className="space-y-4">
          {p.categories?.slug && (
            <Link
              to="/category/$slug"
              params={{ slug: p.categories.slug }}
              className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
            >
              {p.categories.name}
            </Link>
          )}
          <h1 className="font-display text-3xl sm:text-5xl font-bold leading-tight">{p.name}</h1>
          <div className="font-display text-3xl font-bold text-primary">{format(Number(p.price))}</div>
          {p.description && <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{p.description}</p>}

          {p.product_link && (
            <a
              href={p.product_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-hero px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sky transition hover:scale-105"
            >
              Visit product page <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function GalleryImage({ path, alt }: { path: string; alt: string }) {
  const url = useResolvedMedia(path);
  if (!url) return <div className="mb-3 break-inside-avoid aspect-square rounded-2xl bg-secondary animate-pulse" />;
  return (
    <div className="mb-3 break-inside-avoid overflow-hidden rounded-2xl bg-secondary shadow-card">
      <img src={url} alt={alt} loading="lazy" className="w-full h-auto object-cover" />
    </div>
  );
}
