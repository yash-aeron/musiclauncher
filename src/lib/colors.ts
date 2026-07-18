

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
}

// Neutral, slightly warm fallback — no AI-purple glow when art is missing.
const FALLBACK: Palette = {
  primary: "#2b2a25",
  secondary: "#1a1c22",
  accent: "#4a3f28",
};

const cache = new Map<string, Palette>();

/** Extract an ambient palette from album art for the now-playing glow. */
export async function paletteFromArt(artUrl?: string): Promise<Palette> {
  if (!artUrl) return FALLBACK;
  const cached = cache.get(artUrl);
  if (cached) return cached;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(FALLBACK);
        ctx.drawImage(img, 0, 0, 64, 64);
        
        const getAvg = (sx: number, sy: number, sw: number, sh: number) => {
          const d = ctx.getImageData(sx, sy, sw, sh).data;
          let r = 0, g = 0, b = 0;
          const count = d.length / 4;
          for (let i = 0; i < d.length; i += 4) {
            r += d[i]; g += d[i + 1]; b += d[i + 2];
          }
          const hex = (x: number) => Math.round(x / count).toString(16).padStart(2, '0');
          return `#${hex(r)}${hex(g)}${hex(b)}`;
        };

        const palette: Palette = {
          primary: getAvg(16, 16, 32, 32),
          secondary: getAvg(0, 0, 32, 64),
          accent: getAvg(32, 0, 32, 64),
        };
        cache.set(artUrl, palette);
        resolve(palette);
      } catch {
        resolve(FALLBACK);
      }
    };
    img.onerror = () => resolve(FALLBACK);
    img.src = artUrl;
  });
}

export { FALLBACK as fallbackPalette };
