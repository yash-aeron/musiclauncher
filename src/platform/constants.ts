/** Audio file extension regex — shared across web and Tauri platforms (#35). */
export const AUDIO_EXT = /\.(flac|wav|wave|aiff?|alac|m4a|mp3|aac|ogg|opus|wv|ape)$/i;

export const AUDIO_EXTENSIONS = ["flac", "wav", "wave", "aif", "aiff", "alac", "m4a", "mp3", "aac", "ogg", "opus", "wv", "ape"];

/**
 * Thrown when an import read some files but not all. Carries the tracks that
 * did succeed so callers can still add them while telling the user how many
 * were skipped, instead of silently dropping failures.
 */
export class ImportPartialError extends Error {
  constructor(public readonly tracks: import("../types").Track[], public readonly failedCount: number) {
    super(`${failedCount} file${failedCount === 1 ? "" : "s"} couldn't be read`);
    this.name = "ImportPartialError";
  }
}

/**
 * ponytail: simple LRU via Map insertion order. Evicts oldest entry and
 * revokes its object URL. Upgrade to a proper LRU class if profiles show
 * Map.delete + re-insert is a bottleneck (it won't be under 10k entries).
 */
export class ObjectUrlCache {
  private map = new Map<string, string>();
  constructor(private maxSize = 30) {}

  get(key: string): string | undefined {
    const url = this.map.get(key);
    // Refresh recency: a cache hit is a "use", so move it to the newest
    // position. Without this the actively-playing URL drifts to the oldest slot
    // and gets revoked mid-song while <audio> still points at it.
    if (url !== undefined) {
      this.map.delete(key);
      this.map.set(key, url);
    }
    return url;
  }

  set(key: string, url: string) {
    if (this.map.has(key)) this.map.delete(key); // refresh position
    this.map.set(key, url);
    if (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value!;
      const oldUrl = this.map.get(oldest)!;
      this.map.delete(oldest);
      URL.revokeObjectURL(oldUrl);
    }
  }
}
