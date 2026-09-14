"use client";

import { stealCarForm } from "@/lib/actions/garage";
import { formatMoney } from "@/lib/format";
import { theftEnergyCost } from "@/lib/vehicle-catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLivePlayer } from "@/hooks/use-player";
import { Countdown } from "@/components/game/countdown";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import { vehicleArt } from "@/lib/game-art";
import { CardArt } from "@/components/game/card-art";
import type { PlayerSnapshot } from "@/types/game";

type TypeRow = {
  id: string;
  slug: string;
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
  initialPlayer?: PlayerSnapshot;
  types: TypeRow[];
}) {
  const p = useLivePlayer(initialPlayer)!;
  const [state, action, pending] = useFormAction(stealCarForm);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl">Auto stelen</h1>
        <p className="text-sm text-muted-foreground">
          Energie schaalt met de auto (vanaf 10). Chop-shop betaalt de helft van de cataloguswaarde.
        </p>
        <Countdown until={p.carTheftCooldownUntil} label="Wachten:" />
        <div className="mt-2">
          <ActionFeedback state={state} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {types.map((type) => {
          const locked = p.rank.order < type.minRankOrder;
          const energyCost = theftEnergyCost(type.minRankOrder);
          return (
            <Card key={type.id} className="overflow-hidden">
              <CardHeader className="space-y-3">
                <CardArt src={vehicleArt(type.slug)} alt="" />
                <CardTitle className="font-heading">{type.name}</CardTitle>
                <CardDescription>
                  Waarde {formatMoney(type.baseValue)} · moeilijkheid {type.stealDifficulty} · {energyCost} energie
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="secondary">{type.rarity}</Badge>
                <form action={action}>
                  <input type="hidden" name="vehicleTypeId" value={type.id} />
                  <Button type="submit" disabled={pending || locked || p.isTraveling || p.energy < energyCost}>
                    {p.isTraveling
                      ? "In de lucht"
                      : locked
                        ? "Rang te laag"
                        : p.energy < energyCost
                          ? "Te weinig energie"
                          : "Stelen"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
