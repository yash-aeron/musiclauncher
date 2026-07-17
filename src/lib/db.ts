import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PlayEvent, Playlist, Track } from "../types";

interface MusicDB extends DBSchema {
  tracks: {
    key: string;
    value: Track;
  };
  handles: {
    key: string;
    // FileSystemFileHandle (structured-clonable); typed loosely for portability.
    value: { id: string; handle: FileSystemFileHandle };
  };
  blobs: {
    key: string;
    // The actual audio bytes — imported songs live here so the library
    // survives reloads without re-picking files.
    value: { id: string; blob: Blob };
  };
  playEvents: {
    key: string;
    value: PlayEvent;
    indexes: { "by-at": number };
  };
  playlists: {
    key: string;
    value: Playlist;
  };
}

let dbPromise: Promise<IDBPDatabase<MusicDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<MusicDB>("musiclauncher", 3, {
      upgrade(d) {
        if (!d.objectStoreNames.contains("tracks")) d.createObjectStore("tracks", { keyPath: "id" });
        if (!d.objectStoreNames.contains("handles")) d.createObjectStore("handles", { keyPath: "id" });
        if (!d.objectStoreNames.contains("blobs")) d.createObjectStore("blobs", { keyPath: "id" });
        if (!d.objectStoreNames.contains("playlists")) d.createObjectStore("playlists", { keyPath: "id" });
        if (!d.objectStoreNames.contains("playEvents")) {
          const pe = d.createObjectStore("playEvents", { keyPath: "id" });
          pe.createIndex("by-at", "at");
        }
      },
    });
  }
  return dbPromise;
}

export async function saveTracks(tracks: Track[]): Promise<void> {
  const d = await db();
  const tx = d.transaction("tracks", "readwrite");
  await Promise.all(tracks.map((t) => tx.store.put(t)));
  await tx.done;
}

export async function getAllTracks(): Promise<Track[]> {
  const d = await db();
  return d.getAll("tracks");
}

export async function clearLibrary(): Promise<void> {
  const d = await db();
  // Also clear play events so Wrapped stats don't reference deleted tracks (#20).
  await Promise.all([d.clear("tracks"), d.clear("handles"), d.clear("blobs"), d.clear("playEvents")]);
}

export async function saveHandle(id: string, handle: FileSystemFileHandle): Promise<void> {
  const d = await db();
  await d.put("handles", { id, handle });
}

export async function getHandle(id: string): Promise<FileSystemFileHandle | undefined> {
  const d = await db();
  const row = await d.get("handles", id);
  return row?.handle;
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  const d = await db();
  await d.put("blobs", { id, blob });
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const d = await db();
  const row = await d.get("blobs", id);
  return row?.blob;
}

/** Delete a track and its associated storage (blob or file handle) (#24). */
export async function deleteTrack(id: string, source: { kind: string; blobId?: string; handleId?: string }): Promise<void> {
  const d = await db();
  await d.delete("tracks", id);
  if (source.kind === "blob" && source.blobId) await d.delete("blobs", source.blobId);
  if (source.kind === "file-handle" && source.handleId) await d.delete("handles", source.handleId);
}

export async function addPlayEvent(ev: PlayEvent): Promise<void> {
  const d = await db();
  await d.put("playEvents", ev);
}

/** Update the real listened-seconds of an already-recorded play event. */
export async function updatePlayEventSeconds(id: string, secondsPlayed: number): Promise<PlayEvent | undefined> {
  const d = await db();
  const ev = await d.get("playEvents", id);
  if (!ev) return undefined;
  ev.secondsPlayed = secondsPlayed;
  await d.put("playEvents", ev);
  return ev;
}

export async function getAllPlayEvents(): Promise<PlayEvent[]> {
  const d = await db();
  return d.getAll("playEvents");
}

export async function savePlaylist(p: Playlist): Promise<void> {
  const d = await db();
  await d.put("playlists", p);
}

export async function deletePlaylist(id: string): Promise<void> {
  const d = await db();
  await d.delete("playlists", id);
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  const d = await db();
  return d.getAll("playlists");
}
