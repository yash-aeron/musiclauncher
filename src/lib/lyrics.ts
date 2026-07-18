import type { LyricLine } from "../types";

/**
 * Fetch timed (or plain) lyrics from LRCLIB — a free, key-less, CORS-open
 * lyrics database. Used to give streamed tracks (YouTube, Audius) lyrics they
 * don't ship with. Returns synced LyricLines when a timed .lrc is available,
 * falling back to plain lines, or null if nothing matches.
 *
 * Streamed metadata is messy — a YouTube "artist" is really the channel name
 * and the actual artist usually lives in the title ("Artist - Song (Official
 * Video)"). So instead of one literal lookup we clean the strings, derive a few
 * candidate (title, artist) pairs, and walk them from most to least exact.
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
  duration?: number | null;
}

// "(Official Video)", "[4K Remaster]", "(Lyric Video)"… — decoration, not title.
const BRACKET_JUNK =
  /[([{][^)\]}]*(official|video|audio|lyrics?|visuali[sz]er|remaster(ed)?|explicit|hd|4k|8k|mv|m\/v|color coded|prod\.?)[^)\]}]*[)\]}]/gi;

function cleanTitle(s: string): string {
  return s
    .replace(BRACKET_JUNK, " ")
    .replace(/["“”]/g, "")
    .replace(/\s*\|.*$/, "") // "Song | Artist | Label" → "Song"
    .replace(/\s+/g, " ")
    .trim();
}

function cleanArtist(s: string): string {
  return s
    .replace(/\s*-\s*Topic$/i, "") // auto-generated YouTube music channels
    .replace(/VEVO$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Drop a trailing "ft./feat. X" — LRCLIB titles rarely include the feature. */
function stripFeat(s: string): string {
  return s.replace(/\s*[([]?\s*(ft\.?|feat\.?|featuring)\s[^)\]]*[)\]]?\s*$/i, "").trim();
}

interface Candidate {
  title: string;
  artist: string;
}

function candidates(rawTitle: string, rawArtist: string): Candidate[] {
  const t = cleanTitle(rawTitle);
  const a = cleanArtist(rawArtist);
  const out: Candidate[] = [];
  const push = (title: string, artist: string) => {
    title = title.trim();
    artist = artist.trim();
    if (!title || !artist) return;
    const dup = out.some(
      (c) => c.title.toLowerCase() === title.toLowerCase() && c.artist.toLowerCase() === artist.toLowerCase(),
    );
    if (!dup) out.push({ title, artist });
  };
  // "Artist - Song" videos: the artist is in the title, the channel is noise.
  const dash = t.split(/\s+[-–—:]\s+/);
  if (dash.length >= 2) {
    const [first, ...rest] = dash;
    push(stripFeat(rest.join(" ")), first);
    push(stripFeat(first), rest.join(" ")); // some channels flip it: "Song - Artist"
  }
  push(stripFeat(t), a); // literal title + channel/artist, as tagged
  return out;
}

/**
 * Look up lyrics for a track. Tries the exact signature endpoint first (needs a
 * duration), then per-candidate fuzzy search, then a free-text search. Returns
 * null on any miss/error so callers can quietly skip.
 */
export interface FetchLyricsResult {
  lines: LyricLine[];
  /** Duration reported by LRCLIB for the matched entry (seconds). */
  lrcDuration?: number;
}

export async function fetchLyrics(
  title: string,
  artist: string,
  album?: string,
  durationSec?: number,
): Promise<FetchLyricsResult | null> {
  const cands = candidates(title, artist);
  if (!cands.length) return null;
  const dur = durationSec && durationSec > 0 ? Math.round(durationSec) : undefined;
  // Streamed tracks carry a placeholder album ("YouTube"/"Audius") that is part
  // of the signature on the exact endpoint and forces a miss — never send it.
  const realAlbum = album && !/^(youtube|audius)$/i.test(album.trim()) ? album.replace(/\s+/g, " ").trim() : undefined;

  try {
    // Exact match (best odds of synced lyrics).
    if (dur) {
      for (const c of cands) {
        const params = new URLSearchParams({
          track_name: c.title,
          artist_name: c.artist,
          duration: String(dur),
        });
        if (realAlbum) params.set("album_name", realAlbum);
        const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
        if (res.ok) {
          const json = (await res.json()) as LrcLibResult;
          const lines = toLines(json);
          if (lines) return { lines, lrcDuration: json.duration ?? undefined };
        }
      }
    }
    // Fuzzy field search per candidate.
    for (const c of cands) {
      const found = await searchBest(new URLSearchParams({ track_name: c.title, artist_name: c.artist }), dur);
      if (found) return found;
    }
    // Last resort: free-text search over the best candidate.
    const c = cands[0];
    return await searchBest(new URLSearchParams({ q: `${c.artist} ${c.title}` }), dur);
  } catch {
    // Offline or blocked — no lyrics, no error.
  }
  return null;
}

/** Search LRCLIB, preferring synced lyrics whose duration matches the track. */
async function searchBest(sp: URLSearchParams, dur?: number): Promise<FetchLyricsResult | null> {
  const res = await fetch(`https://lrclib.net/api/search?${sp.toString()}`);
  if (!res.ok) return null;
  const arr = (await res.json()) as LrcLibResult[];
  if (!Array.isArray(arr) || !arr.length) return null;
  const close = (r: LrcLibResult) => dur == null || r.duration == null || Math.abs(r.duration - dur) <= 7;
  const passes = [
    arr.filter((r) => r.syncedLyrics && close(r)), // synced, right length
    arr.filter(close), // right length
    arr, // anything beats nothing
  ];
  for (const pass of passes) {
    for (const item of pass) {
      const lines = toLines(item);
      if (lines) return { lines, lrcDuration: item.duration ?? undefined };
    }
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
