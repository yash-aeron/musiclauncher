import { getPlatform } from "../platform";
import type { Track } from "../types";

/** Turn a Track's source into a playable URL. May request permission / prompt a picker. */
export async function resolvePlayableUrl(track: Track): Promise<string> {
  return getPlatform().playableUrl(track.source);
}
