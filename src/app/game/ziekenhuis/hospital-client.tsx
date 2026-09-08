"use client";

import { payHospital } from "@/lib/actions/combat";
import { HOSPITAL_PER_MINUTE } from "@/lib/constants";
import { formatMoney, remainingMs } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Countdown } from "@/components/game/countdown";
import { useGameAction, usePlayer } from "@/hooks/use-player";
import type { PlayerSnapshot } from "@/types/game";

export function HospitalClient({ initialPlayer }: { initialPlayer: PlayerSnapshot }) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const { run, pending } = useGameAction();
  const ms = remainingMs(p.inHospitalUntil);
  const cost = Math.max(1, Math.ceil(ms / 60_000)) * HOSPITAL_PER_MINUTE;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 font-heading text-3xl">Ziekenhuis</h1>
      <Card>
        <CardHeader>
          <CardTitle>{ms > 0 || p.isDead ? "Op de intensive care" : "Gezond genoeg"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ms > 0 || p.isDead ? (
            <>
              <p>
                Herstel: <Countdown until={p.inHospitalUntil} />
              </p>
              <p className="text-sm text-muted-foreground">
                Privékliniek: {formatMoney(cost)}. Daarna 55 HP.
              </p>
              <Button disabled={pending} onClick={() => run(() => payHospital())}>
                Privékliniek betalen
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">De dokters hebben niets voor je te doen. HP: {p.health}.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
