"use client";

import { payBail } from "@/lib/actions/combat";
import { BAIL_PER_MINUTE } from "@/lib/constants";
import { formatMoney, remainingMs } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Countdown } from "@/components/game/countdown";
import { useGameAction, usePlayer } from "@/hooks/use-player";
import type { PlayerSnapshot } from "@/types/game";

export function JailClient({ initialPlayer }: { initialPlayer: PlayerSnapshot }) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const { run, pending } = useGameAction();
  const ms = remainingMs(p.inJailUntil);
  const cost = Math.max(1, Math.ceil(ms / 60_000)) * BAIL_PER_MINUTE;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 font-heading text-3xl">Gevangenis</h1>
      <Card>
        <CardHeader>
          <CardTitle>{ms > 0 ? "Achter de tralies" : "Je bent vrij"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ms > 0 ? (
            <>
              <p>
                Resterend: <Countdown until={p.inJailUntil} />
              </p>
              <p className="text-sm text-muted-foreground">
                Borg: {formatMoney(cost)}. Wachten is gratis.
              </p>
              <Button disabled={pending} onClick={() => run(() => payBail())}>
                Borg betalen
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">De cellen zijn leeg — voor jou althans.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
