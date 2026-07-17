import { resolvePlayableUrl } from "./resolveSource";
import type { Track } from "../types";

export interface AudioCallbacks {
  onTime: (currentSec: number, durationSec: number) => void;
  onEnded: () => void;
  onPlayingChange: (playing: boolean) => void;
  onError: (message: string) => void;
}

/**
 * Playback engine on two <audio> elements. The idle element preloads the next
 * queue track, so an auto-advance is an instant swap (near-gapless) and can
 * optionally crossfade the two elements over a short window.
 */
export class AudioController {
  private els: [HTMLAudioElement, HTMLAudioElement];
  private active = 0;
  private cb: AudioCallbacks;
  private volume = 1;
  private preloadedTrackId: string | null = null;
  private fadeTimer: number | null = null;
  /** Crossfade duration in seconds; 0 = plain gapless swap. */
  crossfadeSec = 0;

  constructor(cb: AudioCallbacks) {
    this.cb = cb;
    this.els = [new Audio(), new Audio()];
    for (const el of this.els) {
      el.preload = "auto";
      el.addEventListener("timeupdate", () => {
        if (el === this.el) this.cb.onTime(el.currentTime, el.duration || 0);
      });
      el.addEventListener("durationchange", () => {
        if (el === this.el) this.cb.onTime(el.currentTime, el.duration || 0);
      });
      el.addEventListener("ended", () => {
        if (el === this.el) this.cb.onEnded();
      });
      el.addEventListener("play", () => {
        if (el === this.el) this.cb.onPlayingChange(true);
      });
      el.addEventListener("pause", () => {
        if (el === this.el) this.cb.onPlayingChange(false);
      });
      el.addEventListener("error", () => {
        if (el !== this.el) return;
        const codeMap: Record<number, string> = {
          3: "This file can't be decoded by the browser (e.g. ALAC).",
          4: "This audio format isn't supported by the browser.",
        };
        const code = el.error?.code ?? 0;
        this.cb.onError(codeMap[code] || "Playback failed.");
      });
    }
  }

  private get el() {
    return this.els[this.active];
  }
  private get idle() {
    return this.els[1 - this.active];
  }

  /** Resolve and buffer the next track on the idle element. */
  async preloadNext(track: Track | null): Promise<void> {
    if (!track || track.id === this.preloadedTrackId) return;
    try {
      const url = await resolvePlayableUrl(track);
      this.idle.src = url;
      this.idle.load();
      this.preloadedTrackId = track.id;
    } catch {
      this.preloadedTrackId = null; // fall back to a cold load on advance
    }
  }

  async loadAndPlay(track: Track): Promise<void> {
    try {
      this.cancelFade();
      if (track.id === this.preloadedTrackId) {
        // Gapless path: the idle element is already buffered — swap.
        const old = this.el;
        this.active = 1 - this.active;
        this.preloadedTrackId = null;
        await this.el.play();
        this.crossfadeFrom(old);
        return;
      }
      const url = await resolvePlayableUrl(track);
      this.el.pause();
      this.el.volume = this.volume;
      this.el.src = url;
      this.preloadedTrackId = null;
      await this.el.play();
    } catch (e) {
      this.cb.onError(e instanceof Error ? e.message : "Could not play track.");
    }
  }

  /** Equal-power fade: ramp the new element up while the old one drains out. */
  private crossfadeFrom(old: HTMLAudioElement) {
    if (this.crossfadeSec <= 0 || old.paused || !isFinite(old.duration)) {
      old.pause();
      this.el.volume = this.volume;
      return;
    }
    const started = performance.now();
    const durMs = this.crossfadeSec * 1000;
    const step = () => {
      const t = Math.min(1, (performance.now() - started) / durMs);
      this.el.volume = this.volume * Math.sin((t * Math.PI) / 2);
      old.volume = this.volume * Math.cos((t * Math.PI) / 2);
      if (t < 1) {
        this.fadeTimer = requestAnimationFrame(step);
      } else {
        old.pause();
        old.volume = this.volume;
        this.fadeTimer = null;
      }
    };
    this.el.volume = 0;
    this.fadeTimer = requestAnimationFrame(step);
  }

  private cancelFade() {
    if (this.fadeTimer !== null) {
      cancelAnimationFrame(this.fadeTimer);
      this.fadeTimer = null;
      this.idle.pause();
      for (const el of this.els) el.volume = this.volume;
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
    this.volume = Math.max(0, Math.min(1, v));
    if (this.fadeTimer === null) for (const el of this.els) el.volume = this.volume;
  }
  get currentTime() {
    return this.el.currentTime;
  }
}
