import type { LyricLine } from "../types";

/**
 * Fetch timed (or plain) lyrics from LRCLIB — a free, key-less, CORS-open
 * lyrics database. Used to give streamed tracks (YouTube, Audius) lyrics they
 * don't ship with. Returns synced LyricLines when a timed .lrc is available,
 * falling back to plain lines, or null if nothing matches.
 */

function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const timeTags = [...raw.matchAll(/\[(\d+):(\d+)(?:\.(\d+))?\]/g)];
    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    if (!timeTags.length) continue;
    for (const m of timeTags) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const frac = m[3] ? parseInt(m[3].padEnd(3, "0").slice(0, 3), 10) / 1000 : 0;
      out.push({ text, timestamp: min * 60 + sec + frac });
    }
  }
  return out.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}

interface LrcLibResult {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
}

/**
 * Look up lyrics for a track. Tries the exact signature endpoint first (needs a
 * duration), then falls back to a fuzzy search. Returns null on any miss/error
 * so callers can quietly skip.
 */
export async function fetchLyrics(
  title: string,
  artist: string,
  album?: string,
  durationSec?: number,
): Promise<LyricLine[] | null> {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const t = clean(title)
    .replace(/\s*[([].*(official|lyric|video|audio|visualizer).*?[)\]]/i, "")
    .trim();
  const a = clean(artist)
    .replace(/\s*-\s*Topic$/i, "")
    .trim();
  if (!t || !a) return null;

  try {
    // Exact match (best for synced lyrics).
    if (durationSec && durationSec > 0) {
      const params = new URLSearchParams({
        track_name: t,
        artist_name: a,
        duration: String(Math.round(durationSec)),
      });
      if (album) params.set("album_name", clean(album));
      const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
      if (res.ok) {
        const j = (await res.json()) as LrcLibResult;
        const lines = toLines(j);
        if (lines) return lines;
      }
    }
    // Fuzzy search fallback.
    const sp = new URLSearchParams({ track_name: t, artist_name: a });
    const res = await fetch(`https://lrclib.net/api/search?${sp.toString()}`);
    if (!res.ok) return null;
    const arr = (await res.json()) as LrcLibResult[];
    for (const item of arr) {
      const lines = toLines(item);
      if (lines) return lines;
    }
  } catch {
    // Offline or blocked — no lyrics, no error.
  }
  return null;
}

function toLines(r: LrcLibResult): LyricLine[] | null {
  if (r.syncedLyrics) {
    const parsed = parseLrc(r.syncedLyrics);
    if (parsed.length) return parsed;
  }
  if (r.plainLyrics) {
    const lines = r.plainLyrics
      .split(/\r?\n/)
      .map((text) => ({ text: text.trim() }))
      .filter((l) => l.text);
    if (lines.length) return lines;
  }
  return null;
}
