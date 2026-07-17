import type { Album, Track } from "../types";

export function albumKey(t: Track): string {
  return `${t.album}::${t.artist}`;
}

/**
 * Stable per-song key used by playlists and cross-device sync. Uses metadata
 * (not the device-local track id) so the same song imported on two devices
 * resolves to the same key.
 */
export function trackKey(t: Track): string {
  return `${t.title}::${t.artist}::${t.album}`.toLowerCase();
}

/** Group a flat track list into albums, tracks ordered by track number. */
export function groupAlbums(tracks: Track[]): Album[] {
  const map = new Map<string, Album>();
  for (const t of tracks) {
    const key = albumKey(t);
    let a = map.get(key);
    if (!a) {
      a = { key, title: t.album, artist: t.artist, artUrl: t.artUrl, year: t.year, tracks: [] };
      map.set(key, a);
    }
    if (!a.artUrl && t.artUrl) a.artUrl = t.artUrl;
    if (!a.year && t.year) a.year = t.year;
    a.tracks.push(t);
  }
  for (const a of map.values()) {
    a.tracks.sort((x, y) => (x.trackNo ?? 1e9) - (y.trackNo ?? 1e9));
  }
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export function bestTierTrack(tracks: Track[]): Track | undefined {
  return (
    tracks.find((t) => t.tier === "hi-res") ||
    tracks.find((t) => t.tier === "lossless")
  );
}
