"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { postShout } from "@/lib/actions/social";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGameAction, usePlayer } from "@/hooks/use-player";
import { Countdown } from "@/components/game/countdown";
import { DASHBOARD_LINKS } from "@/components/game/nav-config";
import type { PlayerSnapshot } from "@/types/game";
import { cn } from "@/lib/utils";

type LogRow = { id: string; type: string; message: string; createdAt: string };
type Shout = { id: string; body: string; createdAt: string; username: string };

export function DashboardClient({
  initialPlayer,
  logs,
}: {
  initialPlayer: PlayerSnapshot;
  logs: LogRow[];
}) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const { run, pending } = useGameAction();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const shouts = useQuery({
    queryKey: ["shoutbox"],
    queryFn: async () => {
      const res = await fetch("/api/shoutbox");
      if (!res.ok) throw new Error("shoutbox");
      return res.json() as Promise<Shout[]>;
    },
    staleTime: 6_000,
    refetchInterval: 8_000,
  });

  const statusChips = [
    p.inJailUntil ? { key: "jail", label: "Cel", until: p.inJailUntil } : null,
    p.inHospitalUntil ? { key: "hospital", label: "Ziekenhuis", until: p.inHospitalUntil } : null,
    p.travelEndAt
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

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card size="sm" className="border-border/50">
          <CardHeader className="border-b border-border/40">
            <CardTitle>Laatste gebeurtenissen</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nog geen geschiedenis.{" "}
                <Link href="/game/misdaden" prefetch className="text-primary hover:underline">
                  Pleeg een misdaad
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {logs.map((log) => (
                  <li key={log.id} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                    <p className="leading-snug">{log.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {log.type} · {formatDateTime(log.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="h-fit border-border/50">
          <CardHeader className="border-b border-border/40">
            <CardTitle>Shoutbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <div className="max-h-72 space-y-2 overflow-y-auto text-sm">
              {shouts.isLoading && !shouts.data && (
                <p className="text-muted-foreground">Straatgeluid laden…</p>
              )}
              {shouts.isError && (
                <p className="text-destructive">Shoutbox is even stil. Probeer opnieuw.</p>
              )}
              {(shouts.data ?? []).length === 0 && !shouts.isLoading && !shouts.isError && (
                <p className="text-muted-foreground">Stilte op straat.</p>
              )}
              {(shouts.data ?? []).map((row) => (
                <p key={row.id} className="leading-snug">
                  <span className="text-primary">{row.username}:</span> {row.body}
                </p>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                run(
                  () => postShout(text),
                  (result) => {
                    if (result.ok) {
                      setText("");
                      queryClient.invalidateQueries({ queryKey: ["shoutbox"] });
                    }
                  },
                );
              }}
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={180}
                placeholder="Roep iets de straat in…"
              />
              <Button type="submit" disabled={pending || text.trim().length < 2}>
                Shout
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
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
