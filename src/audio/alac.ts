import { getPlatform } from "../platform";
import { ObjectUrlCache } from "../platform/constants";
import type { Track } from "../types";

// ALAC can't be decoded by <audio>. Decode to PCM in JS (pure-JS port of
// Apple's reference decoder) and wrap in a float WAV blob — bit-exact, so
// playback stays lossless. LRU-cached per track to cap memory (#1).
const cache = new ObjectUrlCache(15);

export async function alacToWavUrl(track: Track): Promise<string> {
  const hit = cache.get(track.id);
  if (hit) return hit;

  const srcUrl = await getPlatform().playableUrl(track.source);
  const bytes = new Uint8Array(await (await fetch(srcUrl)).arrayBuffer());
  const { default: decode } = await import("@audio/decode-aac");
  const { channelData, sampleRate } = await decode(bytes);

  const url = URL.createObjectURL(encodeFloatWav(channelData, sampleRate));
  cache.set(track.id, url);
  return url;
}

/** Interleave Float32 channels into a 32-bit float WAV (format tag 3). */
function encodeFloatWav(channels: Float32Array[], sampleRate: number): Blob {
  const numCh = channels.length;
  const frames = channels[0]?.length ?? 0;
  const dataBytes = frames * numCh * 4;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 3, true); // IEEE float
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * 4, true);
  view.setUint16(32, numCh * 4, true);
  view.setUint16(34, 32, true);
  writeStr(36, "data");
  view.setUint32(40, dataBytes, true);
  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numCh; c++, off += 4) view.setFloat32(off, channels[c][i], true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}
