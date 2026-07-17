import { open } from "@tauri-apps/plugin-dialog";
import { readDir, readFile, type DirEntry } from "@tauri-apps/plugin-fs";
import { platform } from "@tauri-apps/plugin-os";
import { convertFileSrc } from "@tauri-apps/api/core";
import { basename } from "@tauri-apps/api/path";
import { saveBlob, getBlob } from "../lib/db";
import { trackFromBytes, bytesToDataUrl } from "../lib/metadata";
import type { Track, TrackSource } from "../types";
import type { PlatformAdapter, ProgressFn } from "./types";
import { AUDIO_EXT, AUDIO_EXTENSIONS, ObjectUrlCache } from "./constants";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "bmp"];

const isAndroid = () => platform() === "android";

const MIME_BY_EXT: Record<string, string> = {
  flac: "audio/flac", wav: "audio/wav", wave: "audio/wav", aif: "audio/aiff", aiff: "audio/aiff",
  m4a: "audio/mp4", alac: "audio/mp4", mp3: "audio/mpeg", aac: "audio/aac",
  ogg: "audio/ogg", opus: "audio/ogg", wv: "audio/x-wavpack", ape: "audio/x-ape",
};

function joinPath(dir: string, name: string): string {
  const sep = dir.includes("\\") && !dir.includes("/") ? "\\" : "/";
  return dir.endsWith("/") || dir.endsWith("\\") ? `${dir}${name}` : `${dir}${sep}${name}`;
}

/** Recursively collect audio file paths under an absolute directory (desktop only). */
async function collectAudioFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    const entries: DirEntry[] = await readDir(dir);
    for (const entry of entries) {
      const full = joinPath(dir, entry.name);
      if (entry.isDirectory) await walk(full);
      else if (entry.isFile && AUDIO_EXT.test(entry.name)) out.push(full);
    }
  }
  await walk(root);
  return out;
}

function fileNameFromRef(ref: string): string {
  // content:// URIs embed the real path percent-encoded (sometimes twice, e.g.
  // the Downloads provider's "document/raw%3A%2Fstorage%2F...%2Fsong.flac").
  // Decode until stable FIRST, then take the last path segment.
  let s = ref;
  try {
    for (let i = 0; i < 3 && /%[0-9a-fA-F]{2}/.test(s); i++) s = decodeURIComponent(s);
  } catch {
    // Malformed escape — use whatever we decoded so far.
  }
  const last = s.split(/[\\/]/).pop() || s;
  return last.includes(":") ? last.split(":").pop() || last : last;
}

async function fileNameOf(ref: string): Promise<string> {
  try {
    return await basename(ref);
  } catch {
    return fileNameFromRef(ref);
  }
}

/** Desktop: track references the file on disk; nothing is copied. */
async function trackFromPath(path: string): Promise<Track> {
  const bytes = await readFile(path);
  const source: TrackSource = { kind: "native", ref: path };
  return trackFromBytes(bytes, await fileNameOf(path), source);
}

/**
 * Android: SAF content-URI permissions don't survive an app restart, so the
 * audio is COPIED into IndexedDB (same as the web build). The library is then
 * fully self-contained — songs are still there on reopen.
 */
async function trackFromContentUri(uri: string, name: string, i: number): Promise<Track> {
  const bytes = await readFile(uri);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const blobId = `b-${Date.now().toString(36)}-${i}-${name.replace(/\W+/g, "").slice(0, 8)}`;
  // Copy into a fresh ArrayBuffer-backed blob (readFile may return a view).
  const copy = new Uint8Array(bytes);
  await saveBlob(blobId, new Blob([copy.buffer as ArrayBuffer], { type: MIME_BY_EXT[ext] || "audio/*" }));
  return trackFromBytes(bytes, name, { kind: "blob", blobId });
}

// LRU cache — oldest entries are revoked to prevent unbounded memory growth (#1).
const blobUrlCache = new ObjectUrlCache(30);

async function blobUrl(blobId: string): Promise<string> {
  const hit = blobUrlCache.get(blobId);
  if (hit) return hit;
  const blob = await getBlob(blobId);
  if (!blob) throw new Error("Song data missing from storage. Re-import it.");
  const url = URL.createObjectURL(blob);
  blobUrlCache.set(blobId, url);
  return url;
}

function mimeFromExt(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    case "bmp": return "image/bmp";
    default: return "application/octet-stream";
  }
}

export const tauriPlatform: PlatformAdapter = {
  kind: "tauri",
  // Android folder-picking needs a dedicated SAF plugin — until that's wired
  // in, Android imports via the multi-file picker.
  get supportsFolderImport() {
    return !isAndroid();
  },

  async pickFolder(onProgress) {
    if (isAndroid()) {
      throw new Error("Folder import isn't available on Android yet — use \"Import files\" instead.");
    }
    const dir = await open({ directory: true, multiple: false });
    if (!dir) return [];
    const paths = await collectAudioFiles(dir);
    const tracks: Track[] = [];
    for (let i = 0; i < paths.length; i++) {
      tracks.push(await trackFromPath(paths[i]));
      onProgress?.(i + 1, paths.length);
    }
    return tracks;
  },

  async pickFiles(onProgress) {
    if (isAndroid()) {
      // No filters on Android: extension filters get mapped to MIME types the
      // document picker doesn't know (flac, opus, …), which greys every file
      // out ("no supported files were found"). Filter by extension ourselves.
      const selection = await open({ multiple: true, pickerMode: "document" });
      const picked = selection ? (Array.isArray(selection) ? selection : [selection]) : [];
      const files = await Promise.all(
        picked.map(async (uri) => ({ uri, name: await fileNameOf(uri) }))
      );
      const tracks: Track[] = [];
      for (let i = 0; i < files.length; i++) {
        try {
          tracks.push(await trackFromContentUri(files[i].uri, files[i].name, i));
        } catch (err) {
          console.error("Import failed for", files[i].name, err);
        }
        onProgress?.(i + 1, files.length);
      }
      return tracks;
    }
    const selection = await open({
      directory: false,
      multiple: true,
      filters: [{ name: "Audio", extensions: AUDIO_EXTENSIONS }],
    });
    const paths = selection ? (Array.isArray(selection) ? selection : [selection]) : [];
    const tracks: Track[] = [];
    for (let i = 0; i < paths.length; i++) {
      tracks.push(await trackFromPath(paths[i]));
      onProgress?.(i + 1, paths.length);
    }
    return tracks;
  },

  async playableUrl(source) {
    if (source.kind === "object-url" || source.kind === "url") return source.url;
    // Android imports (and any library carried over from the web build).
    if (source.kind === "blob") return blobUrl(source.blobId);
    if (source.kind !== "native") throw new Error("Unsupported source for the native build.");
    // Desktop: stream straight from disk through the asset protocol, no full
    // read into JS memory.
    return convertFileSrc(source.ref);
  },

  async pickImage() {
    const selection = await open({
      directory: false,
      multiple: false,
      // Image extensions map cleanly to MIME types, so this filter also works
      // on Android (and triggers the native media picker there).
      filters: [{ name: "Image", extensions: IMAGE_EXTENSIONS }],
    });
    if (!selection || Array.isArray(selection)) return undefined;
    const bytes = await readFile(selection);
    return bytesToDataUrl(bytes, mimeFromExt(await fileNameOf(selection)));
  },
};
