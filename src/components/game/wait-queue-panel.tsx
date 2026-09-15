"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Car,
  Cross,
  Dices,
  Dumbbell,
  Gavel,
  Plane,
  Shield,
  Skull,
  Users,
  VenetianMask,
  Zap,
} from "lucide-react";
import { formatClock } from "@/lib/format";
import { listWaitQueue, type WaitQueueExtras, type WaitQueueItem } from "@/lib/game/wait-queue";
import type { PlayerSnapshot } from "@/types/game";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Skull> = {
  jail: Gavel,
  hospital: Cross,
  travel: Plane,
  crime: Skull,
  "car-theft": Car,
  gym: Dumbbell,
  casino: Dices,
  heist: Users,
  energy: Zap,
  outbreak: VenetianMask,
  "street-protect": Shield,
};

export function WaitQueuePanel({
  player,
  extras = {},
}: {
  player: PlayerSnapshot;
  extras?: WaitQueueExtras;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const items = listWaitQueue(player, extras);
  const busy = items.filter((row) => row.status === "bezig");
  const ready = items.filter((row) => row.status === "klaar");

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#d4a359]">Beschikbaarheid</p>
        <h2 className="font-heading text-xl text-foreground">Wachttijden</h2>
        <p className="text-sm text-muted-foreground">
          Wat je nu kunt doen, en wat nog tikt. Klaar = actie open; bezig = wachten.
        </p>
      </div>

      {busy.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {busy.map((row) => (
            <WaitCard key={row.id} row={row} />
          ))}
        </div>
      )}

      {ready.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-emerald-400/80">Klaar nu</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ready.map((row) => (
              <WaitCard key={row.id} row={row} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function WaitCard({ row }: { row: WaitQueueItem }) {
  const Icon = ICONS[row.id] ?? Skull;
  const busy = row.status === "bezig";

  return (
    <Link
      href={row.href}
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        busy
          ? "border-[#d4a359]/35 bg-[#1a1510] hover:border-[#d4a359]/70"
          : "border-border/50 bg-card/40 hover:border-emerald-500/40 hover:bg-card/70",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border",
          busy
            ? "border-[#d4a359]/30 bg-[#d4a359]/10 text-[#d4a359]"
            : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-heading text-sm leading-tight">{row.label}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
              busy ? "bg-[#d4a359]/15 text-[#d4a359]" : "bg-emerald-500/15 text-emerald-400",
            )}
          >
            {busy ? "Bezig" : "Klaar"}
          </span>
        </span>
        <span className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className="truncate text-[11px] text-muted-foreground">{row.detail}</span>
          <span
            className={cn(
              "shrink-0 font-heading text-sm tabular-nums",
              busy ? "text-[#d4a359]" : "text-muted-foreground/80",
            )}
          >
            {busy ? formatClock(row.remainingMs) : "00:00"}
          </span>
        </span>
      </span>
    </Link>
  );
}
