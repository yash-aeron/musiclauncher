import type { Track, TrackSource } from "../types";

export type ProgressFn = (done: number, total: number) => void;

/**
 * Everything that differs between running MusicLauncher as a plain browser
 * page vs. a native Tauri shell (Windows desktop, Android) lives behind this
 * interface. Callers (fileImport.ts, resolveSource.ts, EditTrackModal.tsx)
 * never touch `window.showDirectoryPicker`, `@tauri-apps/*`, etc. directly.
 */
export interface PlatformAdapter {
  readonly kind: "web" | "tauri";
  /** Whether "pick a whole folder at once" is available here (vs. multi-file only). */
  readonly supportsFolderImport: boolean;

  /** Let the user pick a folder of music; returns parsed Tracks. */
  pickFolder(onProgress?: ProgressFn): Promise<Track[]>;

  /** Let the user pick one or more audio files; returns parsed Tracks. */
  pickFiles(onProgress?: ProgressFn): Promise<Track[]>;

  /** Resolve a Track's source into a URL usable as `<audio src>`. */
  playableUrl(source: TrackSource): Promise<string>;

  /** Let the user pick a cover image; returns a persistable data URL, or undefined if cancelled. */
  pickImage(): Promise<string | undefined>;
}
