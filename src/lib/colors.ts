import Vibrant from "node-vibrant";

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

  try {
    const swatches = await Vibrant.from(artUrl).getPalette();
    const pick = (...keys: (keyof typeof swatches)[]) => {
      for (const k of keys) {
        const hex = swatches[k]?.hex;
        if (hex) return hex;
      }
      return undefined;
    };
    const palette: Palette = {
      primary: pick("DarkVibrant", "Vibrant", "Muted") || FALLBACK.primary,
      secondary: pick("DarkMuted", "Muted", "DarkVibrant") || FALLBACK.secondary,
      accent: pick("Vibrant", "LightVibrant", "LightMuted") || FALLBACK.accent,
    };
    cache.set(artUrl, palette);
    return palette;
  } catch {
    return FALLBACK;
  }
}

export { FALLBACK as fallbackPalette };
