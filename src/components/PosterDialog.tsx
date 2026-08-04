import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, ImageDown, Loader2 } from "lucide-react";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import { useCurrency } from "@/hooks/useCurrency";
import { downloadPoster, posterDataUrl, type PosterStyle } from "@/lib/poster";
import { toast } from "sonner";

const SITE = "https://myproducthub.lovable.app";

const STYLES: { id: PosterStyle; label: string }[] = [
  { id: "light", label: "Clean white" },
  { id: "dark", label: "Dark premium" },
  { id: "theme", label: "Site theme" },
];

export interface PosterProduct {
  id: string;
  name: string;
  description?: string | null;
  price: number | string | null;
  price_currency?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
}

export function PosterDialog({
  product,
  variant = "solid",
}: {
  product: PosterProduct;
  variant?: "solid" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<PosterStyle>("light");
  const [branding, setBranding] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cover = product.image_url ?? product.image_urls?.[0] ?? null;
  const imageUrl = useResolvedMedia(cover);
  const { format } = useCurrency();
  const price = format(Number(product.price ?? 0), (product.price_currency as any) ?? "USD");

  const input = {
    name: product.name,
    description: product.description,
    price,
    imageUrl,
    style,
    branding,
    siteName: "MY PRODUCT HUB",
    link: `${SITE}/product/${product.id}`,
  };

  useEffect(() => {
    if (!open) return;
    let active = true;
    setBusy(true);
    posterDataUrl(input)
      .then((url) => active && setPreview(url))
      .catch(() => active && setPreview(null))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, style, branding, imageUrl, price, product.id]);

  async function onDownload() {
    try {
      setBusy(true);
      await downloadPoster(input);
      toast.success("Poster downloaded");
    } catch {
      toast.error("Could not create the poster");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            variant === "solid"
              ? "inline-flex items-center gap-2 rounded-full border bg-card px-6 py-3 text-sm font-semibold transition hover:scale-105"
              : "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition hover:bg-secondary"
          }
          title="Download a 9:16 poster of this product"
        >
          <ImageDown className={variant === "solid" ? "h-4 w-4" : "h-3.5 w-3.5"} /> Poster
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Download poster (9:16)</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <div className="relative mx-auto w-[180px] overflow-hidden rounded-xl border bg-secondary aspect-[9/16]">
            {preview ? (
              <img src={preview} alt={`${product.name} poster preview`} className="h-full w-full object-cover" />
            ) : null}
            {busy && (
              <div className="absolute inset-0 grid place-items-center bg-background/60">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Style</div>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      style === s.id ? "bg-primary text-primary-foreground shadow-sky" : "hover:bg-secondary"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={branding}
                onChange={(e) => setBranding(e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Show site name & link at the bottom
            </label>

            <button
              type="button"
              disabled={busy}
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-full bg-hero px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sky transition hover:scale-105 disabled:opacity-60"
            >
              <Download className="h-4 w-4" /> Download PNG
            </button>
            <p className="text-[11px] text-muted-foreground">
              1080 × 1920 — perfect for Instagram / WhatsApp status.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
