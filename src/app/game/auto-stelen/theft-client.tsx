"use client";

import { stealCar } from "@/lib/actions/garage";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameAction, usePlayer } from "@/hooks/use-player";
import { Countdown } from "@/components/game/countdown";
import type { PlayerSnapshot } from "@/types/game";

type TypeRow = {
  id: string;
  name: string;
  baseValue: number;
  stealDifficulty: number;
  rarity: string;
  minRankOrder: number;
};

export function TheftClient({
  initialPlayer,
  types,
}: {
  initialPlayer: PlayerSnapshot;
  types: TypeRow[];
}) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const { run, pending } = useGameAction();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl">Auto stelen</h1>
        <p className="text-sm text-muted-foreground">
          Kost 10 energie. Moeilijkere auto&apos;s vragen een hogere rang.
        </p>
        <Countdown until={p.carTheftCooldownUntil} label="Wachten:" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {types.map((type) => {
          const locked = p.rank.order < type.minRankOrder;
          return (
            <Card key={type.id}>
              <CardHeader>
                <CardTitle className="font-heading">{type.name}</CardTitle>
                <CardDescription>
                  Waarde {formatMoney(type.baseValue)} · moeilijkheid {type.stealDifficulty}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="secondary">{type.rarity}</Badge>
                <div>
                  <Button disabled={pending || locked} onClick={() => run(() => stealCar(type.id))}>
                    {locked ? "Rang te laag" : "Stelen"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
