import { invoke } from "@tauri-apps/api/core";
import { isAndroid } from "../../platform";
import type { Track } from "../../types";
import type { SourceExtension } from "./types";

/**
 * YouTube source using the InnerTube `ANDROID_VR` client — the same client
 * yt-dlp falls back to. It returns direct, un-ciphered audio URLs with no
 * PoToken/BotGuard, sidestepping YouTube's 2025 "SABR" change that broke the
 * web client. The one requirement is a `visitorData` identity token scraped
 * from the YouTube homepage; without it the player API answers "Sign in to
 * confirm you're not a bot".
 *
 * Runs ONLY in the Tauri (desktop/Android) build. Every request goes through
 * the Rust `yt_fetch` command rather than the WebView's fetch: the WebView (and
 * tauri-plugin-http) inject an `Origin: http://tauri.localhost` header that
 * InnerTube rejects with 403, and Origin/Referer are forbidden fetch headers
 * that JS can't override. Rust has full header control and no injected origin.
 *
 * The resolved googlevideo URL is IP-bound to whoever fetched the player JSON.
 * Because resolution and playback both happen on the same device, the IP always
 * matches — no proxy needed; the <audio> element streams the URL directly.
 */

interface YtResponse {
  status: number;
  body: string;
}

/** Make an HTTP request through the Rust proxy (full header control, no CORS). */
async function proxyFetch(
  url: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<YtResponse> {
  return invoke<YtResponse>("yt_fetch", {
    url,
    method: opts.method ?? "GET",
    headers: opts.headers ?? {},
    body: opts.body ?? null,
  });
}

const IT_KEY = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w"; // public InnerTube key
const AVR_UA =
  "com.google.android.apps.youtube.vr.oculus/1.62.27 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip";
// The homepage token scrape must look like a normal browser — the Oculus app UA
// returns a stripped page without the visitorData token.
const WEB_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function context(visitorData: string) {
  return {
    client: {
      clientName: "ANDROID_VR",
      clientVersion: "1.62.27",
      deviceMake: "Oculus",
      deviceModel: "Quest 3",
      androidSdkVersion: 32,
      userAgent: AVR_UA,
      osName: "Android",
      osVersion: "12L",
      hl: "en",
      gl: "US",
      visitorData,
    },
  };
}

// visitorData is stable for a long session; fetch once and reuse.
let visitorPromise: Promise<string> | null = null;

async function getVisitorData(): Promise<string> {
  if (!visitorPromise) {
    visitorPromise = (async () => {
      // Any failure below (network, missing token, or a malformed-token
      // JSON.parse throw) must clear the cached promise so a later call can
      // retry — otherwise a single bad response kills YouTube for the whole
      // session.
      try {
        const res = await proxyFetch("https://www.youtube.com/", {
          headers: { "user-agent": WEB_UA, "accept-language": "en-US,en" },
        });
        const html = res.body;
        // The token appears as "visitorData":"..." in ytcfg / initial data.
        const m =
          html.match(/"visitorData":\s*"([^"]+)"/) ||
          html.match(/\\"visitorData\\":\\"([^\\"]+)\\"/);
        if (!m) throw new Error("Could not read a YouTube session token from the homepage.");
        // The token is JSON-escaped inside the page (& etc.).
        return JSON.parse(`"${m[1]}"`) as string;
      } catch (e) {
        visitorPromise = null;
        throw e instanceof Error ? e : new Error(`YouTube unreachable: ${e}`);
      }
    })();
  }
  return visitorPromise;
}

