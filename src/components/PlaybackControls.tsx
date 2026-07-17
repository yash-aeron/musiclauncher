import { usePlayer } from "../store/player";
import { Play, Pause, Prev, Next, Shuffle, Repeat } from "./Icons";

/** The play/pause/next/prev/shuffle/repeat cluster, shared by bar + fullscreen. */
export function PlaybackControls({ size = "md" }: { size?: "md" | "lg" }) {
  const playing = usePlayer((s) => s.playing);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);

  const big = size === "lg";
  const playBtn = big ? "h-16 w-16" : "h-11 w-11";
  const icon = big ? 30 : 22;

  return (
    <div className={`flex items-center ${big ? "gap-6" : "gap-4"}`}>
      <button
        onClick={toggleShuffle}
        title="Shuffle"
        className={`transition ${shuffle ? "text-[color:var(--accent-strong)]" : "text-white/50 hover:text-white"}`}
      >
        <Shuffle width={big ? 22 : 18} height={big ? 22 : 18} />
      </button>
      <button onClick={() => prev()} className="text-white/80 hover:text-white">
        <Prev width={big ? 30 : 24} height={big ? 30 : 24} />
      </button>
      <button
        onClick={togglePlay}
        className={`flex ${playBtn} items-center justify-center rounded-full bg-white text-black shadow-lg transition hover:scale-105`}
      >
        {playing ? <Pause width={icon} height={icon} /> : <Play width={icon} height={icon} />}
      </button>
      <button onClick={() => next()} className="text-white/80 hover:text-white">
        <Next width={big ? 30 : 24} height={big ? 30 : 24} />
      </button>
      <button
        onClick={cycleRepeat}
        title={`Repeat: ${repeat}`}
        className={`relative transition ${repeat !== "off" ? "text-[color:var(--accent-strong)]" : "text-white/50 hover:text-white"}`}
      >
        <Repeat width={big ? 22 : 18} height={big ? 22 : 18} />
        {repeat === "one" ? (
          <span className="absolute -bottom-1 -right-1 text-[9px] font-bold">1</span>
        ) : null}
      </button>
    </div>
  );
}
