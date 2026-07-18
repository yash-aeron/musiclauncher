import { audiusSource } from "./audius";
import { youtubeSource } from "./youtube";
import { isTauri } from "../../platform";
import type { SourceExtension } from "./types";

// YouTube resolves through the Tauri HTTP plugin (Rust) to escape the WebView's
// CORS wall, so it only works in the native build. On the web it's hidden and
// Audius (open CORS) is the only source.
const allSources: SourceExtension[] = isTauri
  ? [youtubeSource, audiusSource]
  : [audiusSource];

/** Registry of online sources, keyed by the id stored in Track.source.provider. */
const SOURCES: Record<string, SourceExtension> = Object.fromEntries(
  // Both providers are registered for lookup regardless of platform, so a
  // persisted YouTube track still resolves if the library moves between builds.
  [audiusSource, youtubeSource].map((s) => [s.id, s]),
);

/** The sources shown in the Search UI, in display order. */
export const sourceList: SourceExtension[] = allSources;

/** Look up a source adapter by provider id. Throws if unknown. */
export function getSource(id: string): SourceExtension {
  const source = SOURCES[id];
  if (!source) throw new Error(`Unknown online source: ${id}`);
  return source;
}
