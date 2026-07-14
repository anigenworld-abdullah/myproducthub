import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { safeUrl } from "@/lib/utils";
import { MessageCircle, Instagram, Globe, Mail, Sparkles } from "lucide-react";

export function ContactUs() {
  const q = useQuery({
    queryKey: ["site-settings", "contact"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("contact_whatsapp,contact_instagram,contact_url,contact_email")
        .eq("id", 1)
        .maybeSingle();
      return data as {
        contact_whatsapp: string | null;
        contact_instagram: string | null;
        contact_url: string | null;
        contact_email: string | null;
      } | null;
    },
  });

  const s = q.data;
  if (!s) return null;

  const items: Array<{
    key: string;
    label: string;
    href: string;
    Icon: typeof MessageCircle;
    accent: string;
  }> = [];

  if (s.contact_whatsapp) {
    const digits = s.contact_whatsapp.replace(/[^\d+]/g, "").replace(/^\+/, "");
    if (digits) {
      items.push({
        key: "wa",
        label: "WhatsApp",
        href: `https://wa.me/${digits}`,
        Icon: MessageCircle,
        accent: "from-emerald-400 to-green-600",
      });
    }
  }
  if (s.contact_instagram) {
    const handle = s.contact_instagram.trim().replace(/^@/, "");
    const igHref = /^https?:\/\//i.test(handle)
      ? safeUrl(handle)
      : `https://instagram.com/${encodeURIComponent(handle)}`;
    if (igHref) {
      items.push({
        key: "ig",
        label: "Instagram",
        href: igHref,
        Icon: Instagram,
        accent: "from-pink-500 via-fuchsia-500 to-orange-400",
      });
    }
  }
  if (s.contact_url) {
    const u = safeUrl(s.contact_url);
    if (u) items.push({ key: "url", label: "Website", href: u, Icon: Globe, accent: "from-sky-400 to-blue-600" });
  }
  if (s.contact_email) {
    const email = s.contact_email.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      items.push({
        key: "em",
        label: "Email",
        href: `mailto:${email}`,
        Icon: Mail,
        accent: "from-amber-400 to-orange-600",
      });
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="reveal">
      <div className="relative overflow-hidden rounded-3xl border bg-card/70 backdrop-blur p-6 sm:p-8 shadow-card">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-accent/30 blur-3xl animate-float" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5 animate-spin-slow" /> Get in touch
            </div>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold">Contact us</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Reach out — we usually reply within a few hours.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {items.map(({ key, label, href, Icon, accent }, i) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ animationDelay: `${i * 80}ms` }}
                className={`group inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${accent} px-4 py-2 text-sm font-semibold text-white shadow-sky hover:scale-105 transition animate-bounce-in`}
              >
                <Icon className="h-4 w-4 transition-transform group-hover:rotate-12" />
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
