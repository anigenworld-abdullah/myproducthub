import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns the URL if it uses a safe http/https scheme; otherwise null. Prevents javascript:/data: href injection. */
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return u.protocol === "https:" || u.protocol === "http:" ? raw : null;
  } catch {
    return null;
  }
}
