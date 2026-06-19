import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = useParams({ from: "/category/$slug" });

  const catQ = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const productsQ = useQuery({
    queryKey: ["products-by-category", slug],
    enabled: !!catQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", catQ.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> All categories
      </Link>
      <header>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">
          {catQ.data?.name ?? "Category"}
        </h1>
        {catQ.data?.description && <p className="mt-2 text-muted-foreground">{catQ.data.description}</p>}
      </header>

      {productsQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[4/3] rounded-2xl bg-secondary animate-pulse" />)}
        </div>
      ) : !productsQ.data || productsQ.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No products in this category yet.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {productsQ.data.map((p, i) => <Card key={p.id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}

function Card({ product, index }: { product: any; index: number }) {
  const img = useResolvedMedia(product.image_url);
  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      style={{ animationDelay: `${index * 50}ms` }}
      className="group block overflow-hidden rounded-2xl border bg-card shadow-card hover-lift animate-slide-up"
    >
      <div className="aspect-[4/3] overflow-hidden bg-secondary">
        {img ? <img src={img} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>}
      </div>
      <div className="p-4">
        <h3 className="font-semibold line-clamp-1">{product.name}</h3>
        <div className="mt-2 font-display text-lg font-bold text-primary">${Number(product.price).toFixed(2)}</div>
      </div>
    </Link>
  );
}
