import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const Play = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M8 5v14l11-7z" />
  </svg>
);
export const Pause = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);
export const Prev = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M6 5v14h2V5H6zm3 7l10 7V5l-10 7z" />
  </svg>
);
export const Next = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M16 5v14h2V5h-2zM5 5v14l10-7L5 5z" />
  </svg>
);
export const Shuffle = (p: P) => (
  <svg {...base(p)}>
    <path d="M16 3h5v5" />
    <path d="M4 20L21 3" />
    <path d="M21 16v5h-5" />
    <path d="M15 15l6 6" />
    <path d="M4 4l5 5" />
  </svg>
);
export const Repeat = (p: P) => (
  <svg {...base(p)}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11v-1a4 4 0 014-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v1a4 4 0 01-4 4H3" />
  </svg>
);
export const VolumeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 010 7" />
    <path d="M18.5 5.5a9 9 0 010 13" />
  </svg>
);
export const LibraryIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
export const WrappedIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 3v18h18" />
    <rect x="7" y="12" width="3" height="6" rx="1" fill="currentColor" stroke="none" />
    <rect x="12" y="8" width="3" height="10" rx="1" fill="currentColor" stroke="none" />
    <rect x="17" y="4" width="3" height="14" rx="1" fill="currentColor" stroke="none" />
  </svg>
);
export const Chevron = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const MusicNote = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" fill="currentColor" stroke="none" />
    <circle cx="18" cy="16" r="3" fill="currentColor" stroke="none" />
  </svg>
);
export const Pencil = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);
export const Close = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
);
export const QueueIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6h13" />
    <path d="M3 12h13" />
    <path d="M3 18h9" />
    <path d="M19 12v6" />
    <path d="M16 15h6" />
  </svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);
export const TrashIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
  </svg>
);
export const MoreIcon = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);
export const PlaylistIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6h13" />
    <path d="M3 11h13" />
    <path d="M3 16h7" />
    <path d="M18 8v8.5" />
    <circle cx="16" cy="17" r="2.5" fill="currentColor" stroke="none" />
    <path d="M18 8l3-1v3" />
  </svg>
);
export const CrossfadeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 18C8 18 10 6 16 6h6" />
    <path d="M2 6c6 0 8 12 14 12h6" />
  </svg>
);
