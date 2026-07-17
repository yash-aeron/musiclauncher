import { useMemo } from "react";
import { usePlayer } from "../store/player";
import { AlbumArt } from "../components/AlbumArt";
import { LosslessBadge } from "../components/LosslessBadge";
import { TrackMenu } from "../components/TrackMenu";
import { Play, Shuffle, Chevron, TrashIcon } from "../components/Icons";
import { groupAlbums } from "../lib/albums";
import { formatDuration, qualityLabel } from "../lib/format";
import type { Track } from "../types";

export function AlbumDetail({ tracks, albumKey }: { tracks: Track[]; albumKey: string }) {
  const openAlbum = usePlayer((s) => s.openAlbum);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const currentId = usePlayer((s) => (s.index >= 0 ? s.queue[s.index]?.id : null));

  const album = useMemo(
    () => groupAlbums(tracks).find((a) => a.key === albumKey),
    [tracks, albumKey],
  );

  if (!album) {
    return (
      <div className="p-4 text-white/50 md:p-8">
        Album not found.{" "}
        <button className="text-[color:var(--accent)]" onClick={() => openAlbum(null)}>
          Back
        </button>
      </div>
    );
  }

  const totalSec = album.tracks.reduce((s, t) => s + t.durationSec, 0);
  const best = album.tracks[0];

  const playAll = () => {
    if (usePlayer.getState().shuffle) toggleShuffle();
    playQueue(album.tracks, 0);
  };
  const shuffleAll = () => {
    if (!usePlayer.getState().shuffle) toggleShuffle();
    playQueue(album.tracks, 0);
  };

  return (
    <div className="px-4 pb-10 pt-4 md:px-8">
      <button
        onClick={() => openAlbum(null)}
        className="mb-6 flex items-center gap-1 text-[13px] font-medium text-[color:var(--accent)] hover:opacity-80"
      >
        <Chevron width={16} height={16} className="rotate-180" />
        Albums
      </button>

      {/* Header: cover + meta */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6">
        <AlbumArt
          url={album.artUrl}
          alt={album.title}
          rounded="rounded-lg"
          className="h-[min(52vw,13rem)] w-[min(52vw,13rem)] shrink-0 shadow-xl shadow-black/50 ring-1 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl font-bold tracking-tight">{album.title}</h1>
          <div className="mt-1 text-lg font-semibold text-[color:var(--accent)]">{album.artist}</div>
          <div className="mt-1 flex items-center gap-2 text-[13px] uppercase tracking-wide text-white/40">
            {best.genre ? <span>{best.genre}</span> : null}
            {album.year ? <span>· {album.year}</span> : null}
            {qualityLabel(best.sampleRate, best.bitDepth) ? (
              <span>· {qualityLabel(best.sampleRate, best.bitDepth)}</span>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button onClick={playAll} className="pill-control px-5 py-2.5 text-[15px]">
              <Play width={18} height={18} />
              Play
            </button>
            <button onClick={shuffleAll} className="pill-control px-5 py-2.5 text-[15px]">
              <Shuffle width={18} height={18} />
              Shuffle
            </button>
            <button
              onClick={() => {
                if (confirm(`Remove the album “${album.title}” from your library?`)) {
                  usePlayer.getState().deleteTracks(album.tracks.map((t) => t.id));
                  openAlbum(null);
                  usePlayer.getState().setToast(`Removed album “${album.title}”.`);
                }
              }}
              className="pill-control px-5 py-2.5 text-[15px] opacity-70 hover:bg-white/20 hover:text-red-400 transition"
              title="Remove Album"
            >
              <TrashIcon width={16} height={16} />
              Remove
            </button>
          </div>
        </div>
      </div>

      {/* Track list */}
      <ul className="mt-8 divide-y divide-white/6">
        {album.tracks.map((t, i) => {
          const isCurrent = t.id === currentId;
          return (
            <li key={t.id} className="group row-hover flex items-center gap-4 rounded-md px-3 py-2.5">
              <button
                onClick={() => playQueue(album.tracks, i)}
                className="flex min-w-0 flex-1 items-center gap-4 text-left"
              >
                <span
                  className={`w-6 text-right text-[13px] tabular-nums ${
                    isCurrent ? "text-[color:var(--accent)]" : "text-white/40"
                  }`}
                >
                  {t.trackNo ?? i + 1}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-[14px] ${
                    isCurrent ? "font-semibold text-[color:var(--accent)]" : "text-white"
                  }`}
                >
                  {t.title}
                </span>
                <LosslessBadge track={t} />
              </button>
              <TrackMenu track={t} />
              <span className="w-12 text-right text-[13px] tabular-nums text-white/40">
                {formatDuration(t.durationSec)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 px-3 text-[12px] text-white/35">
        {album.tracks.length} songs · {formatDuration(totalSec)}
      </div>
    </div>
  );
}
