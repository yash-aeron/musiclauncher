/** Audio file extension regex — shared across web and Tauri platforms (#35). */
export const AUDIO_EXT = /\.(flac|wav|wave|aiff?|alac|m4a|mp3|aac|ogg|opus|wv|ape)$/i;

export const AUDIO_EXTENSIONS = ["flac", "wav", "wave", "aif", "aiff", "alac", "m4a", "mp3", "aac", "ogg", "opus", "wv", "ape"];

/**
 * ponytail: simple LRU via Map insertion order. Evicts oldest entry and
 * revokes its object URL. Upgrade to a proper LRU class if profiles show
 * Map.delete + re-insert is a bottleneck (it won't be under 10k entries).
 */
export class ObjectUrlCache {
  private map = new Map<string, string>();
  constructor(private maxSize = 30) {}

  get(key: string): string | undefined {
    return this.map.get(key);
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
