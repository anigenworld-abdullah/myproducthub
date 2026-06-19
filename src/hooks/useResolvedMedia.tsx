import { useEffect, useState } from "react";
import { resolveMediaUrl } from "@/lib/media";

export function useResolvedMedia(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setUrl(null);
    resolveMediaUrl(path).then((u) => {
      if (active) setUrl(u);
    });
    return () => { active = false; };
  }, [path]);
  return url;
}
