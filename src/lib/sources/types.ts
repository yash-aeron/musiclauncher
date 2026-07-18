import type { Track } from "../../types";

/**
 * An online music source, modelled on Echo's extension "Client" interfaces.
 * Search returns lightweight Tracks whose `source` is an unresolved stream
 * handle ({ kind:"stream", ... }); the playable URL is produced lazily by
 * `resolveStream` only when playback actually starts. This two-phase shape
 * keeps expiring/streamed URLs out of persisted library state.
 */
export interface SourceExtension {
  /** Stable id stored in Track.source.provider (e.g. "audius"). */
  readonly id: string;
  /** Human-readable name for the UI. */
  readonly name: string;
  /** Search the catalog; returns Tracks ready to queue. */
  search(query: string): Promise<Track[]>;
  /** Resolve a stream handle into a URL usable as `<audio src>`. */
  resolveStream(streamId: string): Promise<string>;
  /**
   * Optional: download the audio bytes for offline storage. Returns the Blob
   * plus the concrete codec/extension so the caller can persist it as a local
   * track. Sources that can't be downloaded omit this.
   */
  download?(streamId: string): Promise<{ blob: Blob; codec: string }>;
}
