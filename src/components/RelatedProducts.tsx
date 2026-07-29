import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import { useCurrency } from "@/hooks/useCurrency";

/** Suggestions: products in the same category first, then newest others. */
export function RelatedProducts({
  productId,
  categoryId,
}: {
  productId: string;
  categoryId: string | null;
}) {
  const q = useQuery({
    queryKey: ["related", productId, categoryId],
    queryFn: async () => {
      const base = () =>
        supabase.from("products").select("id, name, price, price_currency, image_url").neq("id", productId);
      let items: any[] = [];
      if (categoryId) {
        const { data } = await base().eq("category_id", categoryId).order("created_at", { ascending: false }).limit(8);
        items = data ?? [];
      }
      if (items.length < 4) {
        const { data } = await base().order("created_at", { ascending: false }).limit(12);
        const seen = new Set(items.map((i) => i.id));
        for (const p of data ?? []) {
          if (!seen.has(p.id)) items.push(p);
          if (items.length >= 8) break;
        }
      }
      return items.slice(0, 8);
    },
  });

  if (!q.data || q.data.length === 0) return null;

  return (
    <section className="space-y-4 reveal">
      <h2 className="font-display text-2xl font-bold">You may also like</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {q.data.map((p, i) => (
          <RelatedCard key={p.id} p={p} index={i} />
        ))}
      </div>
    </section>
  );
}

function RelatedCard({ p, index }: { p: any; index: number }) {
  const img = useResolvedMedia(p.image_url);
  const { format } = useCurrency();
  return (
    <Link
      to="/product/$id"
      params={{ id: p.id }}
      className="group block overflow-hidden rounded-2xl border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-sky tilt-on-hover animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="aspect-square overflow-hidden bg-secondary">
        {img ? (
          <img
            src={img}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-secondary" />
        )}
      </div>
      <div className="p-2.5">
        <div className="truncate text-sm font-semibold">{p.name}</div>
        <div className="text-xs font-bold text-primary">
          {format(Number(p.price), (p.price_currency ?? "USD") as any)}
        </div>
      </div>
    </Link>
  );
}
