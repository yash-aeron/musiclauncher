import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { usePlayer } from "../store/player";
import { AlbumArt } from "./AlbumArt";
import { LosslessBadge } from "./LosslessBadge";
import { PlaybackControls } from "./PlaybackControls";
import { Slider } from "./Slider";
import { Chevron, VolumeIcon, QueueIcon } from "./Icons";
import { QueuePanel } from "./QueuePanel";
import { formatDuration, qualityLabel } from "../lib/format";

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
  const reduce = useReducedMotion();

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
          <motion.div
            layoutId={`art-${track.id}`}
            className="mb-8"
            animate={reduce ? undefined : { scale: playing ? 1 : 0.82 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
          >
            <AlbumArt
              url={track.artUrl}
              alt={track.album}
              rounded="rounded-2xl"
              className="h-[min(40vh,280px)] w-[min(40vh,280px)] shadow-2xl shadow-black/60 md:h-[min(44vh,360px)] md:w-[min(44vh,360px)]"
            />
          </motion.div>

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

            {/* Queue row */}
            <div className="mt-7 flex items-center justify-center gap-10 text-[13px] font-medium text-white/55">
              <button
                onClick={() => openQueue(!queueOpen)}
                className={`flex items-center gap-1.5 ${queueOpen ? "text-white" : "hover:text-white"}`}
              >
                <QueueIcon width={16} height={16} />
                Queue
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
