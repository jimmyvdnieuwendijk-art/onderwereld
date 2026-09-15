import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/actions/helpers";
import { listAchievementBoard } from "@/lib/achievements";
import { AchievementsClient } from "./achievements-client";

export const metadata = {
  title: "Prestaties",
};

export default async function AchievementsPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const board = await listAchievementBoard(player.id);
  if (!board) return null;
  return <AchievementsClient initialPlayer={player} initialBoard={board} />;
}
