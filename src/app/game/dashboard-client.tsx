"use client";

import Link from "next/link";
import { Countdown, useNow } from "@/components/game/countdown";
import { remainingMs } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { DASHBOARD_LINKS } from "@/components/game/nav-config";
import { InventoryPanel } from "@/components/game/inventory-panel";
import { WaitQueuePanel } from "@/components/game/wait-queue-panel";
import { usePlayer } from "@/hooks/use-player";
import type { WaitQueueExtras } from "@/lib/game/wait-queue";
import type { PlayerSnapshot } from "@/types/game";
import { cn } from "@/lib/utils";

export function DashboardClient({
  initialPlayer,
  extras = {},
}: {
  initialPlayer?: PlayerSnapshot;
  extras?: WaitQueueExtras;
}) {
  const { data } = usePlayer(initialPlayer);
  const p = data ?? initialPlayer;
  const now = useNow();
  if (!p) return null;

  const statusChips = [
    remainingMs(p.inJailUntil, now) > 0 ? { key: "jail", label: "Cel", until: p.inJailUntil } : null,
    remainingMs(p.inHospitalUntil, now) > 0
      ? { key: "hospital", label: "Ziekenhuis", until: p.inHospitalUntil }
      : null,
    remainingMs(p.travelEndAt, now) > 0
      ? { key: "travel", label: `Vlucht ${p.travelDestinationName ?? ""}`.trim(), until: p.travelEndAt }
      : null,
  ].filter(Boolean) as { key: string; label: string; until: string }[];

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary/80">Hoofdmenu</p>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="font-heading text-2xl leading-none md:text-3xl">
              {p.displayName?.trim() || p.username}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="text-primary">{p.rank.name}</span>
              {" · "}
              {p.currentCityName}
              {p.family ? ` · ${p.family.name}` : " · solo"}
              {p.displayName?.trim() && p.displayName.trim() !== p.username ? ` · @${p.username}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statusChips.length === 0 ? (
              <Badge variant="secondary">Vrij op straat</Badge>
            ) : (
              statusChips.map((chip) => (
                <Badge key={chip.key} variant="destructive" className="gap-1 font-normal">
                  {chip.label}
                  <Countdown until={chip.until} />
                </Badge>
              ))
            )}
            {p.wantedLevel > 0 && <Badge variant="outline">Gezocht {p.wantedLevel}</Badge>}
          </div>
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Snel naar</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {DASHBOARD_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "group rounded-xl border border-border/60 bg-card/70 p-3 transition-colors",
                  "hover:border-primary/40 hover:bg-card",
                )}
              >
                <Icon className="mb-2 size-4 text-primary" />
                <p className="font-heading text-sm leading-tight">{item.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.hint}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Aanval" value={String(p.attackPower)} />
        <Stat
          label="Verdediging"
          value={`${p.defense}${p.hasMainEscort ? " +10%" : ""}`}
        />
        <Stat label="Gym" value={`K${p.strength} C${p.condition} V${p.fightSkill}`} />
        <Stat label="Garage" value={`${p.vehicleCount} auto's`} />
        <Stat label="Wapen" value={p.equippedWeapon?.name ?? "Ongewapend"} />
        <Stat label="Pantser" value={p.equippedArmor?.name ?? "Geen vest"} />
      </section>

      <InventoryPanel player={p} />

      <WaitQueuePanel player={p} extras={extras} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-medium">{value}</p>
    </div>
  );
}
