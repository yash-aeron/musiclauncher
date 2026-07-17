import { useState } from "react";
import { usePlayer } from "../store/player";
import { LibraryGrid } from "../components/LibraryGrid";
import { TrackList } from "../components/TrackList";
import { ArtistsView } from "../components/ArtistsView";
import { AlbumDetail } from "./AlbumDetail";
import { pickFolder, pickFiles, supportsFolderImport } from "../lib/fileImport";
import { saveTracks } from "../lib/db";
import { loadDemoTracks } from "../lib/demo";
import type { Track } from "../types";

const TITLES: Record<string, string> = {
  albums: "Albums",
  songs: "Songs",
  artists: "Artists",
};

export function LibraryPage() {
  const library = usePlayer((s) => s.library);
  const view = usePlayer((s) => s.view);
  const selectedAlbumKey = usePlayer((s) => s.selectedAlbumKey);
  const addToLibrary = usePlayer((s) => s.addToLibrary);
  const setToast = usePlayer((s) => s.setToast);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function ingest(tracks: Track[]) {
    if (tracks.length === 0) {
      setToast("No supported audio files found.");
      return;
    }
    await saveTracks(tracks);
    addToLibrary(tracks);
    setToast(`Added ${tracks.length} track${tracks.length === 1 ? "" : "s"} to your library.`);
  }

  async function onImportFolder() {
    try {
      setBusy("Reading folder…");
      const tracks = await pickFolder((done, total) => setBusy(`Reading… ${done}/${total}`));
      await ingest(tracks);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setToast((e as Error)?.message || "Import failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onImportFiles() {
    try {
      setBusy("Reading files…");
      const tracks = await pickFiles((done, total) => setBusy(`Reading… ${done}/${total}`));
      await ingest(tracks);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setToast((e as Error)?.message || "Import failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onDemo() {
    setBusy("Loading demo tracks…");
    const tracks = await loadDemoTracks();
    await ingest(tracks);
    setBusy(null);
  }

  // Album detail takes over the whole surface when an album is open.
  if (selectedAlbumKey) {
    return (
      <div className="h-full overflow-y-auto">
        <AlbumDetail tracks={library} albumKey={selectedAlbumKey} />
      </div>
    );
  }

  const empty = library.length === 0;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? library.filter((t) =>
        [t.title, t.artist, t.album].some((f) => f.toLowerCase().includes(q))
      )
    : library;

  return (
    <div className="flex h-full flex-col px-4 pb-2 pt-4 md:px-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{TITLES[view] ?? "Library"}</h2>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          {busy ? <span className="text-sm text-white/60">{busy}</span> : null}
          {!empty ? (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search library"
              className="glass w-full rounded-full px-4 py-2 text-sm text-white placeholder-white/40 outline-none sm:w-48"
            />
          ) : null}
          {supportsFolderImport ? (
            <button
              onClick={onImportFolder}
              disabled={!!busy}
              className="btn-accent w-full rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 sm:w-auto"
            >
              Import folder
            </button>
          ) : (
            <button
              onClick={onImportFiles}
              disabled={!!busy}
              className="btn-accent w-full rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 sm:w-auto"
            >
              Import files
            </button>
          )}
        </div>
      </header>

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="text-lg font-medium text-white/70">Your library is empty</div>
          <p className="max-w-sm text-sm text-white/45">
            Import a folder of local audio. FLAC and WAV play in true lossless with a Hi-Res badge.
            No music handy? Try the demo tracks.
          </p>
          <div className="flex gap-3">
            <button
              onClick={supportsFolderImport ? onImportFolder : onImportFiles}
              className="btn-accent rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              {supportsFolderImport ? "Import folder" : "Import files"}
            </button>
            <button
              onClick={onDemo}
              className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/15"
            >
              Load demo tracks
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pb-6 pr-1">
          {q && filtered.length === 0 ? (
            <p className="pt-10 text-center text-sm text-white/45">No matches for “{query}”.</p>
          ) : view === "songs" ? (
            <TrackList tracks={filtered} />
          ) : view === "artists" ? (
            <ArtistsView tracks={filtered} />
          ) : (
            <LibraryGrid tracks={filtered} />
          )}
        </div>
      )}
    </div>
  );
}
