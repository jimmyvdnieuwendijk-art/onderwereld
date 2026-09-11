"use client";

import { payHospital } from "@/lib/actions/combat";
import { HOSPITAL_PER_MINUTE } from "@/lib/constants";
import { formatMoney, remainingMs } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Countdown } from "@/components/game/countdown";
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
  const ms = remainingMs(p.inHospitalUntil);
  const hospitalized = ms > 0 || p.isDead;
  const cost = Math.max(1, Math.ceil(Math.max(ms, 1) / 60_000)) * HOSPITAL_PER_MINUTE;

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
                <p className="mt-1 font-heading text-2xl text-destructive">Opgenomen</p>
                <p className="text-sm text-muted-foreground">
                  Resterend: {ms > 0 ? <Countdown until={p.inHospitalUntil} /> : "wachten op ontslag"}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 font-heading text-2xl text-emerald-400">Vrij</p>
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
                Andere acties zijn geblokkeerd tot je vrijkomt of de privékliniek betaalt.
              </p>
              <p className="text-sm text-muted-foreground">
                Privékliniek: {formatMoney(cost)}. Daarna 55 HP.
              </p>
              <Button disabled={pending} onClick={() => run(() => payHospital())}>
                Privékliniek betalen
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
