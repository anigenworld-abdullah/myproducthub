import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-media";
const cache = new Map<string, { url: string; exp: number }>();

export function isExternal(url: string | null | undefined) {
  return !!url && /^https?:\/\//.test(url);
}

/** Returns a usable URL for a stored object path or external URL. */
export async function resolveMediaUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (isExternal(path)) return path;
  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.exp > now + 60_000) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  cache.set(path, { url: data.signedUrl, exp: now + 60 * 60 * 1000 });
  return data.signedUrl;
}

export async function uploadMedia(file: File, prefix = "media"): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}
