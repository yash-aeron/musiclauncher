import type { ReactNode } from "react";

export function GlassPanel({
  children,
  className = "",
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div className={`${strong ? "glass-strong" : "glass"} rounded-2xl ${className}`}>
      {children}
    </div>
  );
}
