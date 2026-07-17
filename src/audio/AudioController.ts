import { resolvePlayableUrl } from "./resolveSource";
import type { Track } from "../types";

export interface AudioCallbacks {
  onTime: (currentSec: number, durationSec: number) => void;
  onEnded: () => void;
  onPlayingChange: (playing: boolean) => void;
  onError: (message: string) => void;
}

/** Thin wrapper around a single <audio> element. */
export class AudioController {
  private el: HTMLAudioElement;
  private cb: AudioCallbacks;
  private currentUrlIsBlob = false;

  constructor(cb: AudioCallbacks) {
    this.cb = cb;
    this.el = new Audio();
    this.el.preload = "auto";
    this.el.addEventListener("timeupdate", () =>
      this.cb.onTime(this.el.currentTime, this.el.duration || 0),
    );
    this.el.addEventListener("durationchange", () =>
      this.cb.onTime(this.el.currentTime, this.el.duration || 0),
    );
    this.el.addEventListener("ended", () => this.cb.onEnded());
    this.el.addEventListener("play", () => this.cb.onPlayingChange(true));
    this.el.addEventListener("pause", () => this.cb.onPlayingChange(false));
    this.el.addEventListener("error", () => {
      const codeMap: Record<number, string> = {
        3: "This file can't be decoded by the browser (e.g. ALAC).",
        4: "This audio format isn't supported by the browser.",
      };
      const code = this.el.error?.code ?? 0;
      this.cb.onError(codeMap[code] || "Playback failed.");
    });
  }

  async loadAndPlay(track: Track): Promise<void> {
    try {
      const url = await resolvePlayableUrl(track);
      this.currentUrlIsBlob = url.startsWith("blob:");
      this.el.src = url;
      await this.el.play();
    } catch (e) {
      this.cb.onError(e instanceof Error ? e.message : "Could not play track.");
    }
  }

  play() {
    this.el.play().catch(() => {});
  }
  pause() {
    this.el.pause();
  }
  seek(sec: number) {
    if (isFinite(sec)) this.el.currentTime = sec;
  }
  setVolume(v: number) {
    this.el.volume = Math.max(0, Math.min(1, v));
  }
  get currentTime() {
    return this.el.currentTime;
  }
}
