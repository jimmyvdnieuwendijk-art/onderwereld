import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { tickPlayer } from "@/lib/game/player";
import { GameShell } from "@/components/game/game-shell";

export default async function GameLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/inloggen");
  const player = await tickPlayer(session.user.id);
  if (!player) redirect("/inloggen");

  return <GameShell initialPlayer={player}>{children}</GameShell>;
}
