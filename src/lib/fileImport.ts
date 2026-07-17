import { getPlatform } from "../platform";
import type { ProgressFn } from "../platform/types";

export const supportsFolderImport = getPlatform().supportsFolderImport;

export function pickFolder(onProgress?: ProgressFn) {
  return getPlatform().pickFolder(onProgress);
}

export function pickFiles(onProgress?: ProgressFn) {
  return getPlatform().pickFiles(onProgress);
}
