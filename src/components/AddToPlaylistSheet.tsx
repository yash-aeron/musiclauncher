import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePlayer } from "../store/player";
import { trackKey } from "../lib/albums";
import { Close, PlusIcon, PlaylistIcon } from "./Icons";

/** Bottom sheet: pick an existing playlist (or create one) for a song. */
export function AddToPlaylistSheet() {
  const trackId = usePlayer((s) => s.addToPlaylistTrackId);
  const track = usePlayer((s) => s.library.find((t) => t.id === s.addToPlaylistTrackId) ?? null);
  const playlists = usePlayer((s) => s.playlists);
  const openAddToPlaylist = usePlayer((s) => s.openAddToPlaylist);
  const addTrackToPlaylist = usePlayer((s) => s.addTrackToPlaylist);
  const createPlaylist = usePlayer((s) => s.createPlaylist);
  const setToast = usePlayer((s) => s.setToast);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const close = () => {
    openAddToPlaylist(null);
    setCreating(false);
    setName("");
  };

  return (
    <AnimatePresence>
      {trackId && track ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            className="glass-strong relative w-full max-w-md rounded-t-2xl p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-2xl sm:rounded-2xl sm:pb-5"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-bold">Add to Playlist</h3>
                <p className="truncate text-xs text-white/45">{track.title} — {track.artist}</p>
              </div>
              <button onClick={close} className="text-white/50 hover:text-white">
                <Close width={20} height={20} />
              </button>
            </div>

            {creating ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const playlist = createPlaylist(name, track);
                  setToast(`Created “${playlist.name}”.`);
                  close();
                }}
                className="flex gap-2"
              >
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Playlist name"
                  className="min-w-0 flex-1 rounded-xl bg-white/8 px-4 py-2.5 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-[color:var(--accent)]"
                />
                <button type="submit" className="btn-accent rounded-xl px-4 py-2.5 text-sm font-semibold">
                  Create
                </button>
              </form>
            ) : (
              <div className="flex max-h-[45vh] flex-col gap-1 overflow-y-auto">
                <button
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[color:var(--accent-strong)] hover:bg-white/8"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8">
                    <PlusIcon width={16} height={16} />
                  </span>
                  New Playlist…
                </button>
                {playlists.map((p) => {
                  const has = p.trackKeys.includes(trackKey(track));
                  return (
                    <button
                      key={p.id}
                      disabled={has}
                      onClick={() => {
                        addTrackToPlaylist(p.id, track);
                        setToast(`Added to “${p.name}”.`);
                        close();
                      }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-white/8 disabled:opacity-40"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-white/50">
                        <PlaylistIcon width={16} height={16} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-white/35">
                        {has ? "Added" : `${p.trackKeys.length} songs`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