async function innertube(endpoint: "search" | "player", body: object): Promise<any> {
  const visitorData = await getVisitorData();
  const res = await proxyFetch(
    `https://www.youtube.com/youtubei/v1/${endpoint}?key=${IT_KEY}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": AVR_UA,
        "x-goog-visitor-id": visitorData,
        origin: "https://www.youtube.com",
        referer: "https://www.youtube.com/",
      },
      body: JSON.stringify({ context: context(visitorData), ...body }),
    },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`YouTube ${endpoint} failed (${res.status})`);
  }
  return JSON.parse(res.body);
}

interface CompactVideo {
  videoId: string;
  title?: { runs?: { text: string }[] };
  lengthText?: { runs?: { text: string }[] };
  longBylineText?: { runs?: { text: string }[] };
  shortBylineText?: { runs?: { text: string }[] };
  thumbnail?: { thumbnails?: { url: string; width: number; height: number }[] };
}

// The android_vr search response nests results as `compactVideoRenderer`
// (not `videoRenderer`); collect them in document order.
function collectVideos(obj: any): CompactVideo[] {
  const out: CompactVideo[] = [];
  const seen = new Set<string>();
  function walk(o: any) {
    if (!o || typeof o !== "object") return;
    const cvr = o.compactVideoRenderer;
    if (cvr?.videoId && !seen.has(cvr.videoId)) {
      seen.add(cvr.videoId);
      out.push(cvr);
    }
    for (const k of Object.keys(o)) walk(o[k]);
  }
  walk(obj);
  return out;
}

function runsText(node?: { runs?: { text: string }[] }): string {
  return node?.runs?.map((r) => r.text).join("") ?? "";
}

// "4:08" / "1:02:30" -> seconds.
function parseLength(text: string): number {
  const parts = text.split(":").map((n) => parseInt(n, 10));
  if (parts.some((n) => isNaN(n))) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function toTrack(v: CompactVideo): Track {
  const artist = runsText(v.longBylineText) || runsText(v.shortBylineText) || "YouTube";
  const thumbs = v.thumbnail?.thumbnails ?? [];
  const artUrl = thumbs.length ? thumbs[thumbs.length - 1].url : undefined;
  return {
    id: `youtube-${v.videoId}`,
    title: runsText(v.title) || "Unknown Title",
    artist,
    album: "YouTube",
    durationSec: parseLength(runsText(v.lengthText)),
    codec: "opus",
    tier: "lossy",
    artUrl,
    source: { kind: "stream", provider: "youtube", streamId: v.videoId },
  };
}

interface YtFormat {
  itag: number;
  url?: string;
  mimeType?: string;
  bitrate?: number;
  audioQuality?: string;
}

export const youtubeSource: SourceExtension = {
  id: "youtube",
  name: "YouTube",

  async search(query) {
    const q = query.trim();
    if (!q) return [];
    const json = await innertube("search", { query: q });
    return collectVideos(json)
      .filter((v) => runsText(v.lengthText)) // drop live/upcoming (no duration)
      .slice(0, 30)
      .map(toTrack);
  },

  async resolveStream(streamId) {
    // Android's WebView can't decode opus/webm, so on Android prefer an m4a/AAC
    // stream (same reason the download path does). Desktop plays opus fine, so
    // it takes the highest-bitrate audio.
    const audio = await bestAudio(streamId, isAndroid ? "m4a" : undefined);
    return audio.url!;
  },

  async download(streamId) {
    // Prefer an m4a/AAC format: Android's WebView decodes AAC reliably, whereas
    // a downloaded opus/webm blob plays as "no supported sources found" on some
    // devices.
    const audio = await bestAudio(streamId, "m4a");
    // googlevideo sends no CORS headers and its domain isn't in the Tauri HTTP
    // capability scope, so both WebView fetch and tauri-plugin-http fail.
    // The Rust yt_download command has no scope restriction and full header
    // control. It returns binary via tauri::ipc::Response (ArrayBuffer in JS).
    const bytes = await invoke<ArrayBuffer>("yt_download", { url: audio.url! });
    const mime = (audio.mimeType ?? "").split(";")[0] || "audio/mp4";
    const blob = new Blob([bytes], { type: mime });
    // opus/webm audio -> "opus"; m4a/mp4 audio -> "m4a"; fall back to m4a.
    const codec = /webm|opus/i.test(audio.mimeType ?? "") ? "opus" : "m4a";
    return { blob, codec };
  },
};

/**
 * Resolve the player response and pick an audio format. `prefer:"m4a"` biases
 * toward an mp4/AAC stream (best for a downloaded, re-decoded blob); otherwise
 * the highest-bitrate audio is chosen (fine for direct streaming).
 */
async function bestAudio(streamId: string, prefer?: "m4a"): Promise<YtFormat> {
  const json = await innertube("player", {
    videoId: streamId,
    contentCheckOk: true,
    racyCheckOk: true,
  });
  const status = json.playabilityStatus?.status;
  if (status && status !== "OK") {
    const reason = json.playabilityStatus?.reason ?? status;
    throw new Error(`YouTube can't play this track: ${reason}`);
  }
  const formats: YtFormat[] = json.streamingData?.adaptiveFormats ?? [];
  const audio = formats
    .filter((f) => (f.mimeType ?? "").startsWith("audio/") && f.url)
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  if (!audio.length) throw new Error("No playable audio stream for this track.");
  if (prefer === "m4a") {
    const m4a = audio.find((f) => /mp4|m4a/i.test(f.mimeType ?? ""));
    if (m4a) return m4a;
  }
  return audio[0];
}
