import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { usePlayer } from "../store/player";
import { AlbumArt } from "./AlbumArt";
import { LosslessBadge } from "./LosslessBadge";
import { PlaybackControls } from "./PlaybackControls";
import { Slider } from "./Slider";
import { Chevron, VolumeIcon, QueueIcon, CrossfadeIcon } from "./Icons";
import { QueuePanel } from "./QueuePanel";
import { formatDuration, qualityLabel } from "../lib/format";
import type { LyricLine } from "../types";

export function NowPlayingScreen() {
  const open = usePlayer((s) => s.nowPlayingOpen);
  const track = usePlayer((s) => (s.index >= 0 ? s.queue[s.index] : null));
  const playing = usePlayer((s) => s.playing);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const volume = usePlayer((s) => s.volume);
  const queueOpen = usePlayer((s) => s.queueOpen);
  const seek = usePlayer((s) => s.seek);
  const setVolume = usePlayer((s) => s.setVolume);
  const openNowPlaying = usePlayer((s) => s.openNowPlaying);
  const openQueue = usePlayer((s) => s.openQueue);
  const crossfadeSec = usePlayer((s) => s.crossfadeSec);
  const setCrossfade = usePlayer((s) => s.setCrossfade);
  const reduce = useReducedMotion();
  const [lyricsOpen, setLyricsOpen] = useState(false);

  useEffect(() => setLyricsOpen(false), [track?.id]);

  // Off → 3s → 6s → 12s → Off
  const CROSSFADE_STEPS = [0, 3, 6, 12];
  function cycleCrossfade() {
    const at = CROSSFADE_STEPS.indexOf(crossfadeSec);
    setCrossfade(CROSSFADE_STEPS[(at + 1) % CROSSFADE_STEPS.length] ?? 0);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    // Swipe down anywhere on the sheet to dismiss — velocity OR distance.
    if (info.offset.y > 120 || info.velocity.y > 500) openNowPlaying(false);
  }

  return (
    <AnimatePresence>
      {open && track ? (
        <motion.div
          className="fixed inset-0 z-50 flex touch-pan-y flex-col items-center justify-center px-6"
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={onDragEnd}
        >
          {/* Extra blur layer over the ambient background */}
          <div className="absolute inset-0 -z-10 bg-black/30 backdrop-blur-2xl" />

          {/* Grab handle — iOS sheet affordance */}
          <div className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25" />

          <button
            onClick={() => openNowPlaying(false)}
            className="glass absolute right-4 top-4 rounded-full p-2 text-white/70 hover:text-white md:right-6 md:top-6"
            title="Close"
          >
            <Chevron width={24} height={24} />
          </button>

          {/* Art scales down when paused, up when playing — the iOS signature. */}
          <AnimatePresence mode="wait" initial={false}>
            {lyricsOpen ? (
              <motion.div
                key="lyrics"
                className="mb-8 h-[min(40vh,280px)] w-full max-w-md md:h-[min(44vh,360px)]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <LyricsView lines={track.lyrics ?? []} position={position} reduce={Boolean(reduce)} />
              </motion.div>
            ) : (
              <motion.div
                key="art"
                layoutId={`art-${track.id}`}
                className="mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, scale: reduce ? 1 : playing ? 1 : 0.82 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
              >
                <AlbumArt
                  url={track.artUrl}
                  alt={track.album}
                  rounded="rounded-2xl"
                  className="h-[min(40vh,280px)] w-[min(40vh,280px)] shadow-2xl shadow-black/60 md:h-[min(44vh,360px)] md:w-[min(44vh,360px)]"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full max-w-md">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight">{track.title}</h2>
              <LosslessBadge track={track} showDetail />
            </div>
            <p className="truncate text-lg text-[color:var(--accent-strong)]">{track.artist}</p>

            <div className="mt-7">
              <Slider value={position} max={duration} onChange={seek} accent="bg-white" />
              <div className="flex justify-between text-[11px] tabular-nums text-white/45">
                <span>{formatDuration(position)}</span>
                <span>-{formatDuration(Math.max(0, duration - position))}</span>
              </div>
            </div>

            <div className="mt-7 flex justify-center">
              <PlaybackControls size="lg" />
            </div>

            {/* Volume */}
            <div className="mt-8 flex items-center gap-3 text-white/40">
              <VolumeIcon width={15} height={15} />
              <Slider value={volume} max={1} onChange={setVolume} accent="bg-white/70" className="flex-1" />
              <VolumeIcon width={20} height={20} />
            </div>

            {/* Queue + crossfade row */}
            <div className="mt-7 flex items-center justify-center gap-7 text-[13px] font-medium text-white/55">
              <button
                onClick={() => setLyricsOpen((value) => !value)}
                aria-pressed={lyricsOpen}
                className={lyricsOpen ? "text-white" : "hover:text-white"}
              >
                Lyrics
              </button>
              <button
                onClick={() => openQueue(!queueOpen)}
                className={`flex items-center gap-1.5 ${queueOpen ? "text-white" : "hover:text-white"}`}
              >
                <QueueIcon width={16} height={16} />
                Queue
              </button>
              <button
                onClick={cycleCrossfade}
                title="Crossfade between songs"
                className={`flex items-center gap-1.5 ${crossfadeSec > 0 ? "text-[color:var(--accent-strong)]" : "hover:text-white"}`}
              >
                <CrossfadeIcon width={16} height={16} />
                {crossfadeSec > 0 ? `Fade ${crossfadeSec}s` : "Fade off"}
              </button>
            </div>

            {qualityLabel(track.sampleRate, track.bitDepth) ? (
              <div className="mt-6 text-center text-xs uppercase tracking-widest text-white/35">
                {track.codec.toUpperCase()} · {qualityLabel(track.sampleRate, track.bitDepth)}
              </div>
            ) : null}
          </div>

          <QueuePanel />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * Apple Music-style lyrics: synced lines highlight and auto-center as the
 * song plays (tap a line to seek); unsynced lyrics are a plain scroll.
 */
function LyricsView({ lines, position, reduce }: { lines: LyricLine[]; position: number; reduce: boolean }) {
  const seek = usePlayer((s) => s.seek);
  const listRef = useRef<HTMLDivElement>(null);
  const synced = lines.some((l) => l.timestamp != null);

  // Last line whose timestamp has passed = the one being sung.
  let activeIndex = -1;
  if (synced) {
    for (let i = 0; i < lines.length; i++) {
      const ts = lines[i].timestamp;
      if (ts != null && ts <= position) activeIndex = i;
    }
  }

  useEffect(() => {
    if (activeIndex < 0) return;
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [activeIndex, reduce]);

  if (lines.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center text-sm text-white/40">
        No lyrics for this song — add them with Edit Song Info.
      </div>
    );
  }

  return (
    <div
      className="glass h-full overflow-hidden rounded-2xl"
      // Let lyrics scroll without dragging the Now Playing sheet down.
      onPointerDownCapture={(e) => e.stopPropagation()}
    >
      <div
        ref={listRef}
        className="h-full overflow-y-auto px-6 py-8 [mask-image:linear-gradient(transparent,black_12%,black_88%,transparent)]"
      >
        {lines.map((line, i) => (
          <p
            key={`${i}-${line.text}`}
            onClick={line.timestamp != null ? () => seek(line.timestamp!) : undefined}
            className={`py-1.5 text-[17px] font-semibold leading-snug transition-colors duration-300 ${
              i === activeIndex
                ? "text-white"
                : synced
                  ? `text-white/35 ${line.timestamp != null ? "cursor-pointer hover:text-white/60" : ""}`
                  : "text-white/70"
            }`}
          >
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}
