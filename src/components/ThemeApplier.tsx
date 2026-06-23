import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads theme overrides from site_settings and injects them as CSS variables on :root.
 * Admin-controlled colors live in --primary / --accent / --background; fall back to defaults if unset.
 */
export function ThemeApplier() {
  const q = useQuery({
    queryKey: ["site-settings", "theme"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("site_settings").select("theme_primary, theme_accent, theme_background").eq("id", 1).maybeSingle();
      return data as { theme_primary: string | null; theme_accent: string | null; theme_background: string | null } | null;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const root = document.documentElement;
    const apply = (varName: string, val: string | null | undefined) => {
      if (val && val.trim()) root.style.setProperty(varName, val);
      else root.style.removeProperty(varName);
    };
    apply("--primary", q.data?.theme_primary ?? null);
    apply("--ring", q.data?.theme_primary ?? null);
    apply("--accent", q.data?.theme_accent ?? null);
    apply("--background", q.data?.theme_background ?? null);
  }, [q.data]);

  return null;
}
