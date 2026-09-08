"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { postShout } from "@/lib/actions/social";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGameAction, usePlayer } from "@/hooks/use-player";
import { Countdown } from "@/components/game/countdown";
import type { PlayerSnapshot } from "@/types/game";

type LogRow = { id: string; type: string; message: string; createdAt: string };
type Shout = { id: string; body: string; createdAt: string; username: string };

export function DashboardClient({
  initialPlayer,
  logs,
}: {
  initialPlayer: PlayerSnapshot;
  logs: LogRow[];
}) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const { run, pending } = useGameAction();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const shouts = useQuery({
    queryKey: ["shoutbox"],
    queryFn: async () => {
      const res = await fetch("/api/shoutbox");
      if (!res.ok) throw new Error("shoutbox");
      return res.json() as Promise<Shout[]>;
    },
    refetchInterval: 4000,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Welkom terug, {p.username}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Rang <span className="text-primary">{p.rank.name}</span> in {p.currentCityName}.{" "}
              {p.family ? `Familie ${p.family.name}.` : "Je loopt solo."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Aanval {p.attackPower}</Badge>
              <Badge variant="secondary">Verdediging {p.defense}</Badge>
              <Badge variant="secondary">{p.vehicleCount} auto&apos;s</Badge>
              <Badge variant="outline">{formatMoney(p.cash)} cash</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {p.inJailUntil && (
                <p>
                  Cel: <Countdown until={p.inJailUntil} />
                </p>
              )}
              {p.inHospitalUntil && (
                <p>
                  Ziekenhuis: <Countdown until={p.inHospitalUntil} />
                </p>
              )}
              {p.travelEndAt && (
                <p>
                  Vlucht naar {p.travelDestinationName}: <Countdown until={p.travelEndAt} clock />
                </p>
              )}
              {p.equippedWeapon && <p>Wapen: {p.equippedWeapon.name}</p>}
              {p.equippedArmor && <p>Bescherming: {p.equippedArmor.name}</p>}
            </div>
            <p className="text-sm">
              <Link href="/game/vliegveld" className="text-primary underline">
                Naar het vliegveld
              </Link>{" "}
              — tickets, privéjet, smokkelmarkt.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Laatste gebeurtenissen</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen geschiedenis. Ga een misdaad plegen.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {logs.map((log) => (
                  <li key={log.id} className="border-b border-border/40 pb-2 last:border-0">
                    <p>{log.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.type} · {formatDateTime(log.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Shoutbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {(shouts.data ?? []).length === 0 && (
              <p className="text-muted-foreground">Stilte op straat.</p>
            )}
            {(shouts.data ?? []).map((row) => (
              <p key={row.id}>
                <span className="text-primary">{row.username}:</span> {row.body}
              </p>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              run(
                () => postShout(text),
                (result) => {
                  if (result.ok) {
                    setText("");
                    queryClient.invalidateQueries({ queryKey: ["shoutbox"] });
                  }
                },
              );
            }}
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={180}
              placeholder="Roep iets de straat in…"
            />
            <Button type="submit" disabled={pending || text.trim().length < 2}>
              Shout
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
