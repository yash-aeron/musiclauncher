export function formatDuration(totalSec: number): string {
  if (!isFinite(totalSec) || totalSec < 0) return "0:00";
  const s = Math.floor(totalSec);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const h = Math.floor(m / 60);
  if (h > 0) {
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** "24-bit / 96 kHz" style quality label for the lossless badge. */
export function qualityLabel(sampleRate?: number, bitDepth?: number): string | null {
  const parts: string[] = [];
  if (bitDepth) parts.push(`${bitDepth}-bit`);
  if (sampleRate) parts.push(`${(sampleRate / 1000).toFixed(sampleRate % 1000 === 0 ? 0 : 1)} kHz`);
  return parts.length ? parts.join(" / ") : null;
}

export function formatMinutes(totalSec: number): string {
  const mins = Math.ceil(totalSec / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} hr ${m} min`;
}
