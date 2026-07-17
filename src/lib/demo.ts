import { saveBlob } from "./db";
import type { Track } from "../types";

// Generate real, playable, LOSSLESS WAV tracks entirely in the browser so the
// app is demoable with no external files. Also proves the lossless pipeline.

interface Spec {
  title: string;
  artist: string;
  album: string;
  trackNo: number;
  year: number;
  genre: string;
  freqs: number[]; // chord frequencies
  seconds: number;
  colorA: string;
  colorB: string;
}

const SPECS: Spec[] = [
  { title: "Aurora Drift", artist: "Nebula Theory", album: "Glass Horizons", trackNo: 1, year: 2024, genre: "Ambient", freqs: [261.6, 329.6, 392.0], seconds: 16, colorA: "#6d28d9", colorB: "#2563eb" },
  { title: "Neon Tide", artist: "Nebula Theory", album: "Glass Horizons", trackNo: 2, year: 2024, genre: "Ambient", freqs: [293.7, 370.0, 440.0], seconds: 14, colorA: "#db2777", colorB: "#7c3aed" },
  { title: "Slow Static", artist: "Warm Analog", album: "Room Tone", trackNo: 1, year: 2023, genre: "Downtempo", freqs: [220.0, 277.2, 329.6], seconds: 15, colorA: "#ea580c", colorB: "#b91c1c" },
  { title: "Copper Sun", artist: "Warm Analog", album: "Room Tone", trackNo: 2, year: 2023, genre: "Downtempo", freqs: [246.9, 311.1, 370.0], seconds: 13, colorA: "#f59e0b", colorB: "#65a30d" },
];

const SAMPLE_RATE = 44100;

function renderWav(spec: Spec): Blob {
  const n = Math.floor(SAMPLE_RATE * spec.seconds);
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // Gentle attack/decay envelope + slow tremolo for a pad-like tone.
    const env = Math.min(1, t / 1.5) * Math.min(1, (spec.seconds - t) / 2);
    const trem = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.2 * t);
    let s = 0;
    for (const f of spec.freqs) s += Math.sin(2 * Math.PI * f * t);
    data[i] = (s / spec.freqs.length) * env * trem * 0.35;
  }
  return encodeWav(data, SAMPLE_RATE);
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); // 16-bit
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function renderArt(spec: Spec): string {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, spec.colorA);
  g.addColorStop(1, spec.colorB);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // Soft radial highlight
  const r = ctx.createRadialGradient(size * 0.3, size * 0.3, 20, size * 0.3, size * 0.3, size);
  r.addColorStop(0, "rgba(255,255,255,0.35)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, size, size);
  return canvas.toDataURL("image/png");
}

let loaded: Track[] | null = null;

export async function loadDemoTracks(): Promise<Track[]> {
  if (loaded) return loaded;
  loaded = await Promise.all(
    SPECS.map(async (spec, i) => {
      const blobId = `demo-blob-${i}`;
      await saveBlob(blobId, renderWav(spec));
      return {
        id: `demo-${i}`,
        title: spec.title,
        artist: spec.artist,
        album: spec.album,
        trackNo: spec.trackNo,
        year: spec.year,
        genre: spec.genre,
        durationSec: spec.seconds,
        codec: "pcm",
        sampleRate: SAMPLE_RATE,
        bitDepth: 16,
        tier: "lossless",
        artUrl: renderArt(spec),
        source: { kind: "blob", blobId },
      } satisfies Track;
    })
  );
  return loaded;
}
