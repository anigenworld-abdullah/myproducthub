import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import { safeUrl } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  media_type: string | null;
  position: string | null;
  sort_order: number | null;
}

export function BannerCarousel() {
  const q = useQuery({
    queryKey: ["ads", "banner"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ads")
        .select("*")
        .eq("active", true)
        .eq("position", "banner")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Ad[];
    },
  });

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const ads = q.data ?? [];

  // auto-scroll
  useEffect(() => {
    if (paused || ads.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, 4500);
    return () => clearInterval(id);
  }, [paused, ads.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const slide = el.children[index] as HTMLElement | undefined;
    if (slide) el.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  }, [index]);

  function nudge(dir: -1 | 1) {
    if (ads.length === 0) return;
    setIndex((i) => (i + dir + ads.length) % ads.length);
  }

  if (ads.length === 0) return null;

  return (
    <section
      className="relative -mx-4 sm:mx-0 sm:rounded-2xl overflow-hidden group animate-fade-in"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Sponsored banner"
    >
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
        onScroll={(e) => {
          const el = e.currentTarget;
          const w = el.clientWidth || 1;
          const i = Math.round(el.scrollLeft / w);
          if (i !== index) setIndex(i);
        }}
      >
        {ads.map((ad) => (
          <BannerSlide key={ad.id} ad={ad} />
        ))}
      </div>

      {ads.length > 1 && (
        <>
          <button
            onClick={() => nudge(-1)}
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur p-2 shadow-card opacity-0 group-hover:opacity-100 transition hover:scale-110"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => nudge(1)}
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur p-2 shadow-card opacity-0 group-hover:opacity-100 transition hover:scale-110"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {ads.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-1.5 bg-white/70"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function BannerSlide({ ad }: { ad: Ad }) {
  const media = useResolvedMedia(ad.image_url);
  const isVideo = (ad.media_type ?? "image") === "video";
  const href = safeUrl(ad.link_url);

  const inner = (
    <div className="relative w-full h-32 sm:h-40 md:h-48 bg-gradient-to-r from-primary/10 to-accent/10 overflow-hidden">
      {media && !isVideo && (
        <img
          src={media}
          alt={ad.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[8s] hover:scale-110"
        />
      )}
      {media && isVideo && (
        <video
          src={media}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <div className="absolute inset-0 flex items-end p-4 sm:p-6">
        <div className="text-white max-w-2xl animate-slide-up">
          <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/90 px-2 py-0.5 rounded-full">
            Sponsored
          </span>
          <h3 className="mt-2 font-display text-lg sm:text-2xl font-bold drop-shadow-lg">
            {ad.title}
          </h3>
          {href && (
            <div className="mt-1 inline-flex items-center text-xs sm:text-sm font-semibold">
              Learn more <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-w-full snap-start">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block">
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  );
}
