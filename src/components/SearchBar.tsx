import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, X, Sparkles } from "lucide-react";

export function SearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Load lightweight product index once for instant fuzzy suggestions
  const idx = useQuery({
    queryKey: ["search-index"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, description, categories(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as Array<{ id: string; name: string; description: string | null; categories: { name: string } | null }>;
    },
    staleTime: 60_000,
  });

  // Build vocabulary of words/phrases for "recommend their searching words"
  const vocab = useMemo(() => {
    const set = new Set<string>();
    (idx.data ?? []).forEach((p) => {
      if (p.name) set.add(p.name);
      if (p.categories?.name) set.add(p.categories.name);
      (p.name?.split(/\s+/) ?? []).forEach((w) => { if (w.length > 2) set.add(w); });
    });
    return Array.from(set);
  }, [idx.data]);

  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase();
    const data = idx.data ?? [];
    type Hit = (typeof data)[number];
    if (!term) return { wordHits: [] as string[], productHits: [] as Hit[] };
    const wordHits = vocab
      .filter((w) => w.toLowerCase().includes(term))
      .sort((a, b) => a.length - b.length)
      .slice(0, 5);
    const productHits = data
      .filter((p) => (p.name + " " + (p.description ?? "")).toLowerCase().includes(term))
      .slice(0, 6);
    return { wordHits, productHits };
  }, [q, vocab, idx.data]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const has = suggestions.wordHits.length + suggestions.productHits.length > 0;

  function go(productId: string) {
    setOpen(false);
    setQ("");
    navigate({ to: "/product/$id", params: { id: productId } });
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur px-3 py-1.5 shadow-card focus-within:ring-2 focus-within:ring-ring transition">
        <Search className="h-4 w-4 text-primary" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!has) return;
            const list = suggestions.productHits;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && list[active]) { e.preventDefault(); go(list[active].id); }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search products…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {q && (
          <button onClick={() => { setQ(""); setOpen(false); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && q && has && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border bg-card shadow-sky animate-pop">
          {suggestions.wordHits.length > 0 && (
            <div className="border-b p-2">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" /> Suggestions
              </div>
              <div className="flex flex-wrap gap-1.5 px-1">
                {suggestions.wordHits.map((w) => (
                  <button
                    key={w}
                    onClick={() => { setQ(w); setActive(0); }}
                    className="rounded-full bg-secondary px-2.5 py-1 text-xs hover:bg-accent transition"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}
          {suggestions.productHits.length > 0 && (
            <ul className="max-h-72 overflow-auto py-1">
              {suggestions.productHits.map((p, i) => (
                <li key={p.id}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(p.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                      i === active ? "bg-accent" : "hover:bg-accent/60"
                    }`}
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.categories?.name && (
                      <span className="text-[10px] font-semibold text-muted-foreground">{p.categories.name}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {open && q && !has && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border bg-card p-4 text-sm text-muted-foreground shadow-card">
          No matches for "<span className="font-semibold text-foreground">{q}</span>"
        </div>
      )}
    </div>
  );
}
