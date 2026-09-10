"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FamilyBoardRow, PublicPlayer } from "@/types/game";

type PlayerSort = "rank" | "kills" | "cash" | "exp" | "health";
type FamilySort = "members" | "bank" | "name";
type Dir = "asc" | "desc";

const PLAYER_BOARDS: { id: PlayerSort; label: string }[] = [
  { id: "rank", label: "Rang" },
  { id: "kills", label: "Kills" },
  { id: "cash", label: "Geld" },
  { id: "exp", label: "Exp" },
  { id: "health", label: "HP" },
];

function cmp(a: number | string, b: number | string, dir: Dir) {
  const av = typeof a === "string" ? a.toLocaleLowerCase("nl") : a;
  const bv = typeof b === "string" ? b.toLocaleLowerCase("nl") : b;
  if (av < bv) return dir === "asc" ? -1 : 1;
  if (av > bv) return dir === "asc" ? 1 : -1;
  return 0;
}

function sortPlayers(rows: PublicPlayer[], key: PlayerSort, dir: Dir) {
  return [...rows].sort((a, b) => {
    if (key === "rank") {
      return cmp(a.rankOrder, b.rankOrder, dir) || cmp(a.exp, b.exp, dir);
    }
    if (key === "kills") return cmp(a.killCount, b.killCount, dir) || cmp(a.exp, b.exp, dir);
    if (key === "cash") return cmp(a.cash, b.cash, dir);
    if (key === "health") return cmp(a.health, b.health, dir);
    return cmp(a.exp, b.exp, dir);
  });
}

function sortFamilies(rows: FamilyBoardRow[], key: FamilySort, dir: Dir) {
  return [...rows].sort((a, b) => {
    if (key === "members") return cmp(a.members, b.members, dir) || cmp(a.bank, b.bank, dir);
    if (key === "bank") return cmp(a.bank, b.bank, dir) || cmp(a.members, b.members, dir);
    return cmp(a.name, b.name, dir);
  });
}

function SortMark({ active, dir }: { active: boolean; dir: Dir }) {
  if (!active) return null;
  const Icon = dir === "asc" ? ArrowUp : ArrowDown;
  return <Icon className="ml-0.5 inline size-3.5" />;
}

export function PlayersClient({
  initial,
  families,
  selfId,
  initialTab = "players",
}: {
  initial: PublicPlayer[];
  families: FamilyBoardRow[];
  selfId: string;
  initialTab?: "players" | "families";
}) {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [tab, setTab] = useState(initialTab);
  const [playerSort, setPlayerSort] = useState<PlayerSort>("rank");
  const [playerDir, setPlayerDir] = useState<Dir>("desc");
  const [familySort, setFamilySort] = useState<FamilySort>("members");
  const [familyDir, setFamilyDir] = useState<Dir>("desc");

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

  const rawRows = submitted ? (query.data ?? []) : initial;
  const rows = useMemo(
    () => sortPlayers(rawRows, playerSort, playerDir),
    [rawRows, playerSort, playerDir],
  );
  const familyRows = useMemo(
    () => sortFamilies(families, familySort, familyDir),
    [families, familySort, familyDir],
  );

  function togglePlayerSort(key: PlayerSort) {
    if (playerSort === key) setPlayerDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setPlayerSort(key);
      setPlayerDir("desc");
    }
  }

  function toggleFamilySort(key: FamilySort) {
    if (familySort === key) setFamilyDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setFamilySort(key);
      setFamilyDir(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl">Klassement</h1>
        <p className="text-sm text-muted-foreground">
          Sorteer op rang, kills of geld. Families hebben een eigen bord. Locatie blijft privé.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as "players" | "families")}>
        <TabsList>
          <TabsTrigger value="players">Spelers</TabsTrigger>
          <TabsTrigger value="families">Families</TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="mt-4 space-y-3">
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

          <div className="flex flex-wrap gap-1.5">
            {PLAYER_BOARDS.map((board) => {
              const active = playerSort === board.id;
              return (
                <Button
                  key={board.id}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => togglePlayerSort(board.id)}
                >
                  {board.label}
                  <SortMark active={active} dir={playerDir} />
                </Button>
              );
            })}
          </div>

          {submitted && query.isPending && <p className="text-muted-foreground">Laden…</p>}
          {query.isError && <p className="text-destructive">Kon spelers niet laden.</p>}
          {rows.length === 0 && !query.isPending && (
            <p className="rounded-lg border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
              Geen spelers gevonden.
            </p>
          )}
          {rows.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-card/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>Speler</TableHead>
                    <TableHead>
                      <button type="button" className="inline-flex items-center" onClick={() => togglePlayerSort("rank")}>
                        Rang
                        <SortMark active={playerSort === "rank"} dir={playerDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="ml-auto inline-flex items-center" onClick={() => togglePlayerSort("exp")}>
                        Exp
                        <SortMark active={playerSort === "exp"} dir={playerDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="ml-auto inline-flex items-center" onClick={() => togglePlayerSort("cash")}>
                        Geld
                        <SortMark active={playerSort === "cash"} dir={playerDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="ml-auto inline-flex items-center" onClick={() => togglePlayerSort("kills")}>
                        Kills
                        <SortMark active={playerSort === "kills"} dir={playerDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="ml-auto inline-flex items-center" onClick={() => togglePlayerSort("health")}>
                        HP
                        <SortMark active={playerSort === "health"} dir={playerDir} />
                      </button>
                    </TableHead>
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
                            <span
                              className={cn(
                                place === 1 && "text-amber-400",
                                place === 2 && "text-zinc-300",
                                place === 3 && "text-orange-400",
                              )}
                            >
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
                        <TableCell className="text-right tabular-nums">{row.health}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="families" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Families gerangschikt op leden, kas of naam.{" "}
            <Link href="/game/familie" className="text-primary hover:underline">
              Naar familie
            </Link>
          </p>
          {familyRows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
              Nog geen families.
            </p>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>
                      <button type="button" className="inline-flex items-center" onClick={() => toggleFamilySort("name")}>
                        Familie
                        <SortMark active={familySort === "name"} dir={familyDir} />
                      </button>
                    </TableHead>
                    <TableHead>Leider</TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="ml-auto inline-flex items-center" onClick={() => toggleFamilySort("members")}>
                        Leden
                        <SortMark active={familySort === "members"} dir={familyDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="ml-auto inline-flex items-center" onClick={() => toggleFamilySort("bank")}>
                        Kas
                        <SortMark active={familySort === "bank"} dir={familyDir} />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {familyRows.map((row, index) => {
                    const place = index + 1;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-heading tabular-nums text-muted-foreground">
                          {place <= 3 ? (
                            <span
                              className={cn(
                                place === 1 && "text-amber-400",
                                place === 2 && "text-zinc-300",
                                place === 3 && "text-orange-400",
                              )}
                            >
                              {place}
                            </span>
                          ) : (
                            place
                          )}
                        </TableCell>
                        <TableCell className="font-heading">{row.name}</TableCell>
                        <TableCell>
                          <Link href={`/game/spelers/${row.leader}`} className="text-primary hover:underline">
                            {row.leaderName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.members}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(row.bank)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
