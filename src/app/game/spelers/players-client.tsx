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
import { PLAYER_RANKS } from "@/lib/ranks";
import {
  PLAYER_SORT_LABELS,
  type PlayerSort,
  type SortDir,
} from "@/lib/game/leaderboard";
import type { FamilyBoardRow, PublicPlayer } from "@/types/game";
import { StyledPlayerName } from "@/components/game/styled-name";

type FamilySort = "members" | "bank" | "name";

const PLAYER_BOARDS: { id: PlayerSort; label: string }[] = [
  { id: "rank", label: "Rang" },
  { id: "kills", label: "Kills" },
  { id: "cash", label: "Geld" },
  { id: "exp", label: "EXP" },
  { id: "health", label: "HP" },
];

const FAMILY_BOARDS: { id: FamilySort; label: string }[] = [
  { id: "members", label: "Leden" },
  { id: "bank", label: "Kas" },
  { id: "name", label: "Naam" },
];

function cmp(a: number | string, b: number | string, dir: SortDir) {
  const av = typeof a === "string" ? a.toLocaleLowerCase("nl") : a;
  const bv = typeof b === "string" ? b.toLocaleLowerCase("nl") : b;
  if (av < bv) return dir === "asc" ? -1 : 1;
  if (av > bv) return dir === "asc" ? 1 : -1;
  return 0;
}

function sortFamilies(rows: FamilyBoardRow[], key: FamilySort, dir: SortDir) {
  return [...rows].sort((a, b) => {
    if (key === "members") return cmp(a.members, b.members, dir) || cmp(a.bank, b.bank, dir);
    if (key === "bank") return cmp(a.bank, b.bank, dir) || cmp(a.members, b.members, dir);
    return cmp(a.name, b.name, dir);
  });
}

function dirLabel(dir: SortDir, key: string) {
  if (key === "name") return dir === "asc" ? "A–Z" : "Z–A";
  return dir === "desc" ? "hoogste eerst" : "laagste eerst";
}

function SortMark({ active, dir }: { active: boolean; dir: SortDir }) {
  const Icon = dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Icon
      className={cn("size-3.5 shrink-0", active ? "text-[#d4a359]" : "text-muted-foreground/40")}
    />
  );
}

