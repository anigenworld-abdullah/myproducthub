import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import { useCurrency } from "@/hooks/useCurrency";
import { ArrowRight, Tag, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Products Hub — Discover Curated Products" },
      { name: "description", content: "Browse hand-picked products across many categories with images, video, and direct buy links." },
      { property: "og:title", content: "Products Hub" },
      { property: "og:description", content: "Discover curated products across many categories." },
    ],
  }),
  component: Home,
});

function Home() {
  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
  const productsQ = useQuery({
    queryKey: ["products", "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, slug)")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data;
    },
  });
  const adsQ = useQuery({
    queryKey: ["ads", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ads").select("*").eq("active", true);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-hero p-8 sm:p-12 text-primary-foreground shadow-sky">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/20 blur-3xl animate-float" />
        <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-90">Welcome to</p>
          <h1 className="mt-2 font-display text-4xl sm:text-6xl font-bold leading-tight">
            Products Hub
          </h1>
          <p className="mt-4 text-base sm:text-lg opacity-95 max-w-lg">
            A sky-blue marketplace of curated picks — images, videos, and one-tap links to the source.
          </p>
        </div>
      </section>

      {/* Ads */}
      {adsQ.data && adsQ.data.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2">
          {adsQ.data.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </section>
      )}

      {/* Categories */}
      <section className="reveal">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold">Categories</h2>
          <span className="text-xs text-muted-foreground">{categoriesQ.data?.length ?? 0} total</span>
        </div>
        {categoriesQ.isLoading ? (
          <SkeletonGrid />
        ) : !categoriesQ.data || categoriesQ.data.length === 0 ? (
          <EmptyState text="No categories yet. Sign in as admin to create the first one." />
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {categoriesQ.data.map((c, i) => (
              <Link
                key={c.id}
                to="/category/$slug"
                params={{ slug: c.slug }}
                style={{ animationDelay: `${i * 40}ms` }}
                className="group rounded-2xl border bg-card p-5 shadow-card hover-lift animate-slide-up"
              >
                <Tag className="h-5 w-5 text-primary mb-2 transition-transform group-hover:rotate-12" />
                <div className="font-semibold">{c.name}</div>
                <div className="mt-1 flex items-center text-xs text-primary opacity-70 group-hover:opacity-100">
                  Browse <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Latest products */}
      <section className="reveal">
        <h2 className="font-display text-2xl font-bold mb-4">Latest products</h2>
        {productsQ.isLoading ? (
          <SkeletonGrid />
        ) : !productsQ.data || productsQ.data.length === 0 ? (
          <EmptyState text="No products yet — the admin will add them shortly." />
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
            {productsQ.data.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function ProductCard({ product, index }: { product: any; index: number }) {
  const cover = product.image_url ?? (Array.isArray(product.image_urls) ? product.image_urls[0] : null);
  const img = useResolvedMedia(cover);
  const { format } = useCurrency();
  const extraCount = Array.isArray(product.image_urls) ? Math.max(0, product.image_urls.length - 1) : 0;
  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      style={{ animationDelay: `${index * 35}ms` }}
      className="group mb-4 break-inside-avoid block overflow-hidden rounded-2xl border bg-card shadow-card hover-lift animate-slide-up"
    >
      <div className="relative overflow-hidden bg-secondary">
        {img ? (
          <img src={img} alt={product.name} loading="lazy" className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground text-xs">No image</div>
        )}
        {product.categories?.name && (
          <span className="absolute top-2 left-2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
            {product.categories.name}
          </span>
        )}
        {extraCount > 0 && (
          <span className="absolute top-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            +{extraCount}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold leading-tight line-clamp-2 text-sm">{product.name}</h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-display text-base font-bold text-primary">{format(Number(product.price), product.price_currency ?? "USD")}</span>
          <span className="text-[11px] text-primary opacity-70 group-hover:opacity-100">View →</span>
        </div>
      </div>
    </Link>
  );
}

function AdCard({ ad }: { ad: any }) {
  const img = useResolvedMedia(ad.image_url);
  const content = (
    <div className="relative overflow-hidden rounded-2xl border bg-card shadow-card hover-lift">
      <div className="flex">
        {img && (
          <div className="w-1/3 bg-secondary overflow-hidden">
            <img src={img} alt={ad.title} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex-1 p-4 flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Sponsored</span>
          <h3 className="mt-1 font-semibold">{ad.title}</h3>
          {ad.link_url && (
            <div className="mt-2 inline-flex items-center text-xs text-primary">
              Visit <ExternalLink className="ml-1 h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
  if (ad.link_url) {
    return <a href={ad.link_url} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return content;
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-[4/3] rounded-2xl bg-secondary animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/50 p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
