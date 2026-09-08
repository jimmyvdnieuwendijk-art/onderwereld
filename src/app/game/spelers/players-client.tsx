"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PublicPlayer } from "@/types/game";

export function PlayersClient({ initial }: { initial: PublicPlayer[] }) {
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
      <h1 className="font-heading text-3xl">Spelers</h1>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(q.trim());
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek op naam…" />
        <Button type="submit">Zoeken</Button>
      </form>
      {submitted && query.isPending && <p className="text-muted-foreground">Laden…</p>}
      {query.isError && <p className="text-destructive">Kon spelers niet laden.</p>}
      {rows.length === 0 && !query.isPending && (
        <p className="text-muted-foreground">Geen spelers gevonden.</p>
      )}
      <div className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <div>
                <Link href={`/game/spelers/${row.username}`} className="font-heading text-lg text-primary hover:underline">
                  {row.username}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {row.rankName} · {row.currentCity}
                  {row.familyName ? ` · ${row.familyName}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.inJail && <Badge variant="destructive">Cel</Badge>}
                {row.inHospital && <Badge variant="destructive">Ziekenhuis</Badge>}
                <Badge variant="secondary">HP {row.health}</Badge>
                <Badge variant="outline">{row.killCount} kills</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
