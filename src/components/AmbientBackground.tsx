import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { usePlayer } from "../store/player";
import { paletteFromArt, fallbackPalette, type Palette } from "../lib/colors";

/** Full-viewport animated glow driven by the current track's album art. */
export function AmbientBackground() {
  const current = usePlayer((s) => (s.index >= 0 ? s.queue[s.index] : null));
  const [palette, setPalette] = useState<Palette>(fallbackPalette);

  useEffect(() => {
    let alive = true;
    paletteFromArt(current?.artUrl).then((p) => {
      if (alive) setPalette(p);
    });
    return () => {
      alive = false;
    };
  }, [current?.artUrl]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05060a]">
      <motion.div
        className="ambient-glow absolute -left-1/4 -top-1/4 h-[70vh] w-[70vh] rounded-full blur-[120px] animate-drift"
        animate={{ backgroundColor: palette.primary }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
        style={{ opacity: 0.55 }}
      />
      <motion.div
        className="ambient-glow absolute right-[-15%] top-[10%] h-[60vh] w-[60vh] rounded-full blur-[130px] animate-drift"
        animate={{ backgroundColor: palette.accent }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
        style={{ opacity: 0.45, animationDelay: "-6s" }}
      />
      <motion.div
        className="ambient-glow absolute bottom-[-20%] left-[20%] h-[65vh] w-[65vh] rounded-full blur-[140px] animate-drift"
        animate={{ backgroundColor: palette.secondary }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
        style={{ opacity: 0.5, animationDelay: "-12s" }}
      />
      {/* Vignette to keep text legible */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
    </div>
  );
}
