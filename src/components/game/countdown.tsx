"use client";

import { useEffect, useState } from "react";
import { formatClock, formatDuration, remainingMs } from "@/lib/format";

const DEFAULT_TICK_MS = 1000;
const listeners = new Set<(now: number) => void>();
let sharedTimer: ReturnType<typeof setInterval> | null = null;

function startSharedClock() {
  if (sharedTimer || typeof window === "undefined") return;
  sharedTimer = setInterval(() => {
    const now = Date.now();
    for (const fn of listeners) fn(now);
  }, DEFAULT_TICK_MS);
}

/** One shared 1s clock for the whole game shell (nav countdowns + live overlays). */
export function useNow(intervalMs = DEFAULT_TICK_MS) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (intervalMs !== DEFAULT_TICK_MS) {
      const id = setInterval(() => setNow(Date.now()), intervalMs);
      return () => clearInterval(id);
    }
    const onTick = (value: number) => setNow(value);
    listeners.add(onTick);
    startSharedClock();
    return () => {
      listeners.delete(onTick);
      if (listeners.size === 0 && sharedTimer) {
        clearInterval(sharedTimer);
        sharedTimer = null;
      }
    };
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
