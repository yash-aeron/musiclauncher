import { useMemo, useState } from "react";
import { usePlayer } from "../store/player";
import { AlbumArt } from "../components/AlbumArt";
import { TrackMenu } from "../components/TrackMenu";
import { Play, Shuffle, Chevron, Close, PlusIcon, PlaylistIcon, TrashIcon, Pencil } from "../components/Icons";
import { trackKey } from "../lib/albums";
import { formatDuration } from "../lib/format";
import type { Playlist, Track } from "../types";

/** Resolve a playlist's metadata keys against the local library. */
function resolveTracks(playlist: Playlist, library: Track[]): Track[] {
  const byKey = new Map(library.map((t) => [trackKey(t), t]));
  return playlist.trackKeys.map((k) => byKey.get(k)).filter((t): t is Track => Boolean(t));
}

export function PlaylistsPage() {
  const playlists = usePlayer((s) => s.playlists);
  const library = usePlayer((s) => s.library);
  const selectedPlaylistId = usePlayer((s) => s.selectedPlaylistId);
  const openPlaylist = usePlayer((s) => s.openPlaylist);
  const createPlaylist = usePlayer((s) => s.createPlaylist);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const selected = playlists.find((p) => p.id === selectedPlaylistId);
  if (selected) return <PlaylistDetail playlist={selected} />;

  return (
    <div className="flex h-full flex-col px-4 pt-4 md:px-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Playlists</h2>
        {creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createPlaylist(name);
              setCreating(false);
              setName("");
            }}
            className="flex gap-2"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => !name && setCreating(false)}
              placeholder="Playlist name"
              className="min-w-0 rounded-full bg-white/8 px-4 py-2 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-[color:var(--accent)]"
            />
            <button type="submit" className="btn-accent rounded-full px-4 py-2 text-sm font-semibold">
              Create
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="btn-accent flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
          >
            <PlusIcon width={15} height={15} />
            New Playlist
          </button>
        )}
      </header>

      {playlists.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <PlaylistIcon width={40} height={40} className="text-white/25" />
          <div className="text-lg font-medium text-white/70">No playlists yet</div>
          <p className="max-w-sm text-sm text-white/45">
            Create one here, or use “Add to Playlist” on any song. Playlists sync
            across your devices when you're signed in.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 overflow-y-auto pb-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {playlists.map((p) => {
            const tracks = resolveTracks(p, library);
            const art = tracks.find((t) => t.artUrl)?.artUrl;
            return (
              <button
                key={p.id}
                onClick={() => openPlaylist(p.id)}
                className="group rounded-2xl p-3 text-left transition hover:bg-white/6"
              >
                <AlbumArt
                  url={art}
                  alt={p.name}
                  rounded="rounded-xl"
                  className="mb-3 aspect-square w-full shadow-lg shadow-black/40"
                />
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-white/45">
                  {p.trackKeys.length} song{p.trackKeys.length === 1 ? "" : "s"}
                  {tracks.length < p.trackKeys.length ? ` · ${tracks.length} on this device` : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlaylistDetail({ playlist }: { playlist: Playlist }) {
  const library = usePlayer((s) => s.library);
  const openPlaylist = usePlayer((s) => s.openPlaylist);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const removeTrackFromPlaylist = usePlayer((s) => s.removeTrackFromPlaylist);
  const renamePlaylist = usePlayer((s) => s.renamePlaylist);
  const deletePlaylist = usePlayer((s) => s.deletePlaylist);
  const currentId = usePlayer((s) => (s.index >= 0 ? s.queue[s.index]?.id : null));
  const setToast = usePlayer((s) => s.setToast);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(playlist.name);

  const tracks = useMemo(() => resolveTracks(playlist, library), [playlist, library]);
  const missing = playlist.trackKeys.length - tracks.length;
  const totalSec = tracks.reduce((s, t) => s + t.durationSec, 0);

  const playAll = () => {
    if (tracks.length === 0) return;
    if (usePlayer.getState().shuffle) toggleShuffle();
    playQueue(tracks, 0);
  };
  const shuffleAll = () => {
    if (tracks.length === 0) return;
    if (!usePlayer.getState().shuffle) toggleShuffle();
    playQueue(tracks, 0);
  };

  return (
    <div className="px-4 pb-10 pt-4 md:px-8">
      <button
        onClick={() => openPlaylist(null)}
        className="mb-6 flex items-center gap-1 text-[13px] font-medium text-[color:var(--accent)] hover:opacity-80"
      >
        <Chevron width={16} height={16} className="rotate-180" />
        Playlists
      </button>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6">
        <AlbumArt
          url={tracks.find((t) => t.artUrl)?.artUrl}
          alt={playlist.name}
          rounded="rounded-lg"
          className="h-[min(52vw,13rem)] w-[min(52vw,13rem)] shrink-0 shadow-xl shadow-black/50 ring-1 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          {renaming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                renamePlaylist(playlist.id, name);
                setRenaming(false);
              }}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 flex-1 rounded-xl bg-white/8 px-3 py-2 text-2xl font-bold tracking-tight outline-none ring-1 ring-white/10 focus:ring-[color:var(--accent)]"
              />
              <button type="submit" className="btn-accent rounded-full px-4 py-2 text-sm font-semibold">
                Save
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="truncate text-3xl font-bold tracking-tight">{playlist.name}</h1>
              <button
                onClick={() => {
                  setName(playlist.name);
                  setRenaming(true);
                }}
                className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
                title="Rename playlist"
              >
                <Pencil width={15} height={15} />
              </button>
            </div>
          )}
          <div className="mt-1 text-[13px] uppercase tracking-wide text-white/40">
            {tracks.length} songs · {formatDuration(totalSec)}
            {missing > 0 ? ` · ${missing} not on this device` : ""}
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
                deletePlaylist(playlist.id);
                setToast(`Deleted “${playlist.name}”.`);
              }}
              className="pill-control px-4 py-2.5 text-[15px] text-red-300 hover:text-red-200"
              title="Delete playlist"
            >
              <TrashIcon width={17} height={17} />
            </button>
          </div>
        </div>
      </div>

      {tracks.length === 0 ? (
        <p className="mt-10 text-sm text-white/40">
          {missing > 0
            ? "None of this playlist's songs are on this device yet — import them to play here."
            : "This playlist is empty — use “Add to Playlist” on any song."}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-white/6">
          {tracks.map((t, i) => {
            const isCurrent = t.id === currentId;
            return (
              <li key={t.id} className="group row-hover flex items-center gap-3 rounded-md px-3 py-2.5">
                <button
                  onClick={() => playQueue(tracks, i)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <AlbumArt url={t.artUrl} alt={t.album} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-[14px] ${
                        isCurrent ? "font-semibold text-[color:var(--accent)]" : "text-white"
                      }`}
                    >
                      {t.title}
                    </div>
                    <div className="truncate text-xs text-white/50">{t.artist}</div>
                  </div>
                </button>
                <TrackMenu track={t} />
                <button
                  onClick={() => removeTrackFromPlaylist(playlist.id, trackKey(t))}
                  className="rounded-full p-2 text-white/35 transition hover:bg-white/10 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                  title="Remove from playlist"
                >
                  <Close width={15} height={15} />
                </button>
                <span className="w-12 text-right text-[13px] tabular-nums text-white/40">
                  {formatDuration(t.durationSec)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
