"use client";

import { useEffect, useState } from "react";
import { formatClock, formatDuration, remainingMs } from "@/lib/format";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function Countdown({
  until,
  label,
  clock,
}: {
  until: string | null | undefined;
  label?: string;
  clock?: boolean;
}) {
  const now = useNow();
  const ms = remainingMs(until, now);
  if (ms <= 0) return null;

  return (
    <span className="tabular-nums text-primary">
      {label ? `${label} ` : ""}
      {clock ? formatClock(ms) : formatDuration(ms)}
    </span>
  );
}
