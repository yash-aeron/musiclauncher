import type { Track } from "../types";
import { qualityLabel } from "../lib/format";

export function LosslessBadge({ track, showDetail = false }: { track: Track; showDetail?: boolean }) {
  if (track.tier === "lossy") return null;
  const isHiRes = track.tier === "hi-res";
  const detail = qualityLabel(track.sampleRate, track.bitDepth);

  return (
    <span
      title={detail ? `${isHiRes ? "Hi-Res Lossless" : "Lossless"} · ${detail}` : undefined}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isHiRes
          ? "bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/30"
          : "bg-sky-300/15 text-sky-200 ring-1 ring-sky-300/30"
      }`}
    >
      {isHiRes ? "Hi-Res" : "Lossless"}
      {showDetail && detail ? <span className="opacity-70">· {detail}</span> : null}
    </span>
  );
}
