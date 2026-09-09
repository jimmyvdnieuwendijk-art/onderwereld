import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requirePlayer } from "@/lib/actions/helpers";
import { GameShell } from "@/components/game/game-shell";

export default async function GameLayout({ children }: { children: ReactNode }) {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");

  return <GameShell initialPlayer={player}>{children}</GameShell>;
}
