import type { Track } from "../../types";
import type { SourceExtension } from "./types";

/**
 * Audius (audius.co) source: a decentralized, no-auth music network with an
 * open, CORS-enabled REST API and full-length streams. Works from the browser
 * directly on both the web and Tauri builds — no serverless proxy needed.
 *
 * API docs: https://docs.audius.org/api/
 */

const APP_NAME = "musiclauncher";

// Stable, first-party Audius discovery nodes (all on audius.co, so the Tauri
// CSP can stay tight — see tauri.conf.json connect-src). We deliberately don't
// use the api.audius.co bootstrap: it returns rotating THIRD-PARTY node domains
// (openplayer.org, figment.io, …) that a strict connect-src can't enumerate.
// These named nodes are the ones Audius documents as always-on.
const HOSTS = [
  "https://discoveryprovider.audius.co",
  "https://discoveryprovider2.audius.co",
  "https://discoveryprovider3.audius.co",
];

/**
 * Fetch with automatic failover across the discovery nodes: if one node is
 * down or errors, try the next. Throws only if every node fails.
 */
async function audiusFetch(path: string): Promise<Response> {
  let lastErr: unknown;
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}${path}`);
      if (res.ok) return res;
      lastErr = new Error(`Audius node ${host} returned ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All Audius nodes are unreachable.");
}

interface AudiusArtwork {
  "150x150"?: string;
  "480x480"?: string;
  "1000x1000"?: string;
}

interface AudiusTrack {
  id: string;
  title: string;
  duration: number;
  genre?: string;
  release_date?: string;
  artwork?: AudiusArtwork;
  user?: { name?: string; handle?: string };
}

function toTrack(t: AudiusTrack): Track {
  const artist = t.user?.name || t.user?.handle || "Unknown Artist";
  const year = t.release_date ? new Date(t.release_date).getFullYear() : undefined;
  return {
    id: `audius-${t.id}`,
    title: t.title || "Unknown Title",
    artist,
    album: "Audius",
    year: year && isFinite(year) ? year : undefined,
    genre: t.genre || undefined,
    durationSec: t.duration || 0,
    codec: "mp3",
    tier: "lossy",
    artUrl: t.artwork?.["480x480"] || t.artwork?.["150x150"],
    source: { kind: "stream", provider: "audius", streamId: t.id },
  };
}

export const audiusSource: SourceExtension = {
  id: "audius",
  name: "Audius",

  async search(query) {
    const q = query.trim();
    if (!q) return [];
    const res = await audiusFetch(
      `/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=${APP_NAME}&limit=30`,
    );
    const json = (await res.json()) as { data?: AudiusTrack[] };
    return (json.data ?? []).filter((t) => t.duration > 0).map(toTrack);
  },

  async resolveStream(streamId) {
    // The /stream endpoint 302-redirects to a freshly-signed CDN URL on every
    // request, so the endpoint URL itself is a stable, never-expiring source
    // that <audio> follows transparently. Use the first stable node.
    return `${HOSTS[0]}/v1/tracks/${streamId}/stream?app_name=${APP_NAME}`;
  },
};
