"use client";

import { useEffect, useState } from "react";
import { formatClock, formatDuration, remainingMs } from "@/lib/format";

export function Countdown({
  until,
  label,
  clock,
}: {
  until: string | null | undefined;
  label?: string;
  clock?: boolean;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = remainingMs(until);
  if (ms <= 0) return null;

  return (
    <span className="tabular-nums text-primary">
      {label ? `${label} ` : ""}
      {clock ? formatClock(ms) : formatDuration(ms)}
    </span>
  );
}
