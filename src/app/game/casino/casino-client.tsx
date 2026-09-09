"use client";

import {
  dealPokerForm,
  drawPokerForm,
  foldPokerForm,
  peekPokerForm,
  playPitForm,
  playRouletteForm,
  playStreetForm,
} from "@/lib/actions/casino";
import {
  CASINO_MIN_BET,
  KNIFE_ANTE,
  PEEK_COST,
  fightOdds,
  maxBetFor,
  pitOdds,
} from "@/lib/casino";
import { casinoArt } from "@/lib/game-art";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CardArt } from "@/components/game/card-art";
import { Countdown } from "@/components/game/countdown";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import { usePlayer } from "@/hooks/use-player";
import type { PlayerSnapshot } from "@/types/game";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const RACE_BOARD = pitOdds();
const FIGHT_BOARD = fightOdds();

export function CasinoClient({ initialPlayer }: { initialPlayer: PlayerSnapshot }) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const router = useRouter();
  const [rouletteState, rouletteAction, spinning] = useFormAction(playRouletteForm);
  const [streetState, streetAction, rolling] = useFormAction(playStreetForm);
  const [pitState, pitAction, racing] = useFormAction(playPitForm);
  const [dealState, dealAction, dealing] = useFormAction(dealPokerForm);
  const [drawState, drawAction, drawing] = useFormAction(drawPokerForm);
  const [peekState, peekAction, peeking] = useFormAction(peekPokerForm);
  const [foldState, foldAction, folding] = useFormAction(foldPokerForm);

  const busy = spinning || rolling || racing || dealing || drawing || peeking || folding;
  const cooling = !!(p.casinoCooldownUntil && new Date(p.casinoCooldownUntil).getTime() > Date.now());
  const peekReady = !(p.casinoPeekUntil && new Date(p.casinoPeekUntil).getTime() > Date.now());
  const cap = maxBetFor(p.cash);
  const tableOpen = !p.casinoPoker;
  const [pitKind, setPitKind] = useState<"race" | "fight">("race");
  const pitBoardRows = pitKind === "fight" ? FIGHT_BOARD : RACE_BOARD;

  useEffect(() => {
    if ([rouletteState, streetState, pitState, dealState, drawState, peekState, foldState].some((row) => row)) {
      router.refresh();
    }
  }, [rouletteState, streetState, pitState, dealState, drawState, peekState, foldState, router]);

  useEffect(() => {
    if (!p.casinoCooldownUntil) return;
    const ms = new Date(p.casinoCooldownUntil).getTime() - Date.now() + 400;
    if (ms <= 0) {
      router.refresh();
      return;
    }
    const timer = setTimeout(() => router.refresh(), ms);
    return () => clearTimeout(timer);
  }, [p.casinoCooldownUntil, router]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-emerald-500/30">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${casinoArt("header")})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="relative space-y-3 px-5 py-8 md:px-8">
          <p className="text-[11px] tracking-[0.28em] text-emerald-300 uppercase">Casino Royale · huisvoordeel</p>
          <h1 className="font-heading text-3xl text-white md:text-4xl">Casino</h1>
          <p className="max-w-xl text-sm text-zinc-200">
            Fluweel boven, mes onder het vilt. Vier tafels, allemaal tegen het huis of de kooi. Inzet{" "}
            {formatMoney(CASINO_MIN_BET)}–{formatMoney(cap)}. Acht seconden tussen spins zodat de kluis het houdt.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge className="bg-emerald-800 text-white">Cash {formatMoney(p.cash)}</Badge>
            <Badge variant="outline">Max inzet {formatMoney(cap)}</Badge>
            {cooling && p.casinoCooldownUntil && (
              <Badge variant="secondary">
                <Countdown until={p.casinoCooldownUntil} label="Tafel:" />
              </Badge>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <ActionFeedback state={rouletteState} />
        <ActionFeedback state={streetState} />
        <ActionFeedback state={pitState} />
        <ActionFeedback state={dealState} />
        <ActionFeedback state={drawState} />
        <ActionFeedback state={peekState} />
        <ActionFeedback state={foldState} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden border-emerald-500/25">
          <CardArt src={casinoArt("roulette")} alt="Roulette" />
          <CardHeader>
            <CardTitle className="font-heading">Roulette</CardTitle>
            <CardDescription>
              Europees wiel 0–36. Rood/zwart 1:1 (18/37, huis ~2,7%). Dozen en kolommen 2:1 (12/37). Enkel getal 35:1
              (1/37). Nul is van het huis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={rouletteAction} className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Type
                  <select name="kind" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" defaultValue="color">
                    <option value="color">Rood / zwart (1:1)</option>
                    <option value="dozen">Dozijn (2:1)</option>
                    <option value="column">Kolom (2:1)</option>
                    <option value="straight">Enkel getal (35:1)</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Keuze
                  <select name="pick" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" defaultValue="rood">
                    <option value="rood">Rood</option>
                    <option value="zwart">Zwart</option>
                    <option value="1">Dozijn / kolom 1</option>
                    <option value="2">Dozijn / kolom 2</option>
                    <option value="3">Dozijn / kolom 3</option>
                    {Array.from({ length: 37 }, (_, n) => (
                      <option key={n} value={String(n)}>
                        Getal {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Input type="number" name="stake" min={CASINO_MIN_BET} max={cap} defaultValue={50} />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" name="cheat" value="1" className="size-4" />
                Vals spel (stub): 8% extra geluk, 35% kans gezocht +12 en inzet kwijt
              </label>
              <Button type="submit" className="w-full" disabled={busy || cooling || !tableOpen || p.isTraveling}>
                Draai het wiel
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-red-500/25">
          <CardArt src={casinoArt("poker")} alt="Poker" />
          <CardHeader>
            <CardTitle className="font-heading">Underground poker</CardTitle>
            <CardDescription>
              Five-card draw tegen de huisdealer. Mes-ante {formatMoney(KNIFE_ANTE)} verplicht. 10% rake op de pot.
              Eén blik op twee dealerkaarten per nacht ({formatMoney(PEEK_COST)}).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {p.casinoPoker ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {p.casinoPoker.cards.map((card) => (
                    <span
                      key={card}
                      className="rounded-md border border-emerald-500/40 bg-black/40 px-2 py-1 font-heading text-lg"
                    >
                      {card}
                    </span>
                  ))}
                </div>
                {p.casinoPoker.peeked && p.casinoPoker.dealerPeek.length > 0 && (
                  <p className="text-sm text-amber-200">
                    Dealer (peek): {p.casinoPoker.dealerPeek.join(" · ")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  In de pot: {formatMoney(p.casinoPoker.ante + p.casinoPoker.knife)} van jou, evenveel van het huis.
                  Vink max 3 kaarten om te wisselen.
                </p>
                <form action={drawAction} className="space-y-2">
                  <div className="flex flex-wrap gap-3 text-sm">
                    {p.casinoPoker.cards.map((card, idx) => (
                      <label key={`${card}-${idx}`} className="flex items-center gap-1">
                        <input type="checkbox" name="d" value={idx} className="size-4" />
                        Weg {card}
                      </label>
                    ))}
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    Draw & showdown
                  </Button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <form action={peekAction}>
                    <Button type="submit" size="sm" variant="secondary" disabled={busy || p.casinoPoker.peeked || !peekReady}>
                      {!peekReady ? "Peek op is" : p.casinoPoker.peeked ? "Al gekeken" : `Omkoop-peek ${formatMoney(PEEK_COST)}`}
                    </Button>
                  </form>
                  <form action={foldAction}>
                    <Button type="submit" size="sm" variant="ghost" disabled={busy}>
                      Fold
                    </Button>
                  </form>
                </div>
                {!peekReady && p.casinoPeekUntil && (
                  <p className="text-xs text-muted-foreground">
                    Volgende peek: <Countdown until={p.casinoPeekUntil} />
                  </p>
                )}
              </>
            ) : (
              <form action={dealAction} className="space-y-3">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Ante (plus {formatMoney(KNIFE_ANTE)} mes)
                  <Input type="number" name="ante" min={CASINO_MIN_BET} max={cap} defaultValue={40} />
                </label>
                <Button type="submit" className="w-full" disabled={busy || cooling || p.isTraveling}>
                  Ga zitten
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-amber-500/25">
          <CardArt src={casinoArt("street")} alt="De Straat" />
          <CardHeader>
            <CardTitle className="font-heading">De Straat</CardTitle>
            <CardDescription>
              Eén worp, 2d6. 7 of 11 wint 1:1. 2, 3, 12 craps. 4 en 10 zijn extra bust t.o.v. eerlijke craps. 5, 6, 8,
              9 push. Huis ~5,6%.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={streetAction} className="space-y-3">
              <Input type="number" name="stake" min={CASINO_MIN_BET} max={cap} defaultValue={40} />
              <Button type="submit" className="w-full" disabled={busy || cooling || !tableOpen || p.isTraveling}>
                Gooi
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-fuchsia-500/25">
          <CardArt src={casinoArt("pit")} alt="Hondenkooi en illegale gevechten" />
          <CardHeader>
            <CardTitle className="font-heading">Hondenkooi / illegale gevechten</CardTitle>
            <CardDescription>
              Greyhound-races of een kooigevecht onder de zaal. Vier starters, 12% vig op de uitbetaling. Het bord somt
              nooit tot 100%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={pitKind === "race" ? "default" : "outline"}
                onClick={() => setPitKind("race")}
              >
                Hondenrace
              </Button>
              <Button
                type="button"
                size="sm"
                variant={pitKind === "fight" ? "default" : "outline"}
                onClick={() => setPitKind("fight")}
              >
                Illegaal gevecht
              </Button>
            </div>
            <form key={pitKind} action={pitAction} className="space-y-3">
              <input type="hidden" name="kind" value={pitKind} />
              <div className="space-y-2">
                {pitBoardRows.map((row, index) => (
                  <label key={row.key} className="flex items-start gap-2 rounded-md border border-border/60 px-2 py-1.5 text-sm">
                    <input type="radio" name="pick" value={row.key} defaultChecked={index === 0} className="mt-1" />
                    <span>
                      <span className="font-medium">{row.name}</span>
                      <span className="text-muted-foreground"> · {row.decimal.toFixed(2)}× · {row.blurb}</span>
                    </span>
                  </label>
                ))}
              </div>
              <Input type="number" name="stake" min={CASINO_MIN_BET} max={cap} defaultValue={40} />
              <Button type="submit" className="w-full" disabled={busy || cooling || !tableOpen || p.isTraveling}>
                {pitKind === "fight" ? "Zet op het gevecht" : "Zet op de race"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
