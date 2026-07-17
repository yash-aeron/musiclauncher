import { usePlayer } from "../store/player";
import { AlbumArt } from "./AlbumArt";
import { LosslessBadge } from "./LosslessBadge";
import { TrackMenu } from "./TrackMenu";
import { Play, Pause } from "./Icons";
import { formatDuration } from "../lib/format";
import type { Track } from "../types";

export function TrackList({ tracks }: { tracks: Track[] }) {
  const currentId = usePlayer((s) => (s.index >= 0 ? s.queue[s.index]?.id : null));
  const playing = usePlayer((s) => s.playing);
  const playQueue = usePlayer((s) => s.playQueue);
  const togglePlay = usePlayer((s) => s.togglePlay);

  return (
    <div className="flex flex-col">
      {tracks.map((t, i) => {
        const isCurrent = t.id === currentId;
        return (
          <div key={t.id} className="row-hover group flex items-center gap-3 rounded-xl px-3 py-2">
            <button
              onClick={() => (isCurrent ? togglePlay() : playQueue(tracks, i))}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <div className="relative h-11 w-11 shrink-0">
                <AlbumArt url={t.artUrl} alt={t.album} className="h-11 w-11" />
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-xl bg-black/45 transition-opacity ${
                    isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {isCurrent && playing ? <Pause width={18} height={18} /> : <Play width={18} height={18} />}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`truncate text-sm font-medium ${
                      isCurrent ? "text-[color:var(--accent-strong)]" : "text-white"
                    }`}
                  >
                    {t.title}
                  </span>
                  <LosslessBadge track={t} />
                </div>
                <div className="truncate text-xs text-white/50">{t.artist}</div>
              </div>
            </button>

            <div className="hidden truncate text-xs text-white/40 sm:block sm:w-40">{t.album}</div>
            <TrackMenu track={t} />
            <div className="w-12 text-right text-xs tabular-nums text-white/40">
              {formatDuration(t.durationSec)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
