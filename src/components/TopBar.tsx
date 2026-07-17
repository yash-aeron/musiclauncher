import { usePlayer } from "../store/player";
import { AlbumArt } from "./AlbumArt";
import { LosslessBadge } from "./LosslessBadge";
import { Slider } from "./Slider";
import { Play, Pause, Prev, Next, VolumeIcon, Chevron } from "./Icons";
import { AccountButton } from "./AuthModal";
import { formatDuration } from "../lib/format";

/**
 * Apple Music (Mac) top toolbar: transport on the left, a centered "LCD"
 * display (mini art + title/artist + inline scrubber), volume on the right.
 */
export function TopBar() {
  const track = usePlayer((s) => (s.index >= 0 ? s.queue[s.index] : null));
  const playing = usePlayer((s) => s.playing);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const volume = usePlayer((s) => s.volume);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const seek = usePlayer((s) => s.seek);
  const setVolume = usePlayer((s) => s.setVolume);
  const openNowPlaying = usePlayer((s) => s.openNowPlaying);

  return (
    <header className="chrome relative z-20 flex min-h-16 items-center gap-3 border-b border-white/10 px-3 pb-1 pt-[env(safe-area-inset-top)] sm:gap-4 sm:px-4">
      {/* Transport cluster (left) — hidden on mobile */}
      <div className="hidden items-center gap-5 text-white/90 md:flex">
        <button onClick={() => prev()} className="text-white/80 hover:text-white" title="Previous">
          <Prev width={22} height={22} />
        </button>
        <button
          onClick={togglePlay}
          disabled={!track}
          className="text-white hover:text-white disabled:opacity-30"
          title={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause width={26} height={26} /> : <Play width={26} height={26} />}
        </button>
        <button onClick={() => next()} className="text-white/80 hover:text-white" title="Next">
          <Next width={22} height={22} />
        </button>
        <div className="ml-1 flex items-center gap-2 text-white/50">
          <VolumeIcon width={16} height={16} />
          <Slider value={volume} max={1} onChange={setVolume} className="w-24" accent="bg-white/70" />
        </div>
      </div>

      {/* Centered LCD display */}
      <div className="relative min-w-0 flex-1 md:pointer-events-none md:absolute md:left-1/2 md:top-1/2 md:flex-none md:-translate-x-1/2 md:-translate-y-1/2 md:w-[min(40vw,460px)]">
        {track ? (
          <button
            onClick={() => openNowPlaying(true)}
            className="glass glass-sheen pointer-events-auto flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3 py-1.5 text-left transition hover:brightness-110"
            title="Open Now Playing"
          >
            <AlbumArt url={track.artUrl} alt={track.album} rounded="rounded" className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-center gap-1.5">
                <span className="truncate text-[13px] font-medium leading-tight">{track.title}</span>
                <LosslessBadge track={track} />
              </div>
              <div className="truncate text-center text-[11px] text-white/50">{track.artist}</div>
              {/* inline scrubber under the text, Apple-style */}
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="w-7 text-right text-[9px] tabular-nums text-white/40">
                  {formatDuration(position)}
                </span>
                <Slider value={position} max={duration} onChange={seek} className="flex-1" accent="bg-white/60" />
                <span className="w-7 text-[9px] tabular-nums text-white/40">
                  -{formatDuration(Math.max(0, duration - position))}
                </span>
              </div>
            </div>
            <Chevron width={14} height={14} className="shrink-0 text-white/30" />
          </button>
        ) : (
          <div className="glass flex h-12 items-center justify-center rounded-2xl text-xs text-white/40">
            MusicLauncher
          </div>
        )}
      </div>

      <div className="ml-auto">
        <AccountButton />
      </div>
    </header>
  );
}
