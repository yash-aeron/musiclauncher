import { parseBlob, parseBuffer, type IAudioMetadata } from "music-metadata";
import type { LosslessTier, LyricLine, Track, TrackSource } from "../types";

const LOSSLESS_CODECS = /(flac|alac|wav|wave|aiff|pcm|ape|wavpack)/i;

function classify(meta: IAudioMetadata, codec: string): LosslessTier {
  const { sampleRate, bitsPerSample, lossless } = meta.format;
  const isLossless = lossless === true || LOSSLESS_CODECS.test(codec);
  if (!isLossless) return "lossy";
  // Hi-Res = better than CD quality (>16-bit or >44.1kHz).
  if ((bitsPerSample && bitsPerSample > 16) || (sampleRate && sampleRate > 48000)) {
    return "hi-res";
  }
  return "lossless";
}

let idCounter = 0;
function makeId(name: string): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter}-${name.replace(/\W+/g, "").slice(0, 8)}`;
}

/** Convert bytes to a data URL asynchronously without large string allocations (#15). */
export function bytesToDataUrl(bytes: Uint8Array, mime: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([bytes as any], { type: mime }));
  });
}

/**
 * Pull lyrics out of parsed metadata. Synced lyrics (ID3 SYLT) win; then
 * unsynced text (USLT); then raw native tags, because music-metadata 10.x
 * maps vorbis LYRICS comments (FLAC/OGG) into common.lyrics *without* the
 * text — the string only survives in meta.native.
 */
function extractLyrics(meta: IAudioMetadata | null): LyricLine[] | undefined {
  const toLines = (text: string): LyricLine[] =>
    text
      .split(/\r?\n/)
      .map((line) => ({ text: line.trim() }))
      .filter((line) => line.text);

  const tag = meta?.common.lyrics?.find((t) => t.syncText?.length || t.text?.trim());
  if (tag?.syncText?.length) {
    return tag.syncText
      .filter((line) => line.text.trim())
      .map((line) => ({
        text: line.text.trim(),
        // ID3 SYLT timestamps are milliseconds; Track.lyrics uses seconds.
        timestamp: line.timestamp != null ? line.timestamp / 1000 : undefined,
      }));
  }
  if (tag?.text?.trim()) return toLines(tag.text);

  for (const tags of Object.values(meta?.native ?? {})) {
    for (const { id, value } of tags) {
      if (/^(TXXX:)?(UNSYNCED)?LYRICS/i.test(id) && typeof value === "string" && value.trim()) {
        return toLines(value);
      }
    }
  }
  return undefined;
}

async function buildTrack(meta: IAudioMetadata | null, fileName: string, source: TrackSource): Promise<Track> {
  const codec = (meta?.format.codec || fileName.split(".").pop() || "").toLowerCase();
  const common = meta?.common;
  const nameNoExt = fileName.replace(/\.[^.]+$/, "");

  let artUrl: string | undefined;
  const pic = common?.picture?.[0];
  if (pic) {
    // Data URL (not an object URL) so the art survives page reloads once the
    // track is persisted to IndexedDB.
    artUrl = await bytesToDataUrl(new Uint8Array(pic.data), pic.format);
  }

  const lyrics = extractLyrics(meta);

  return {
    id: makeId(fileName),
    title: common?.title || nameNoExt,
    artist: common?.artist || common?.albumartist || "Unknown Artist",
    album: common?.album || "Unknown Album",
    trackNo: common?.track?.no ?? undefined,
    year: common?.year ?? undefined,
    genre: common?.genre?.[0],
    durationSec: meta?.format.duration || 0,
    codec: codec || "unknown",
    sampleRate: meta?.format.sampleRate,
    bitDepth: meta?.format.bitsPerSample,
    bitrate: meta?.format.bitrate,
    tier: meta ? classify(meta, codec) : LOSSLESS_CODECS.test(codec) ? "lossless" : "lossy",
    artUrl,
    lyrics: lyrics?.length ? lyrics : undefined,
    source,
  };
}

/** Parse one browser File into a Track (web build). `source` says how to fetch bytes later. */
export async function trackFromFile(file: File, source: TrackSource): Promise<Track> {
  let meta: IAudioMetadata | null = null;
  try {
    meta = await parseBlob(file, { duration: true });
  } catch {
    // Unparseable tags — still make a usable track from the filename.
  }
  return await buildTrack(meta, file.name, source);
}

/** Parse raw bytes read natively (Tauri build, no File/Blob available). */
export async function trackFromBytes(
  bytes: Uint8Array,
  fileName: string,
  source: TrackSource,
): Promise<Track> {
  let meta: IAudioMetadata | null = null;
  try {
    meta = await parseBuffer(bytes, undefined, { duration: true });
  } catch {
    // Unparseable tags — still make a usable track from the filename.
  }
  return await buildTrack(meta, fileName, source);
}
