"use client";

import { payBail } from "@/lib/actions/combat";
import { BAIL_PER_MINUTE } from "@/lib/constants";
import { detentionBuyoutCost, formatMoney, remainingMs } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Countdown, useNow } from "@/components/game/countdown";
import { useGameAction, useLivePlayer } from "@/hooks/use-player";
import type { PlayerSnapshot } from "@/types/game";

export function JailClient({
  initialPlayer,
  occupantCount,
}: {
  initialPlayer?: PlayerSnapshot;
  occupantCount: number;
}) {
  const p = useLivePlayer(initialPlayer)!;
  const { run, pending } = useGameAction();
  const now = useNow();
  const ms = remainingMs(p.inJailUntil, now);
  const jailed = ms > 0;
  const minutes = jailed ? Math.max(1, Math.ceil(ms / 60_000)) : 0;
  const cost = detentionBuyoutCost(ms, BAIL_PER_MINUTE);
  const canPay = jailed && p.cash >= cost;

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl">Gevangenis</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="bg-card/70">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Gedetineerden</p>
            <p className="mt-1 font-heading text-3xl text-primary">{occupantCount}</p>
            <p className="text-xs text-muted-foreground">spelers nu vast</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Jouw status</p>
            {jailed ? (
              <>
                <p className="mt-1 font-heading text-2xl text-destructive">Vast</p>
                <p className="text-sm text-muted-foreground">
                  Resterend: <Countdown until={p.inJailUntil} />
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 font-heading text-2xl text-emerald-400">Vrij</p>
                <p className="text-xs text-muted-foreground">Je zit niet vast.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{jailed ? "Achter de tralies" : "Je bent vrij"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {jailed ? (
            <>
              <p className="text-sm text-muted-foreground">
                Andere acties zijn geblokkeerd tot je uitzit of jezelf uitkoopt.
              </p>
              <div className="rounded-lg border border-[#d4a359]/35 bg-[#1a1510] px-3 py-2.5 text-sm">
                <p className="text-[11px] uppercase tracking-wide text-[#d4a359]">Jezelf uitkopen</p>
                <p className="mt-1 text-muted-foreground">
                  Borg = resterende minuten (naar boven) × {formatMoney(BAIL_PER_MINUTE)}.
                </p>
                <p className="mt-1 tabular-nums">
                  {minutes} min × {formatMoney(BAIL_PER_MINUTE)} ={" "}
                  <span className="font-heading text-[#d4a359]">{formatMoney(cost)}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Jouw cash: {formatMoney(p.cash)}
                  {!canPay ? " — te weinig om jezelf vrij te kopen." : ""}
                </p>
              </div>
              <Button disabled={pending || !canPay} onClick={() => run(() => payBail())}>
                Jezelf uitkopen · {formatMoney(cost)}
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
