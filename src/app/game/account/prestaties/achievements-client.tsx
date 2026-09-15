"use client";

import { useMemo, useState } from "react";
import { claimAchievement, claimAllAchievements, selectIdentity } from "@/lib/actions/achievements";
import { DIFFICULTY_UI, NAME_COLOR_SWATCHES, type AchievementDifficulty } from "@/lib/achievement-catalog";
import { formatMoney, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountSubnav } from "@/components/game/account-subnav";
import { StyledPlayerName } from "@/components/game/styled-name";
import { useGameAction, useLivePlayer } from "@/hooks/use-player";
import type { AchievementBoard, AchievementBoardItem } from "@/lib/achievements";
import type { PlayerSnapshot } from "@/types/game";

const FILTERS: { id: AchievementDifficulty | "ALL"; label: string }[] = [
  { id: "ALL", label: "Alles" },
  { id: "EASY", label: "Makkelijk 🟢" },
  { id: "MEDIUM", label: "Gemiddeld 🟡" },
  { id: "HARD", label: "Moeilijk 🔴" },
  { id: "IMPOSSIBLE", label: "Onmogelijk 🟣" },
];

function rewardLines(item: AchievementBoardItem) {
  const lines: string[] = [];
  if (item.rewardExp > 0) lines.push(`${formatNumber(item.rewardExp)} speler-exp`);
  if (item.rewardPimpExp > 0) lines.push(`${formatNumber(item.rewardPimpExp)} hoeren-exp`);
  if (item.rewardGymExp > 0) lines.push(`${formatNumber(item.rewardGymExp)} gym-exp`);
  if (item.rewardCash > 0) lines.push(formatMoney(item.rewardCash));
  if (item.rewardBullets > 0) lines.push(`${formatNumber(item.rewardBullets)} kogels`);
  if (item.rewardTitle) lines.push(`titel [${item.rewardTitle}]`);
  if (item.rewardNameColor) lines.push(`naamkleur ${item.rewardNameColor}`);
  return lines;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-black/50">
      <div className="h-full rounded-full bg-[#d4a359] transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AchievementsClient({
  initialBoard,
  initialPlayer,
}: {
  initialBoard: AchievementBoard;
  initialPlayer?: PlayerSnapshot;
}) {
  const player = useLivePlayer(initialPlayer);
  const claimAct = useGameAction();
  const lookAct = useGameAction();
  const [board, setBoard] = useState(initialBoard);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("ALL");
  const [title, setTitle] = useState(initialBoard.selectedTitle ?? "");
  const [color, setColor] = useState(initialBoard.selectedNameColor ?? "");

  const shown = useMemo(
    () => (filter === "ALL" ? board.items : board.items.filter((row) => row.difficulty === filter)),
    [board.items, filter],
  );

  const displayName = player?.displayName?.trim() || player?.username || "Jij";

  async function refreshBoard() {
    const res = await fetch("/api/achievements", { cache: "no-store" });
    if (!res.ok) return;
    const next = (await res.json()) as AchievementBoard;
    setBoard(next);
    setTitle(next.selectedTitle ?? "");
    setColor(next.selectedNameColor ?? "");
  }

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary/80">Account</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-heading text-2xl leading-none md:text-3xl">Prestaties</h1>
          <AccountSubnav />
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Haal mijlpalen, claim exp, cash, kogels, titels en naamkleuren. Je titel staat als{" "}
          <span className="text-[#d4a359]">[Street Boss]</span> voor je naam in chat, klassement en profielen.
        </p>
      </header>

      <Card size="sm" className="border-[#d4a359]/20 bg-[#120e0a]">
        <CardHeader className="border-b border-[#d4a359]/15">
          <CardTitle>Identiteit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Voorbeeld:{" "}
            <StyledPlayerName
              displayName={displayName}
              title={title || null}
              color={color || null}
              className="font-heading text-base text-foreground"
            />
          </p>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              lookAct.run(() => selectIdentity(title, color), (result) => {
                if (result.ok) void refreshBoard();
              });
            }}
          >
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Titel</span>
              <select
                className="h-9 w-full rounded-md border border-border bg-black/30 px-2 text-sm"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              >
                <option value="">Geen titel</option>
                {board.unlockedTitles.map((row) => (
                  <option key={row} value={row}>
                    {row}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Naamkleur</span>
              <select
                className="h-9 w-full rounded-md border border-border bg-black/30 px-2 text-sm"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              >
                <option value="">Standaard</option>
                {board.unlockedNameColors.map((hex) => {
                  const swatch = NAME_COLOR_SWATCHES.find((row) => row.hex === hex);
                  return (
                    <option key={hex} value={hex}>
                      {swatch?.label ?? hex}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="md:col-span-2">
              <Button type="submit" disabled={lookAct.pending}>
                {lookAct.pending ? "Opslaan…" : "Identiteit opslaan"}
              </Button>
            </div>
          </form>
          {board.unlockedTitles.length === 0 && board.unlockedNameColors.length === 0 ? (
            <p className="text-xs text-muted-foreground">Claim eerst beloningen om titels en kleuren vrij te spelen.</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => setFilter(row.id)}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${
              filter === row.id
                ? "border-[#d4a359]/50 bg-[#d4a359]/15 text-[#d4a359]"
                : "border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {row.label}
          </button>
        ))}
        <Button
          className="ml-auto"
          disabled={claimAct.pending || board.claimable < 1}
          onClick={() =>
            claimAct.run(() => claimAllAchievements(), (result) => {
              if (result.ok) void refreshBoard();
            })
          }
        >
          {claimAct.pending ? "Claimen…" : `Claim Alles${board.claimable > 0 ? ` (${board.claimable})` : ""}`}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((item) => {
          const tone = DIFFICULTY_UI[item.difficulty];
          const rewards = rewardLines(item);
          return (
            <Card key={item.id} size="sm" className="border-[#d4a359]/15 bg-[#0c0907]">
              <CardHeader className="space-y-1 border-b border-[#d4a359]/10">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <span className={`shrink-0 text-[11px] uppercase tracking-wide ${tone.className}`}>
                    {tone.emoji} {tone.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                    <span>
                      {formatNumber(item.progress)}/{formatNumber(item.target)}
                    </span>
                    <span>{item.claimed ? "Geclaimd" : item.completed ? "Klaar" : "Bezig"}</span>
                  </div>
                  <ProgressBar value={item.progress} max={item.target} />
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {rewards.map((line) => (
                    <li
                      key={line}
                      className="rounded-full border border-[#d4a359]/20 bg-black/30 px-2 py-0.5 text-[11px] text-[#e8dfd2]"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
                {item.completed && !item.claimed ? (
                  <Button
                    size="sm"
                    disabled={claimAct.pending}
                    onClick={() =>
                      claimAct.run(() => claimAchievement(item.id), (result) => {
                        if (result.ok) void refreshBoard();
                      })
                    }
                  >
                    Claim Beloning
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
