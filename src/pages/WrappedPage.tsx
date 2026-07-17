import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getAllPlayEvents } from "../lib/db";
import { formatMinutes } from "../lib/format";
import { GlassPanel } from "../components/GlassPanel";
import type { PlayEvent } from "../types";

interface Ranked {
  key: string;
  primary: string;
  secondary?: string;
  plays: number;
  seconds: number;
}

function rank(events: PlayEvent[], keyOf: (e: PlayEvent) => string, label: (e: PlayEvent) => Ranked): Ranked[] {
  const map = new Map<string, Ranked>();
  for (const e of events) {
    const k = keyOf(e);
    const existing = map.get(k);
    if (existing) {
      existing.plays += 1;
      existing.seconds += e.secondsPlayed;
    } else {
      map.set(k, { ...label(e), plays: 1, seconds: e.secondsPlayed });
    }
  }
  return [...map.values()].sort((a, b) => b.seconds - a.seconds);
}

export function WrappedPage() {
  const [events, setEvents] = useState<PlayEvent[] | null>(null);

  useEffect(() => {
    getAllPlayEvents().then(setEvents);
  }, []);

  if (!events) return <div className="p-8 text-white/50">Loading your stats…</div>;

  const totalSeconds = events.reduce((s, e) => s + e.secondsPlayed, 0);
  const topSongs = rank(
    events,
    (e) => e.trackId,
    (e) => ({ key: e.trackId, primary: e.title, secondary: e.artist, plays: 0, seconds: 0 }),
  ).slice(0, 5);
  const topArtists = rank(
    events,
    (e) => e.artist,
    (e) => ({ key: e.artist, primary: e.artist, plays: 0, seconds: 0 }),
  ).slice(0, 5);

  const empty = events.length === 0;

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-4 md:px-8">
      <header className="mb-8">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#ff5e8a] via-[color:var(--accent-strong)] to-[#ff8f5e] bg-clip-text text-4xl font-bold tracking-tight text-transparent"
        >
          Replay
        </motion.h2>
        <p className="text-sm text-white/50">Your listening, updated live as you play.</p>
      </header>

      {empty ? (
        <div className="flex h-64 items-center justify-center text-center text-white/45">
          Play some music and your top songs, artists, and minutes will appear here.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <GlassPanel className="flex flex-col items-center justify-center p-6 text-center md:p-8 lg:col-span-1">
            <div className="text-6xl font-black tabular-nums">{Math.round(totalSeconds / 60)}</div>
            <div className="mt-1 text-white/60">minutes listened</div>
            <div className="mt-2 text-xs text-white/40">{formatMinutes(totalSeconds)}</div>
            <div className="mt-4 text-xs text-white/40">
              {events.length} {events.length === 1 ? "play" : "plays"} counted
            </div>
          </GlassPanel>

          <GlassPanel className="p-4 md:p-6 lg:col-span-1">
            <h3 className="mb-4 text-lg font-bold">Top Songs</h3>
            <RankList items={topSongs} />
          </GlassPanel>

          <GlassPanel className="p-4 md:p-6 lg:col-span-1">
            <h3 className="mb-4 text-lg font-bold">Top Artists</h3>
            <RankList items={topArtists} />
          </GlassPanel>
        </div>
      )}
    </div>
  );
}

function RankList({ items }: { items: Ranked[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((it, i) => (
        <motion.li
          key={it.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3"
        >
          <span className="w-5 text-lg font-black text-white/30">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{it.primary}</div>
            {it.secondary ? <div className="truncate text-xs text-white/45">{it.secondary}</div> : null}
          </div>
          <span className="text-xs text-white/40">{it.plays} {it.plays === 1 ? "play" : "plays"}</span>
        </motion.li>
      ))}
    </ol>
  );
}
