import { open } from "@tauri-apps/plugin-dialog";
import { readDir, readFile, writeFile, mkdir, BaseDirectory, type DirEntry } from "@tauri-apps/plugin-fs";
import { platform } from "@tauri-apps/plugin-os";
import { convertFileSrc } from "@tauri-apps/api/core";
import { basename, appLocalDataDir, join } from "@tauri-apps/api/path";
import { saveBlob, getBlob } from "../lib/db";
import { trackFromBytes, bytesToDataUrl } from "../lib/metadata";
import type { Track, TrackSource } from "../types";
import type { PlatformAdapter, ProgressFn } from "./types";
import { AUDIO_EXT, AUDIO_EXTENSIONS, ObjectUrlCache, ImportPartialError } from "./constants";

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
async function trackFromContentUri(uri: string, name: string, i: number, localDir: string): Promise<Track> {
  const bytes = await readFile(uri);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const safeName = name.replace(/\W+/g, "").slice(0, 8);
  const fileName = `${Date.now().toString(36)}-${i}-${safeName}${ext ? `.${ext}` : ""}`;
  
  // Write the actual audio bytes to the native filesystem to bypass IndexedDB memory/quota limits
  await writeFile(fileName, bytes, { baseDir: BaseDirectory.AppLocalData });
  
  // Convert it into a path source so Tauri serves it via asset://
  const absPath = await join(localDir, fileName);
  return trackFromBytes(bytes, name, { kind: "native", ref: absPath });
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

/**
 * Android: serve a native file as a blob: URL read on demand rather than via the
 * asset:// protocol. The asset protocol requires the file path to match the
 * configured scope exactly, and Android's `/data/data/<pkg>` vs `/data/user/0/<pkg>`
 * path aliasing makes that match unreliable — a miss yields an <audio> "no
 * supported sources" error. Reading the bytes into a blob URL is the same path
 * the web build uses and always plays. Cached (LRU) and only one file's bytes are
 * held transiently per play.
 */
async function nativeBlobUrl(ref: string): Promise<string> {
  const hit = blobUrlCache.get(ref);
  if (hit) return hit;
  const bytes = await readFile(ref);
  const ext = ref.split(".").pop()?.toLowerCase() ?? "";
  const type = MIME_BY_EXT[ext] ?? "audio/mpeg";
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  blobUrlCache.set(ref, url);
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
      const files = [];
      for (let i = 0; i < picked.length; i += 20) {
        const chunk = picked.slice(i, i + 20);
        const results = await Promise.all(
          chunk.map(async (uri) => ({ uri, name: await fileNameOf(uri) }))
        );
        files.push(...results);
      }

      const tracks: Track[] = [];
      const failed: string[] = [];
      const localDir = await appLocalDataDir();

      // Ensure the app-local-data dir exists before writing into it. On a fresh
      // install it may not, which would make every writeFile fail.
      try {
        await mkdir("", { baseDir: BaseDirectory.AppLocalData, recursive: true });
      } catch {
        // Already exists (or will be created by writeFile) — safe to ignore.
      }

      // Import one file at a time. Each file is read fully into JS and written
      // back to disk; doing several at once holds multiple large buffers in
      // memory simultaneously, which OOMs on phones with big FLAC/WAV files
      // (the "sometimes doesn't read it" / slow-import symptom). Sequential
      // keeps the peak at one file's worth of bytes.
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          tracks.push(await trackFromContentUri(file.uri, file.name, i, localDir));
        } catch (err) {
          console.error("Import failed for", file.name, err);
          failed.push(file.name);
        }
        onProgress?.(i + 1, files.length);
      }

      // Surface failures instead of silently dropping files. If every file
      // failed, throw so the user gets a clear message rather than an empty
      // "no supported files" toast.
      if (failed.length && !tracks.length) {
        throw new Error(
          `Couldn't read ${failed.length === 1 ? "the selected file" : `any of the ${failed.length} selected files`}. It may be an unsupported format or too large.`,
        );
      }
      if (failed.length) {
        throw new ImportPartialError(tracks, failed.length);
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
    if ((source as any).kind === "path") {
      // Back-compat for old imports.
      return isAndroid() ? nativeBlobUrl((source as any).path) : convertFileSrc((source as any).path);
    }
    if (source.kind !== "native") throw new Error("Unsupported source for the native build.");
    // Android: asset:// path matching is unreliable — read the file into a blob
    // URL instead. Desktop streams straight from disk through the asset protocol.
    return isAndroid() ? nativeBlobUrl(source.ref) : convertFileSrc(source.ref);
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
