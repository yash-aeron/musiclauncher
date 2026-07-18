import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../store/player";
import { TrackList } from "../components/TrackList";
import { sourceList, getSource } from "../lib/sources";
import { SearchIcon, DownloadIcon } from "../components/Icons";
import { saveTracks, saveBlob } from "../lib/db";
import type { Track } from "../types";

export function SearchPage() {
  const [sourceId, setSourceId] = useState(sourceList[0].id);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const addToLibrary = usePlayer((s) => s.addToLibrary);
  const library = usePlayer((s) => s.library);
  const setToast = usePlayer((s) => s.setToast);
  const view = usePlayer((s) => s.view);
  const reqId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // The page stays mounted (hidden) across tab switches, so `autoFocus` only
  // fires once at app start while the page is invisible. Focus the input each
  // time the Search tab becomes active instead.
  useEffect(() => {
    if (view === "search") inputRef.current?.focus();
  }, [view]);

  const source = sourceList.find((s) => s.id === sourceId) ?? sourceList[0];

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setStatus("idle");
      setErrorMsg(null);
      return;
    }
    const id = ++reqId.current;
    setStatus("loading");
    const t = setTimeout(async () => {
      try {
        const found = await source.search(q);
        if (id !== reqId.current) return; // a newer query superseded this one
        setResults(found);
        setErrorMsg(null);
        setStatus("idle");
      } catch (e) {
        if (id !== reqId.current) return;
        setErrorMsg((e as Error)?.message ?? String(e));
        setStatus("error");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, sourceId]);

  // Track keys already in the library, so results can show an "Added" state.
  const savedIds = new Set(library.map((t) => t.id));
  // Only tracks saved as offline blobs count as downloaded — a track merely
  // *added* to the library is still a stream and can (and should) be
  // downloadable afterwards.
  const downloadedIds = new Set(
    library.filter((t) => t.source.kind === "blob").map((t) => t.id),
  );

  async function addResult(track: Track) {
    if (savedIds.has(track.id)) return;
    await saveTracks([track]);
    addToLibrary([track]);
    setToast(`Added “${track.title}” to your library.`);
  }

  async function downloadResult(track: Track) {
    if (track.source.kind !== "stream") return;
    const src = getSource(track.source.provider);
    if (!src.download) {
      setToast("This source can't be downloaded.");
      return;
    }
    const streamId = track.source.streamId;
    setDownloading((prev) => new Set(prev).add(track.id));
    try {
      const { blob, codec } = await src.download(streamId);
      const blobId = `dl-${track.source.provider}-${streamId}`;
      await saveBlob(blobId, blob);
      // Persist as an offline, local track (blob source) so it plays without
      // re-resolving and survives reload.
      const offline: Track = {
        ...track,
        codec,
        source: { kind: "blob", blobId },
      };
      await saveTracks([offline]);
      addToLibrary([offline]);
      setToast(`Downloaded “${track.title}”.`);
    } catch (e) {
      // Tauri `invoke` rejects with a plain string (the Rust Err), not an
      // Error — stringify whatever we got so the toast shows the real cause
      // instead of a generic fallback.
      console.error("Download failed", e);
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "";
      setToast(msg || "Download failed.");
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }
  }

  const supportsDownload = !!getSource(source.id).download;

  const q = query.trim();

  return (
    <div className="flex h-full flex-col px-4 pb-2 pt-4 md:px-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Search</h2>
          <p className="mt-1 text-xs text-white/45">Streaming from {source.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {sourceList.length > 1 && (
            <div className="flex shrink-0 rounded-full bg-white/5 p-0.5 text-xs font-semibold">
              {sourceList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSourceId(s.id)}
                  className={`rounded-full px-3 py-1.5 transition ${
                    s.id === sourceId ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <div className="relative w-full sm:w-64">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              <SearchIcon width={16} height={16} />
            </span>
            <input
              type="search"
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${source.name}`}
              className="glass w-full rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder-white/40 outline-none"
            />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-6 pr-1">
        {status === "error" ? (
          <div className="pt-10 text-center">
            <p className="text-sm text-white/45">
              Couldn’t reach {source.name}. Check your connection and try again.
            </p>
            {errorMsg && (
              <p className="mx-auto mt-2 max-w-sm break-words text-xs text-white/25">{errorMsg}</p>
            )}
          </div>
        ) : status === "loading" ? (
          <p className="pt-10 text-center text-sm text-white/45">Searching…</p>
        ) : !q ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 pt-16 text-center">
            <span className="text-white/25">
              <SearchIcon width={40} height={40} />
            </span>
            <p className="max-w-sm text-sm text-white/45">
              Search millions of full-length tracks on {source.name} and stream them instantly.
              Tap a result to play, or add it to your library.
            </p>
          </div>
        ) : results.length === 0 ? (
          <p className="pt-10 text-center text-sm text-white/45">No results for “{query}”.</p>
        ) : (
          <TrackList
            tracks={results}
            action={(track) => (
              <div className="flex shrink-0 items-center gap-1">
                {supportsDownload && (
                  <button
                    onClick={() => downloadResult(track)}
                    disabled={downloading.has(track.id) || downloadedIds.has(track.id)}
                    title={downloadedIds.has(track.id) ? "Downloaded" : "Download for offline"}
                    className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                  >
                    {downloading.has(track.id) ? (
                      <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />
                    ) : (
                      <DownloadIcon width={16} height={16} />
                    )}
                  </button>
                )}
                <button
                  onClick={() => addResult(track)}
                  disabled={savedIds.has(track.id)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  {savedIds.has(track.id) ? "Added" : "Add"}
                </button>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
