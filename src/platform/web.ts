import { saveBlob, getBlob, getHandle } from "../lib/db";
import { trackFromFile } from "../lib/metadata";
import type { Track } from "../types";
import type { PlatformAdapter, ProgressFn } from "./types";
import { AUDIO_EXT, ObjectUrlCache } from "./constants";

const IMAGE_ACCEPT = "image/*";

const supportsFsAccess = typeof (window as any).showDirectoryPicker === "function";

// LRU cache — oldest entries are revoked to prevent unbounded memory growth (#1).
const urlCache = new ObjectUrlCache(30);

/** Open a hidden <input> and resolve with the files the user picked (or none, on cancel). */
function pickWithInput(opts: { directory?: boolean; multiple?: boolean; accept?: string }): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (opts.directory) (input as any).webkitdirectory = "";
    if (opts.multiple) input.multiple = true;
    if (opts.accept) input.accept = opts.accept;
    input.className = "hidden";
    input.style.position = "fixed";
    input.style.left = "-9999px";

    let settled = false;
    const finish = (files: FileList | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onFocus, true);
      input.remove();
      resolve(files);
    };
    // Chromium fires a real 'cancel' event on <input type=file> since v113.
    input.addEventListener("cancel", () => finish(null));
    // Fallback for browsers without it: a focus bounce back to the window
    // happens right after the native picker dialog closes either way.
    const onFocus = () => setTimeout(() => finish(input.files && input.files.length ? input.files : null), 300);
    window.addEventListener("focus", onFocus, true);

    input.onchange = () => finish(input.files);
    document.body.appendChild(input);
    input.click();
  });
}

async function collectDirectoryFiles(dir: FileSystemDirectoryHandle) {
  const files: File[] = [];
  async function walk(handle: FileSystemDirectoryHandle) {
    // @ts-expect-error - values() is async-iterable at runtime
    for await (const entry of handle.values()) {
      if (entry.kind === "file" && AUDIO_EXT.test(entry.name)) {
        files.push(await (entry as FileSystemFileHandle).getFile());
      } else if (entry.kind === "directory") {
        await walk(entry as FileSystemDirectoryHandle);
      }
    }
  }
  await walk(dir);
  return files;
}

/**
 * Import files by COPYING the audio into IndexedDB. The library then lives
 * entirely inside the app — songs are still there on reopen even if the
 * originals move, and no permission re-prompt is ever needed.
 */
async function importFiles(files: File[], onProgress?: ProgressFn): Promise<Track[]> {
  const audio = files.filter((f) => AUDIO_EXT.test(f.name));
  const tracks: Track[] = [];
  for (let i = 0; i < audio.length; i++) {
    const file = audio[i];
    const blobId = `b-${Date.now().toString(36)}-${i}-${file.name.replace(/\W+/g, "").slice(0, 8)}`;
    await saveBlob(blobId, file);
    tracks.push(await trackFromFile(file, { kind: "blob", blobId }));
    onProgress?.(i + 1, audio.length);
  }
  return tracks;
}

export const webPlatform: PlatformAdapter = {
  kind: "web",
  supportsFolderImport: supportsFsAccess,

  async pickFolder(onProgress) {
    if (supportsFsAccess) {
      const dir: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
      return importFiles(await collectDirectoryFiles(dir), onProgress);
    }
    // No File System Access API (e.g. Firefox): fall back to a directory <input>.
    const files = await pickWithInput({ directory: true, multiple: true });
    if (!files) return [];
    return importFiles(Array.from(files), onProgress);
  },

  async pickFiles(onProgress) {
    // List every extension explicitly — "audio/*" alone greys out formats the
    // OS doesn't map to an audio MIME type (flac/opus/ape/wv on some systems).
    const files = await pickWithInput({
      multiple: true,
      accept: "audio/*,.flac,.wav,.wave,.aif,.aiff,.alac,.m4a,.mp3,.aac,.ogg,.opus,.wv,.ape",
    });
    if (!files) return [];
    return importFiles(Array.from(files), onProgress);
  },

  async playableUrl(source) {
    if (source.kind === "object-url" || source.kind === "url") return source.url;

    if (source.kind === "blob") {
      const hit = urlCache.get(source.blobId);
      if (hit) return hit;
      const blob = await getBlob(source.blobId);
      if (!blob) throw new Error("Song data missing from storage. Re-import it.");
      const url = URL.createObjectURL(blob);
      urlCache.set(source.blobId, url);
      return url;
    }

    // Legacy libraries imported before blob storage still hold file handles.
    if (source.kind === "file-handle") {
      const hit2 = urlCache.get(source.handleId);
      if (hit2) return hit2;
      const handle = await getHandle(source.handleId);
      if (!handle) throw new Error("File handle missing. Re-import the folder.");
      const perm = handle as unknown as {
        queryPermission?: (o: any) => Promise<PermissionState>;
        requestPermission?: (o: any) => Promise<PermissionState>;
      };
      if (perm.queryPermission) {
        let state = await perm.queryPermission({ mode: "read" });
        if (state !== "granted" && perm.requestPermission) {
          state = await perm.requestPermission({ mode: "read" });
        }
        if (state !== "granted") throw new Error("Permission to read file denied.");
      }
      const file = await handle.getFile();
      const url = URL.createObjectURL(file);
      urlCache.set(source.handleId, url);
      return url;
    }

    throw new Error("Unsupported source for the web build.");
  },

  async pickImage() {
    const files = await pickWithInput({ accept: IMAGE_ACCEPT });
    const file = files?.[0];
    if (!file) return undefined;
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  },
};
