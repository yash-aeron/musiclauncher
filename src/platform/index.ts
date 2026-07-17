import { webPlatform } from "./web";
import { tauriPlatform } from "./tauri";
import { platform as osPlatform } from "@tauri-apps/plugin-os";
import type { PlatformAdapter } from "./types";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
export const isAndroid = isTauri && osPlatform() === "android";

const platform: PlatformAdapter = isTauri ? tauriPlatform : webPlatform;

export function getPlatform(): PlatformAdapter {
  return platform;
}
