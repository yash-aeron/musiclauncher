import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getAllPlayEvents } from "../lib/db";
import { formatMinutes } from "../lib/format";
import { AlbumArt } from "../components/AlbumArt";
import { usePlayer } from "../store/player";
import type { PlayEvent } from "../types";

interface Ranked {
  key: string;
  primary: string;
  secondary?: string;
  plays: number;
  seconds: number;
}

function rank(events: PlayEvent[], keyOf: (event: PlayEvent) => string, label: (event: PlayEvent) => Ranked) {
  const grouped = new Map<string, Ranked>();
  for (const event of events) {
    const key = keyOf(event);
    const current = grouped.get(key);
    if (current) {
      current.plays += 1;
      current.seconds += event.secondsPlayed;
    } else {
      grouped.set(key, { ...label(event), plays: 1, seconds: event.secondsPlayed });
    }
  }
  return [...grouped.values()].sort((a, b) => b.seconds - a.seconds);
}

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function WrappedPage() {
  const [events, setEvents] = useState<PlayEvent[] | null>(null);
  const library = usePlayer((state) => state.library);
  const reduce = useReducedMotion();

  useEffect(() => {
    getAllPlayEvents().then(setEvents);
  }, []);

  const tracksById = useMemo(() => new Map(library.map((track) => [track.id, track])), [library]);

  if (!events) return <div className="p-8 text-white/50">Loading your Replay...</div>;

  const totalSeconds = events.reduce((sum, event) => sum + event.secondsPlayed, 0);
  const topSongs = rank(
    events,
    (event) => event.trackId,
    (event) => ({ key: event.trackId, primary: event.title, secondary: event.artist, plays: 0, seconds: 0 }),
  ).slice(0, 5);
  const topArtists = rank(
    events,
    (event) => event.artist,
    (event) => ({ key: event.artist, primary: event.artist, plays: 0, seconds: 0 }),
  ).slice(0, 5);

  if (!events.length) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center text-white/50">
        Play some music and your Replay story will appear here.
      </div>
    );
  }

  const topSong = topSongs[0];
  const topArtist = topArtists[0];
  const topTrack = topSong ? tracksById.get(topSong.key) : undefined;
  const artistTrack = topArtist
    ? library.find((track) => track.artist === topArtist.primary)
    : undefined;

  return (
    <div className="h-full snap-y snap-mandatory overflow-y-auto px-4 md:px-8">
      <StoryScene tone="from-[#43101d] via-[#1c1118] to-[#07080c]" reduce={reduce}>
        <p className="text-sm font-semibold text-[color:var(--accent-strong)]">Your Replay</p>
        <h2 className="mt-3 max-w-xl text-5xl font-black tracking-tight md:text-7xl">This is how you listened.</h2>
        <p className="mt-5 max-w-md text-base leading-relaxed text-white/60">
          Every moment you stayed with a song shaped this story.
        </p>
      </StoryScene>

      <StoryScene tone="from-[#2d1631] via-[#121321] to-[#07080c]" reduce={reduce}>
        <p className="text-sm font-semibold text-white/55">Time well spent</p>
        <motion.div variants={reveal} className="mt-4 text-7xl font-black tabular-nums tracking-tight md:text-9xl">
          {Math.round(totalSeconds / 60)}
        </motion.div>
        <p className="mt-3 text-xl text-white/75">minutes listened</p>
        <p className="mt-10 text-sm text-white/45">
          {formatMinutes(totalSeconds)} across {events.length} {events.length === 1 ? "play" : "plays"}.
        </p>
      </StoryScene>

      {topSong ? (
        <StoryScene tone="from-[#35141f] via-[#1a1118] to-[#07080c]" reduce={reduce}>
          <p className="text-sm font-semibold text-white/55">Your top song</p>
          <div className="mt-6 flex max-w-2xl flex-col gap-6 md:flex-row md:items-end">
            <AlbumArt url={topTrack?.artUrl} alt={topSong.primary} className="aspect-square w-48 shadow-2xl shadow-black/50 md:w-64" />
            <div className="min-w-0">
              <h3 className="truncate text-4xl font-black tracking-tight md:text-6xl">{topSong.primary}</h3>
              <p className="mt-2 truncate text-xl text-[color:var(--accent-strong)]">{topSong.secondary}</p>
              <p className="mt-6 text-sm text-white/50">{formatMinutes(topSong.seconds)} listened</p>
            </div>
          </div>
        </StoryScene>
      ) : null}

      {topArtist ? (
        <StoryScene tone="from-[#10283a] via-[#111a27] to-[#07080c]" reduce={reduce}>
          <p className="text-sm font-semibold text-white/55">The artist on repeat</p>
          <div className="mt-6 flex max-w-2xl flex-col gap-6 md:flex-row md:items-end">
            <AlbumArt url={artistTrack?.artUrl} alt={topArtist.primary} className="aspect-square w-48 shadow-2xl shadow-black/50 md:w-64" />
            <div className="min-w-0">
              <h3 className="truncate text-4xl font-black tracking-tight md:text-6xl">{topArtist.primary}</h3>
              <p className="mt-4 text-sm text-white/50">{topArtist.plays} {topArtist.plays === 1 ? "play" : "plays"} counted</p>
            </div>
          </div>
        </StoryScene>
      ) : null}

      <StoryScene tone="from-[#31191b] via-[#171015] to-[#07080c]" reduce={reduce}>
        <p className="text-sm font-semibold text-white/55">Your listening stack</p>
        <ol className="mt-6 max-w-2xl space-y-3">
          {topSongs.map((song, index) => (
            <motion.li
              key={song.key}
              variants={reveal}
              transition={{ delay: reduce ? 0 : index * 0.06 }}
              className="flex items-center gap-4 rounded-2xl bg-white/[0.06] px-4 py-3 backdrop-blur-sm"
            >
              <span className="w-6 text-xl font-black text-white/35">{index + 1}</span>
              <AlbumArt url={tracksById.get(song.key)?.artUrl} alt={song.primary} className="h-12 w-12 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{song.primary}</p>
                <p className="truncate text-sm text-white/50">{song.secondary}</p>
              </div>
              <span className="text-sm text-white/45">{formatMinutes(song.seconds)}</span>
            </motion.li>
          ))}
        </ol>
      </StoryScene>
    </div>
  );
}

function StoryScene({ children, tone, reduce }: { children: React.ReactNode; tone: string; reduce: boolean | null }) {
  return (
    <motion.section
      className={`flex min-h-full snap-start items-center bg-gradient-to-br px-5 py-16 md:px-12 ${tone}`}
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ amount: 0.55, once: true }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      variants={reveal}
    >
      <div className="w-full">{children}</div>
    </motion.section>
  );
}
