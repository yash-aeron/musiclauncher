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
  /** Bumped on every loadAndPlay; lets a newer load cancel an older one's play. */
  private loadGen = 0;
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
          2: "Network error while loading this track.",
          3: "This file can't be decoded by the browser (e.g. ALAC).",
          4: "This audio format isn't supported by the browser.",
        };
        const code = el.error?.code ?? 0;
        const detail = el.error?.message ? ` (${el.error.message})` : "";
        this.cb.onError((codeMap[code] || "Playback failed.") + detail);
      });
      // Android WebView refuses to play() on <audio> elements that aren't in
      // the DOM. Mount off-screen so they're rendered but invisible.
      el.style.position = "fixed";
      el.style.left = "-9999px";
      el.style.top = "-9999px";
      el.style.width = "0";
      el.style.height = "0";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      document.body.appendChild(el);
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
    // Don't pre-buffer online streams: their resolved URLs are short-lived and
    // IP-bound, so a URL fetched now can be dead by the time the track actually
    // advances (esp. if it sits queued for a while). Streams cold-resolve on
    // play instead — a tiny gap, but always a fresh, valid URL.
    if (track.source.kind === "stream") return;
    // During a crossfade the "idle" element is actually the OLD track still
    // fading out (crossfadeFrom keeps it playing). Overwriting its src would
    // cut the fade off abruptly, so skip preloading until the fade finishes.
    if (this.fadeTimer !== null) return;
    try {
      const url = await resolvePlayableUrl(track);
      if (this.fadeTimer !== null) return; // a fade started while we resolved
      this.idle.src = url;
      this.idle.load();
      this.preloadedTrackId = track.id;
    } catch {
      this.preloadedTrackId = null; // fall back to a cold load on advance
    }
  }

  async loadAndPlay(track: Track): Promise<void> {
    const gen = ++this.loadGen;
    try {
      this.cancelFade();
      if (track.id === this.preloadedTrackId) {
        // Gapless path: the idle element is already buffered — swap.
        const old = this.el;
        this.active = 1 - this.active;
        this.preloadedTrackId = null;
        await this.el.play();
        // A newer load superseded us while play() was pending — don't start a
        // crossfade against an element the newer load is already driving.
        if (gen !== this.loadGen) return;
        this.crossfadeFrom(old);
        return;
      }
      const url = await resolvePlayableUrl(track);
      // A newer load started while we were resolving — abandon this one so we
      // don't call play() on an element the newer load is about to pause.
      if (gen !== this.loadGen) return;
      this.el.pause();
      this.el.volume = this.volume;
      this.el.src = url;
      this.preloadedTrackId = null;
      await this.el.play();
    } catch (e) {
      // A play() aborted because a newer load superseded it is expected — the
      // browser rejects the pending play() with an AbortError. Don't surface it.
      if (gen !== this.loadGen) return;
      if (e instanceof DOMException && e.name === "AbortError") return;
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
