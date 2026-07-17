import { getPlatform } from "../platform";
import type { Track } from "../types";

/** Turn a Track's source into a playable URL. May request permission / prompt a picker. */
export async function resolvePlayableUrl(track: Track): Promise<string> {
  // Browsers can't decode ALAC natively — decode to a lossless WAV in JS.
  if (/alac/i.test(track.codec)) {
    const { alacToWavUrl } = await import("./alac");
    return alacToWavUrl(track);
  }
  return getPlatform().playableUrl(track.source);
}
