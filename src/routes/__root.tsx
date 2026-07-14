import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { useGlobalClickSound } from "@/hooks/useClickSound";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { CurrencyProvider, CurrencySelector } from "@/hooks/useCurrency";
import { BackgroundMusic } from "@/components/BackgroundMusic";
import { SearchBar } from "@/components/SearchBar";
import { ThemeApplier } from "@/components/ThemeApplier";
import { ShoppingBag, Shield, LogIn, LogOut, Sparkles } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center animate-fade-in">
        <h1 className="text-8xl font-bold text-shimmer">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That page drifted into the clouds.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sky transition hover:scale-105">
            Back to Products Hub
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Try again
          </button>
          <a href="/" className="rounded-full border bg-card px-4 py-2 text-sm font-medium">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TheProducts HUB" },
      { name: "description", content: "Browse hand-picked products across many categories with images, video, and direct buy links." },
      { property: "og:title", content: "TheProducts HUB" },
      { property: "og:description", content: "Browse hand-picked products across many categories with images, video, and direct buy links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TheProducts HUB" },
      { name: "twitter:description", content: "Browse hand-picked products across many categories with images, video, and direct buy links." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/bbf67f53-6aae-41e5-b585-17b7195d8d49" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/bbf67f53-6aae-41e5-b585-17b7195d8d49" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function Header() {
  const { user, isAdmin } = useAuth();
  return (
    <header className="sticky top-0 z-40 glass border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="relative animate-float-slow">
              <ShoppingBag className="h-7 w-7 text-primary transition-transform group-hover:rotate-12 group-hover:scale-110" />
              <Sparkles className="h-3 w-3 text-primary-foreground absolute -top-1 -right-1 fill-primary animate-spin-slow" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              MY <span className="text-shimmer">PRODUCT</span> HUB
            </span>
          </Link>
          <div className="hidden md:block flex-1 max-w-md mx-4">
            <SearchBar />
          </div>
          <nav className="flex items-center gap-2">
            <CurrencySelector />
            {isAdmin && (
              <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:scale-105 transition animate-pop shadow-sky">
                <Shield className="h-3.5 w-3.5" /> Admin
              </Link>
            )}
            {user ? (
              <button
                onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium hover:scale-105 transition"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            ) : (
              <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sky hover:scale-105 transition">
                <LogIn className="h-3.5 w-3.5" /> Sign in
              </Link>
            )}
          </nav>
        </div>
        <div className="md:hidden">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useGlobalClickSound();
  useScrollReveal();
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <ThemeApplier />
        <div className="cloud-bg" aria-hidden="true">
          <span className="cloud cloud-1" />
          <span className="cloud cloud-2" />
          <span className="cloud cloud-3" />
          <span className="cloud cloud-4" />
          <span className="aurora aurora-1" />
          <span className="aurora aurora-2" />
        </div>
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6 animate-fade-in">
          <Outlet />
        </main>
        <footer className="mt-16 border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MY PRODUCT HUB — built with sky-blue clarity.
        </footer>
        <BackgroundMusic />
        <Toaster />
      </CurrencyProvider>
    </QueryClientProvider>
  );
}
