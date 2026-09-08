"use client";

import { attemptCrime } from "@/lib/actions/crime";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGameAction, usePlayer } from "@/hooks/use-player";
import { Countdown } from "@/components/game/countdown";
import type { PlayerSnapshot } from "@/types/game";

type CrimeRow = {
  id: string;
  name: string;
  description: string;
  minRankOrder: number;
  successChance: number;
  cashMin: number;
  cashMax: number;
  expReward: number;
  energyCost: number;
  jailRiskChance: number;
  jailMinutes: number;
  cooldownSeconds: number;
};

export function CrimesClient({
  initialPlayer,
  crimes,
}: {
  initialPlayer: PlayerSnapshot;
  crimes: CrimeRow[];
}) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const { run, pending, feedback } = useGameAction();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl">Misdaden</h1>
        <p className="text-sm text-muted-foreground">
          Alleen klussen vanaf jouw rang. Energie kost, cel dreigt, cooldown telt. Energie: {p.energy}/100.
        </p>
        <p className="mt-1 text-sm">
          <Countdown until={p.crimeCooldownUntil} label="Wachten:" />
        </p>
        {feedback && (
          <p className={`mt-2 text-sm ${feedback.ok ? "text-primary" : "text-destructive"}`}>{feedback.message}</p>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {crimes.map((crime) => {
          const locked = p.rank.order < crime.minRankOrder;
          const tired = p.energy < crime.energyCost;
          return (
            <Card key={crime.id} className={locked ? "opacity-60" : ""}>
              <CardHeader>
                <CardTitle className="font-heading">{crime.name}</CardTitle>
                <CardDescription>{crime.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">
                    {formatMoney(crime.cashMin)}–{formatMoney(crime.cashMax)}
                  </Badge>
                  <Badge variant="outline">+{crime.expReward} exp</Badge>
                  <Badge variant="outline">{crime.energyCost} energie</Badge>
                  <Badge variant="outline">{crime.successChance}% basis</Badge>
                  <Badge variant="destructive">{crime.jailRiskChance}% cel</Badge>
                </div>
                <Button
                  type="button"
                  disabled={pending || locked}
                  onClick={() => run(() => attemptCrime(crime.id))}
                >
                  {locked ? "Rang te laag" : tired ? "Te weinig energie" : "Uitvoeren"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