function SortHead({
  label,
  active,
  dir,
  align = "left",
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  align?: "left" | "right";
  onClick: () => void;
}) {
  return (
    <TableHead
      aria-sort={active ? (dir === "desc" ? "descending" : "ascending") : "none"}
      className={cn("p-0", active && "text-[#d4a359]")}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-1 px-2 py-2.5 text-xs font-medium uppercase tracking-wide",
          align === "right" ? "justify-end" : "justify-start",
          active ? "text-[#d4a359]" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <SortMark active={active} dir={dir} />
      </button>
    </TableHead>
  );
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
  const [playerDir, setPlayerDir] = useState<SortDir>("desc");
  const [familySort, setFamilySort] = useState<FamilySort>("members");
  const [familyDir, setFamilyDir] = useState<SortDir>("desc");
  const [rankFilter, setRankFilter] = useState<string>("all");

  const isDefaultBoard =
    submitted.length === 0 && playerSort === "rank" && playerDir === "desc" && rankFilter === "all";

  const query = useQuery({
    queryKey: ["players", submitted, playerSort, playerDir, rankFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (submitted) params.set("q", submitted);
      params.set("sort", playerSort);
      params.set("dir", playerDir);
      if (rankFilter !== "all") params.set("rank", rankFilter);
      const res = await fetch(`/api/players?${params}`);
      if (!res.ok) throw new Error("Laden mislukt");
      return res.json() as Promise<PublicPlayer[]>;
    },
    initialData: isDefaultBoard ? initial : undefined,
    placeholderData: (previous) => previous,
    staleTime: isDefaultBoard ? 30_000 : 15_000,
  });

  const rows = query.data ?? (isDefaultBoard ? initial : []);
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

  const sortCaption = `Gesorteerd op ${PLAYER_SORT_LABELS[playerSort]} · ${dirLabel(playerDir, playerSort)}`;
  const familyCaption = `Gesorteerd op ${FAMILY_BOARDS.find((b) => b.id === familySort)?.label.toLowerCase() ?? familySort} · ${dirLabel(familyDir, familySort)}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#d4a359]">Sociaal</p>
        <h1 className="font-heading text-3xl">Klassement</h1>
        <p className="text-sm text-muted-foreground">
          Sorteer het bord op rang, kills, geld, exp of HP. Twaalf straat-rangen, van Scum tot Legendary Don.
          Locatie blijft privé.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#d4a359]/25 bg-[#1a1510] p-3">
        <p className="text-[11px] uppercase tracking-wider text-[#d4a359]">Filter op rang</p>
        <div className="mt-2 flex min-w-max gap-1.5">
          <button
            type="button"
            onClick={() => setRankFilter("all")}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px]",
              rankFilter === "all"
                ? "border-[#d4a359] bg-[#d4a359]/15 text-[#d4a359]"
                : "border-border/50 text-muted-foreground hover:text-foreground",
            )}
          >
            Alle rangen
          </button>
          {PLAYER_RANKS.map((rank) => (
            <button
              key={rank.slug}
              type="button"
              onClick={() => setRankFilter(rank.name)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px]",
                rankFilter === rank.name
                  ? "border-[#d4a359] bg-[#d4a359]/15 text-[#d4a359]"
                  : "border-border/50 text-muted-foreground hover:text-foreground",
              )}
              title={`${formatNumber(rank.minExp)} exp`}
            >
              {rank.order}. {rank.name}
            </button>
          ))}
        </div>
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

          <div className="flex flex-wrap items-center gap-1.5">
            {PLAYER_BOARDS.map((board) => {
              const active = playerSort === board.id;
              return (
                <Button
                  key={board.id}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className={cn(active && "border-[#d4a359] bg-[#d4a359] text-[#1a1510] hover:bg-[#d4a359]/90")}
                  onClick={() => togglePlayerSort(board.id)}
                  aria-pressed={active}
                >
                  {board.label}
                  {active ? <SortMark active dir={playerDir} /> : null}
                </Button>
              );
            })}
          </div>
          <p className="text-sm text-[#d4a359]">{sortCaption}</p>

          {submitted && query.isPending && !query.data && <p className="text-muted-foreground">Laden…</p>}
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
                    <SortHead
                      label="Rang"
                      active={playerSort === "rank"}
                      dir={playerDir}
                      onClick={() => togglePlayerSort("rank")}
                    />
                    <SortHead
                      label="EXP"
                      active={playerSort === "exp"}
                      dir={playerDir}
                      align="right"
                      onClick={() => togglePlayerSort("exp")}
                    />
                    <SortHead
                      label="Geld"
                      active={playerSort === "cash"}
                      dir={playerDir}
                      align="right"
                      onClick={() => togglePlayerSort("cash")}
                    />
                    <SortHead
                      label="Kills"
                      active={playerSort === "kills"}
                      dir={playerDir}
                      align="right"
                      onClick={() => togglePlayerSort("kills")}
                    />
                    <SortHead
                      label="HP"
                      active={playerSort === "health"}
                      dir={playerDir}
                      align="right"
                      onClick={() => togglePlayerSort("health")}
                    />
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
                              <StyledPlayerName
                                displayName={row.displayName}
                                title={row.selectedTitle}
                                color={row.selectedNameColor}
                              />
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
                        <TableCell className={cn(playerSort === "rank" && "text-[#d4a359]")}>{row.rankName}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            playerSort === "exp" && "text-[#d4a359]",
                          )}
                        >
                          {formatNumber(row.exp)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            playerSort === "cash" && "text-[#d4a359]",
                          )}
                        >
                          {formatMoney(row.cash)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            playerSort === "kills" && "text-[#d4a359]",
                          )}
                        >
                          {row.killCount}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            playerSort === "health" && "text-[#d4a359]",
                          )}
                        >
                          {row.health}
                        </TableCell>
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
          <div className="flex flex-wrap items-center gap-1.5">
            {FAMILY_BOARDS.map((board) => {
              const active = familySort === board.id;
              return (
                <Button
                  key={board.id}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className={cn(active && "border-[#d4a359] bg-[#d4a359] text-[#1a1510] hover:bg-[#d4a359]/90")}
                  onClick={() => toggleFamilySort(board.id)}
                  aria-pressed={active}
                >
                  {board.label}
                  {active ? <SortMark active dir={familyDir} /> : null}
                </Button>
              );
            })}
          </div>
          <p className="text-sm text-[#d4a359]">{familyCaption}</p>
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
                    <SortHead
                      label="Familie"
                      active={familySort === "name"}
                      dir={familyDir}
                      onClick={() => toggleFamilySort("name")}
                    />
                    <TableHead>Leider</TableHead>
                    <SortHead
                      label="Leden"
                      active={familySort === "members"}
                      dir={familyDir}
                      align="right"
                      onClick={() => toggleFamilySort("members")}
                    />
                    <SortHead
                      label="Kas"
                      active={familySort === "bank"}
                      dir={familyDir}
                      align="right"
                      onClick={() => toggleFamilySort("bank")}
                    />
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
                        <TableCell className={cn("font-heading", familySort === "name" && "text-[#d4a359]")}>
                          {row.name}
                        </TableCell>
                        <TableCell>
                          <Link href={`/game/spelers/${row.leader}`} className="text-primary hover:underline">
                            {row.leaderName}
                          </Link>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            familySort === "members" && "text-[#d4a359]",
                          )}
                        >
                          {row.members}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            familySort === "bank" && "text-[#d4a359]",
                          )}
                        >
                          {formatMoney(row.bank)}
                        </TableCell>
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
