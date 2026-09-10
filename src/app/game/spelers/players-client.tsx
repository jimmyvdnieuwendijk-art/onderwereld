"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicPlayer } from "@/types/game";

export function PlayersClient({
  initial,
  selfId,
}: {
  initial: PublicPlayer[];
  selfId: string;
}) {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  const query = useQuery({
    queryKey: ["players", submitted],
    queryFn: async () => {
      const res = await fetch(`/api/players?q=${encodeURIComponent(submitted)}`);
      if (!res.ok) throw new Error("Laden mislukt");
      return res.json() as Promise<PublicPlayer[]>;
    },
    initialData: submitted ? undefined : initial,
    enabled: submitted.length > 0,
  });

  const rows = submitted ? (query.data ?? []) : initial;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl">Klassement</h1>
        <p className="text-sm text-muted-foreground">
          Wie het hoogst staat, niet waar die zit. Rang, exp, cash op zak en kills — locatie blijft privé.
        </p>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(q.trim());
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek op naam…" />
        <div className="flex gap-2">
          <Button type="submit">Zoeken</Button>
          {submitted ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQ("");
                setSubmitted("");
              }}
            >
              Klassement
            </Button>
          ) : null}
        </div>
      </form>
      {submitted && query.isPending && <p className="text-muted-foreground">Laden…</p>}
      {query.isError && <p className="text-destructive">Kon spelers niet laden.</p>}
      {rows.length === 0 && !query.isPending && (
        <p className="text-muted-foreground">Geen spelers gevonden.</p>
      )}
      {rows.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>Speler</TableHead>
                <TableHead>Rang</TableHead>
                <TableHead className="text-right">Exp</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">Kills</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const place = index + 1;
                const mine = row.id === selfId;
                return (
                  <TableRow key={row.id} className={cn(mine && "bg-red-950/35")}>
                    <TableCell className="font-heading tabular-nums text-muted-foreground">
                      {place <= 3 ? (
                        <span className={cn(place === 1 && "text-amber-400", place === 2 && "text-zinc-300", place === 3 && "text-orange-400")}>
                          {place}
                        </span>
                      ) : (
                        place
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/game/spelers/${row.username}`}
                          className="font-heading text-primary hover:underline"
                        >
                          {row.displayName}
                        </Link>
                        {row.displayName !== row.username && (
                          <span className="text-xs text-muted-foreground">@{row.username}</span>
                        )}
                        {mine && <Badge variant="secondary">Jij</Badge>}
                        {row.familyName && (
                          <span className="text-xs text-muted-foreground">{row.familyName}</span>
                        )}
                        {row.inJail && <Badge variant="destructive">Cel</Badge>}
                        {row.inHospital && <Badge variant="destructive">Ziekenhuis</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{row.rankName}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(row.exp)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(row.cash)}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.killCount}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
