export type LosslessTier = "hi-res" | "lossless" | "lossy";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** track number within the album, if tagged */
  trackNo?: number;
  year?: number;
  genre?: string;
  durationSec: number;
  /** e.g. "flac", "wav", "mp3", "m4a" */
  codec: string;
  sampleRate?: number; // Hz
  bitDepth?: number; // bits
  bitrate?: number; // bps
  tier: LosslessTier;
  /** Object URL or data URL for album art, if any. */
  artUrl?: string;
  /** Embedded or manually entered lyrics. Timestamp is seconds from track start. */
  lyrics?: LyricLine[];
  /** How we get the audio bytes back for playback. */
  source: TrackSource;
}

export interface LyricLine {
  text: string;
  timestamp?: number;
}

export type TrackSource =
  | { kind: "blob"; blobId: string } // audio bytes stored in the app's IndexedDB (web build)
  | { kind: "file-handle"; handleId: string } // legacy persisted FileSystemFileHandle (web build)
  | { kind: "object-url"; url: string } // in-memory (demo tracks)
  | { kind: "url"; url: string } // bundled/remote demo asset
  | { kind: "native"; ref: string } // Tauri: desktop absolute path or Android content URI
  | { kind: "stream"; provider: string; streamId: string }; // online source; URL re-resolved per play (expires)

export interface PlayEvent {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  album: string;
  /** epoch ms when the play was counted */
  at: number;
  /** seconds actually listened */
  secondsPlayed: number;
}

export type RepeatMode = "off" | "all" | "one";

export type ViewName = "songs" | "albums" | "artists" | "playlists" | "replay" | "search";

/**
 * A playlist references tracks by a stable content key (title|artist|album)
 * rather than by device-local track id, so playlists sync across devices and
 * resolve against whatever copy of the song each device has.
 */
export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  trackKeys: string[];
}

/** An album grouped from the flat track list. */
export interface Album {
  key: string;
  title: string;
  artist: string;
  artUrl?: string;
  year?: number;
  tracks: Track[];
}
