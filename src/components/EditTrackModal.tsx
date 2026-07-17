import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePlayer } from "../store/player";
import { AlbumArt } from "./AlbumArt";
import { Close } from "./Icons";
import { getPlatform } from "../platform";

export function EditTrackModal() {
  const id = usePlayer((s) => s.editingTrackId);
  const track = usePlayer((s) => s.library.find((t) => t.id === s.editingTrackId) ?? null);
  const close = usePlayer((s) => s.openEditTrack);
  const updateTrack = usePlayer((s) => s.updateTrack);
  const setToast = usePlayer((s) => s.setToast);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [art, setArt] = useState<string | undefined>(undefined);

  // Seed the form whenever a new track is opened.
  useEffect(() => {
    if (track) {
      setTitle(track.title);
      setArtist(track.artist);
      setAlbum(track.album);
      setArt(track.artUrl);
    }
  }, [track?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => {
    if (!track) return false;
    return (
      title.trim() !== track.title ||
      artist.trim() !== track.artist ||
      album.trim() !== track.album ||
      art !== track.artUrl
    );
  }, [track, title, artist, album, art]);

  async function onPickCover() {
    try {
      const dataUrl = await getPlatform().pickImage();
      if (dataUrl) setArt(dataUrl);
    } catch {
      setToast("Could not read that image.");
    }
  }

  function onSave() {
    if (!id) return;
    updateTrack(id, {
      title: title.trim() || "Untitled",
      artist: artist.trim() || "Unknown Artist",
      album: album.trim() || "Unknown Album",
      artUrl: art,
    });
    setToast("Saved.");
    close(null);
  }

  return (
    <AnimatePresence>
      {id && track ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => close(null)} />

          <motion.div
            className="glass relative z-10 w-full max-w-md rounded-2xl p-6"
            initial={{ scale: 0.94, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Edit Song</h2>
              <button
                onClick={() => close(null)}
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                title="Close"
              >
                <Close width={18} height={18} />
              </button>
            </div>

            <div className="flex gap-4">
              {/* Cover picker */}
              <button
                onClick={onPickCover}
                className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/15"
                title="Change cover"
              >
                <AlbumArt url={art} alt={title} rounded="rounded-lg" className="h-28 w-28" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                  Change cover
                </div>
              </button>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <Field label="Title" value={title} onChange={setTitle} />
                <Field label="Artist" value={artist} onChange={setArtist} />
                <Field label="Album" value={album} onChange={setAlbum} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => close(null)}
                className="rounded-full px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={!dirty}
                className="btn-accent rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/12 bg-black/25 px-3 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[color:var(--accent)]"
      />
    </label>
  );
}
