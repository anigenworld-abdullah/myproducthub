/**
 * Renders a clean 9:16 (1080x1920) shareable product poster on a canvas.
 * Layout is measured before drawing, so text never overflows or overlaps.
 */

export type PosterStyle = "light" | "dark" | "theme";

export interface PosterInput {
  name: string;
  description?: string | null;
  price: string;
  imageUrl?: string | null;
  style: PosterStyle;
  branding: boolean;
  siteName?: string;
  link?: string | null;
}

const W = 1080;
const H = 1920;
const M = 80;

const SANS = `'Inter','Helvetica Neue',Helvetica,Arial,sans-serif`;

type Palette = {
  bgTop: string;
  bgBottom: string;
  fg: string;
  muted: string;
  accent: string;
  accentFg: string;
  panel: string;
};

/** Returns the color if the canvas engine understands it, else the fallback. */
function safeColor(ctx: CanvasRenderingContext2D, value: string, fallback: string) {
  const prev = ctx.fillStyle;
  try {
    ctx.fillStyle = "#000000";
    ctx.fillStyle = value;
    const ok = ctx.fillStyle !== "#000000" || /#000000|black/i.test(value);
    ctx.fillStyle = prev;
    return ok ? value : fallback;
  } catch {
    ctx.fillStyle = prev;
    return fallback;
  }
}

function cssVar(name: string) {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getPalette(ctx: CanvasRenderingContext2D, style: PosterStyle): Palette {
  if (style === "dark") {
    return {
      bgTop: "#0d1117",
      bgBottom: "#141c2b",
      fg: "#f5f7fa",
      muted: "#9aa5b5",
      accent: "#38bdf8",
      accentFg: "#04121d",
      panel: "#1b2434",
    };
  }
  if (style === "light") {
    return {
      bgTop: "#ffffff",
      bgBottom: "#f3f6fa",
      fg: "#0f1720",
      muted: "#5b6672",
      accent: "#0f1720",
      accentFg: "#ffffff",
      panel: "#eef2f7",
    };
  }
  const primary = safeColor(ctx, cssVar("--primary") || "", "#38bdf8");
  const accent = safeColor(ctx, cssVar("--accent") || "", "#e0f2fe");
  return {
    bgTop: "#ffffff",
    bgBottom: safeColor(ctx, accent, "#e0f2fe"),
    fg: "#0f1720",
    muted: "#5b6672",
    accent: primary,
    accentFg: "#ffffff",
    panel: safeColor(ctx, accent, "#e0f2fe"),
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxW) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    // ellipsize the last line if content remains
    const joined = lines.join(" ");
    const full = words.join(" ");
    if (joined.length < full.length) {
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last.trimEnd()}…`;
    }
  }
  return lines;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed"));
    img.src = url;
  });
}

/** Draws the poster and returns the canvas. */
export async function renderPoster(input: PosterInput): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const p = getPalette(ctx, input.style);

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, p.bgTop);
  grad.addColorStop(1, p.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle corner glow
  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, 900);
  glow.addColorStop(0, p.accent);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  const contentW = W - M * 2;

  // ---- image block ----
  const imgY = M;
  const imgH = 980;
  ctx.save();
  roundRect(ctx, M, imgY, contentW, imgH, 44);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.clip();

  let img: HTMLImageElement | null = null;
  if (input.imageUrl) {
    try {
      img = await loadImage(input.imageUrl);
    } catch {
      img = null;
    }
  }
  if (img) {
    const scale = Math.max(contentW / img.width, imgH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, M + (contentW - dw) / 2, imgY + (imgH - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = p.muted;
    ctx.font = `600 40px ${SANS}`;
    ctx.textAlign = "center";
    ctx.fillText("No image", W / 2, imgY + imgH / 2);
    ctx.textAlign = "left";
  }
  ctx.restore();

  // ---- footer (optional) ----
  let bottomLimit = H - M;
  if (input.branding) {
    ctx.textAlign = "center";
    ctx.fillStyle = p.accent;
    ctx.font = `800 34px ${SANS}`;
    ctx.fillText((input.siteName ?? "MY PRODUCT HUB").toUpperCase(), W / 2, H - M - 8);
    if (input.link) {
      ctx.fillStyle = p.muted;
      ctx.font = `400 26px ${SANS}`;
      const link = input.link.replace(/^https?:\/\//, "");
      ctx.fillText(link.length > 58 ? `${link.slice(0, 57)}…` : link, W / 2, H - M + 38);
    }
    ctx.textAlign = "left";
    bottomLimit = H - M - (input.link ? 96 : 60);
  }

  // ---- price badge (anchored above footer) ----
  const badgeH = 108;
  ctx.font = `800 54px ${SANS}`;
  const priceW = Math.min(ctx.measureText(input.price).width + 88, contentW);
  const badgeY = bottomLimit - badgeH;
  roundRect(ctx, M, badgeY, priceW, badgeH, badgeH / 2);
  ctx.fillStyle = p.accent;
  ctx.fill();
  ctx.fillStyle = p.accentFg;
  ctx.textBaseline = "middle";
  ctx.fillText(input.price, M + 44, badgeY + badgeH / 2 + 2);
  ctx.textBaseline = "alphabetic";

  // ---- title + description (between image and badge) ----
  const textTop = imgY + imgH + 64;
  const textBottom = badgeY - 44;

  let titleSize = 78;
  let titleLines: string[] = [];
  while (titleSize >= 46) {
    ctx.font = `800 ${titleSize}px ${SANS}`;
    titleLines = wrap(ctx, input.name, contentW, 2);
    const needed = titleLines.length * titleSize * 1.16;
    if (needed <= textBottom - textTop) break;
    titleSize -= 6;
  }
  ctx.font = `800 ${titleSize}px ${SANS}`;
  ctx.fillStyle = p.fg;
  let y = textTop + titleSize * 0.9;
  for (const line of titleLines) {
    ctx.fillText(line, M, y);
    y += titleSize * 1.16;
  }

  const desc = (input.description ?? "").trim();
  if (desc) {
    const descSize = 34;
    const lineH = descSize * 1.5;
    const available = textBottom - (y + 18) + lineH;
    const maxLines = Math.max(0, Math.min(7, Math.floor(available / lineH)));
    if (maxLines > 0) {
      ctx.font = `400 ${descSize}px ${SANS}`;
      ctx.fillStyle = p.muted;
      let dy = y + 18;
      for (const line of wrap(ctx, desc, contentW, maxLines)) {
        ctx.fillText(line, M, dy);
        dy += lineH;
      }
    }
  }

  return canvas;
}

export async function posterDataUrl(input: PosterInput) {
  const canvas = await renderPoster(input);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    // Tainted canvas (image host blocked CORS) — redraw without the photo.
    const fallback = await renderPoster({ ...input, imageUrl: null });
    return fallback.toDataURL("image/png");
  }
}

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "product"
  );
}

export async function downloadPoster(input: PosterInput) {
  const url = await posterDataUrl(input);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(input.name)}-poster.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
