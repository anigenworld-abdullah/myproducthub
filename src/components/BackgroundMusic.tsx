import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveMediaUrl } from "@/lib/media";
import { Music, VolumeX, Volume2 } from "lucide-react";

export function BackgroundMusic() {
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    resolveMediaUrl(data?.bg_music_url).then((u) => active && setUrl(u));
    return () => { active = false; };
  }, [data?.bg_music_url]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.play().catch(() => setPlaying(false));
    else audioRef.current.pause();
  }, [playing, url]);

  if (!url) return null;

  return (
    <>
      <audio ref={audioRef} src={url} loop preload="auto" />
      <button
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Mute music" : "Play music"}
        className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sky hover:scale-110 transition animate-float-slow"
      >
        {playing ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        {playing && <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-ping" />}
        {!playing && <Music className="absolute -top-1 -right-1 h-3 w-3 bg-white text-primary rounded-full p-0.5" />}
      </button>
    </>
  );
}
