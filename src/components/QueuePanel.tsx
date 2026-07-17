import { AnimatePresence, motion } from "framer-motion";
import { usePlayer } from "../store/player";
import { AlbumArt } from "./AlbumArt";
import { Close, Play } from "./Icons";
import { formatDuration } from "../lib/format";

/** Slide-up sheet listing the play queue: tap to jump, ✕ to remove. */
export function QueuePanel() {
  const open = usePlayer((s) => s.queueOpen);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const openQueue = usePlayer((s) => s.openQueue);
  const jumpToQueueIndex = usePlayer((s) => s.jumpToQueueIndex);
  const removeFromQueue = usePlayer((s) => s.removeFromQueue);

  const upNext = queue.slice(index + 1);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="glass-strong absolute inset-x-3 bottom-3 z-10 flex max-h-[55vh] flex-col rounded-2xl p-4 shadow-2xl sm:inset-x-auto sm:right-6 sm:w-96"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          // Don't let queue scrolling/taps drag the Now Playing sheet.
          onPointerDownCapture={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Playing Next</h3>
            <button onClick={() => openQueue(false)} className="text-white/50 hover:text-white">
              <Close width={18} height={18} />
            </button>
          </div>

          {upNext.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/40">
              Nothing queued — use “Play Next” or “Add to Queue” on any song.
            </p>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {upNext.map((t, i) => {
                const qIndex = index + 1 + i;
                return (
                  <li key={`${t.id}-${qIndex}`} className="group flex items-center gap-3 rounded-lg px-1 py-1.5">
                    <button
                      onClick={() => jumpToQueueIndex(qIndex)}
                      className="relative flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="relative h-9 w-9 shrink-0">
                        <AlbumArt url={t.artUrl} alt={t.album} rounded="rounded" className="h-9 w-9" />
                        <div className="absolute inset-0 flex items-center justify-center rounded bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                          <Play width={14} height={14} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium">{t.title}</div>
                        <div className="truncate text-[11px] text-white/45">{t.artist}</div>
                      </div>
                    </button>
                    <span className="text-[11px] tabular-nums text-white/35">{formatDuration(t.durationSec)}</span>
                    <button
                      onClick={() => removeFromQueue(qIndex)}
                      className="rounded-full p-1.5 text-white/35 hover:bg-white/10 hover:text-white"
                      title="Remove from queue"
                    >
                      <Close width={14} height={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
