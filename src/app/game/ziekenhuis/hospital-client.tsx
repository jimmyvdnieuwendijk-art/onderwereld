"use client";

import { payHospital } from "@/lib/actions/combat";
import { HOSPITAL_PER_MINUTE } from "@/lib/constants";
import { detentionBuyoutCost, formatMoney, remainingMs } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Countdown, useNow } from "@/components/game/countdown";
import { useGameAction, useLivePlayer } from "@/hooks/use-player";
import type { PlayerSnapshot } from "@/types/game";

export function HospitalClient({
  initialPlayer,
  occupantCount,
}: {
  initialPlayer?: PlayerSnapshot;
  occupantCount: number;
}) {
  const p = useLivePlayer(initialPlayer)!;
  const { run, pending } = useGameAction();
  const now = useNow();
  const ms = remainingMs(p.inHospitalUntil, now);
  const hospitalized = ms > 0;
  const minutes = hospitalized ? Math.max(1, Math.ceil(ms / 60_000)) : 0;
  const cost = detentionBuyoutCost(ms, HOSPITAL_PER_MINUTE);
  const canPay = hospitalized && p.cash >= cost;

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl">Ziekenhuis</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="bg-card/70">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Patiënten</p>
            <p className="mt-1 font-heading text-3xl text-primary">{occupantCount}</p>
            <p className="text-xs text-muted-foreground">spelers nu opgenomen</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Jouw status</p>
            {hospitalized ? (
              <>
                <p className="mt-1 font-heading text-2xl text-destructive">
                  {p.isDead ? "Dood — opgenomen" : "Opgenomen"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Resterend: <Countdown until={p.inHospitalUntil} />
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 font-heading text-2xl text-emerald-400">Niet opgenomen</p>
                <p className="text-xs text-muted-foreground">HP {p.health}/100</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{hospitalized ? "Op de intensive care" : "Gezond genoeg"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hospitalized ? (
            <>
              <p className="text-sm text-muted-foreground">
                Andere acties zijn geblokkeerd tot je ontslagen wordt of de privékliniek betaalt.
              </p>
              <p className="text-sm text-muted-foreground">
                Privékliniek: {minutes} min × {formatMoney(HOSPITAL_PER_MINUTE)} = {formatMoney(cost)}.
                Daarna 55 HP. Cash: {formatMoney(p.cash)}
                {!canPay ? " — te weinig." : ""}
              </p>
              <Button disabled={pending || !canPay} onClick={() => run(() => payHospital())}>
                Privékliniek betalen · {formatMoney(cost)}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">
              De dokters hebben niets voor je te doen. Verblijf hangt af van je HP — kort, geen uren.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
