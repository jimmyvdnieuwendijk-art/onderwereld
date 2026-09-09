"use client";

import { trainGymForm, unlockGymFloorForm } from "@/lib/actions/gym";
import {
  GYM_LEVELS,
  MAX_CONDITION,
  MAX_FIGHT_SKILL,
  MAX_STRENGTH,
  MIN_TRAIN_HEALTH,
  canUnlockFloor,
  energyRefundAmount,
  gymAttackBonus,
  gymDefenseBonus,
} from "@/lib/gym";
import { MAX_ENERGY } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { gymArt } from "@/lib/game-art";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CardArt } from "@/components/game/card-art";
import { Countdown } from "@/components/game/countdown";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import { usePlayer } from "@/hooks/use-player";
import { cn } from "@/lib/utils";
import type { PlayerSnapshot } from "@/types/game";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function Meter({ label, value, max, barClass }: { label: string; value: number; max: number; barClass: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-fuchsia-500/20">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function GymClient({ initialPlayer }: { initialPlayer: PlayerSnapshot }) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const router = useRouter();
  const [trainState, trainAction, training] = useFormAction(trainGymForm);
  const [unlockState, unlockAction, unlocking] = useFormAction(unlockGymFloorForm);
  const busy = training || unlocking;
  const cooling = !!(p.gymCooldownUntil && new Date(p.gymCooldownUntil).getTime() > Date.now());
  const atk = gymAttackBonus(p.strength, p.fightSkill);
  const def = gymDefenseBonus(p.condition, p.fightSkill);

  useEffect(() => {
    if (trainState?.ok || unlockState?.ok) router.refresh();
  }, [trainState, unlockState, router]);

  useEffect(() => {
    if (!p.gymCooldownUntil) return;
    const ms = new Date(p.gymCooldownUntil).getTime() - Date.now() + 400;
    if (ms <= 0) {
      router.refresh();
      return;
    }
    const timer = setTimeout(() => router.refresh(), ms);
    return () => clearTimeout(timer);
  }, [p.gymCooldownUntil, router]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-fuchsia-500/45 shadow-[0_0_32px_rgba(217,70,239,0.18)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${gymArt("header")})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-fuchsia-950/50 to-cyan-950/25" />
        <div className="relative space-y-3 px-5 py-8 md:px-8">
          <p className="text-[11px] tracking-[0.28em] text-cyan-300 uppercase">Grindhouse · neon-noir</p>
          <h1 className="font-heading text-3xl text-fuchsia-100 md:text-4xl">Gym</h1>
          <p className="max-w-xl text-sm text-zinc-200">
            Vijf verdiepingen onder de straat. Roest, magenta neon, geen spiegels. Gym-rep opent de volgende vloer —
            plus een eenmalige deurprijs. Energie eraf, dan een recovery-procent terug. Eén cooldown voor het hele
            gebouw.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge className="bg-fuchsia-700 text-white">Vloer {p.gymFloor}/5</Badge>
            <Badge variant="outline" className="border-cyan-400/40 text-cyan-200">
              Gym-rep {p.gymExp}
            </Badge>
            <Badge variant="outline" className="border-fuchsia-400/40 text-fuchsia-100">
              Energie {p.energy}/{MAX_ENERGY}
            </Badge>
            <Badge className="bg-cyan-900 text-cyan-100">PvP +{atk} ATK / +{def} DEF</Badge>
          </div>
          {cooling && p.gymCooldownUntil && (
            <p className="text-sm text-cyan-200">
              <Countdown until={p.gymCooldownUntil} label="Dweilen:" />
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <ActionFeedback state={trainState} />
        <ActionFeedback state={unlockState} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-fuchsia-500/30 bg-zinc-950/80 shadow-[0_0_18px_rgba(217,70,239,0.08)]">
          <CardHeader>
            <CardTitle className="font-heading text-fuchsia-100">Jouw lijf</CardTitle>
            <CardDescription>
              Kracht en vechtkunst tellen bij aanval. Conditie en vechtkunst bij verdediging. Wapen/vest blijven extra.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Meter label="Kracht" value={p.strength} max={MAX_STRENGTH} barClass="bg-gradient-to-r from-fuchsia-600 to-red-500" />
            <Meter label="Conditie" value={p.condition} max={MAX_CONDITION} barClass="bg-gradient-to-r from-cyan-500 to-fuchsia-400" />
            <Meter label="Vechtkunst" value={p.fightSkill} max={MAX_FIGHT_SKILL} barClass="bg-gradient-to-r from-fuchsia-500 to-cyan-300" />
            <Meter label="Energie" value={p.energy} max={MAX_ENERGY} barClass="bg-gradient-to-r from-cyan-600 to-fuchsia-500" />
            <p className="text-xs text-muted-foreground">
              Buiten de gym: +2 energie per 10 seconden, max {MAX_ENERGY}. Energiedrank in de winkel +40. Training
              kost eerst energie, daarna een recovery-procent van het maximum.
            </p>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/25 bg-zinc-950/70">
          <CardHeader>
            <CardTitle className="font-heading">Hoe je omhoog komt</CardTitle>
            <CardDescription>Altijd de volgende vloer, nooit overslaan. Kelder is gratis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {GYM_LEVELS.map((row) => (
              <div
                key={row.level}
                className={cn(
                  "flex items-center justify-between rounded-md border px-2 py-1.5",
                  row.level === p.gymFloor
                    ? "border-cyan-400/60 bg-fuchsia-950/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                    : "border-border/50",
                )}
              >
                <span>
                  L{row.level} {row.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {row.level === 1
                    ? "open"
                    : row.level <= p.gymFloor
                      ? "open"
                      : `${row.unlockGymExp} rep · ${formatMoney(row.unlockCash)}`}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {GYM_LEVELS.map((row) => {
          const opened = row.level <= p.gymFloor;
          const nextUnlock = canUnlockFloor(p.gymFloor, p.gymExp, row);
          const canBuy = !opened && nextUnlock.ok && p.cash >= row.unlockCash;
          const tired = p.energy < row.energyCost;
          const broke = p.cash < row.cashCost;
          const frail = p.health < MIN_TRAIN_HEALTH;
          return (
            <Card
              key={row.level}
              className={cn(
                "overflow-hidden",
                opened
                  ? "border-fuchsia-500/40 shadow-[0_0_16px_rgba(217,70,239,0.12)]"
                  : "border-border/50 opacity-80",
              )}
            >
              <CardArt src={row.image} alt={row.name} />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>
                    L{row.level} {row.name}
                  </span>
                  {opened ? <Badge>Open</Badge> : <Badge variant="secondary">Op slot</Badge>}
                </CardTitle>
                <CardDescription>{row.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {row.exercises.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {row.strength > 0 && <Badge variant="secondary">+{row.strength} kracht</Badge>}
                  {row.condition > 0 && <Badge variant="secondary">+{row.condition} conditie</Badge>}
                  {row.fightSkill > 0 && <Badge variant="secondary">+{row.fightSkill} vechtkunst</Badge>}
                  <Badge variant="outline">+{row.energyRefundPct}% energie</Badge>
                  <Badge variant="outline">−{row.energyCost} energie</Badge>
                  {row.cashCost > 0 && <Badge variant="outline">{formatMoney(row.cashCost)}</Badge>}
                  <Badge variant="outline">+{row.gymExp} rep</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cooldown {Math.round(row.cooldownMs / 1000)} sec na deze set — geldt voor heel Grindhouse.
                </p>

                {opened ? (
                  <form action={trainAction}>
                    <input type="hidden" name="level" value={row.level} />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={busy || cooling || tired || broke || frail || p.isTraveling}
                    >
                      {p.isTraveling
                        ? "In de lucht"
                        : cooling
                          ? "Cooldown"
                          : frail
                            ? "Te kapot"
                            : tired
                              ? "Te weinig energie"
                              : broke
                                ? "Te weinig cash"
                                : "Train"}
                    </Button>
                  </form>
                ) : (
                  <form action={unlockAction}>
                    <input type="hidden" name="level" value={row.level} />
                    <Button type="submit" variant="secondary" className="w-full" disabled={busy || !canBuy}>
                      {!nextUnlock.ok
                        ? nextUnlock.reason
                        : p.cash < row.unlockCash
                          ? `Toegang ${formatMoney(row.unlockCash)}`
                          : `Koop toegang ${formatMoney(row.unlockCash)}`}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
