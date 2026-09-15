import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { listAchievementBoard } from "@/lib/achievements";
import { AchievementsClient } from "./achievements-client";

export const metadata = {
  title: "Prestaties",
};

export default async function AchievementsPage() {
  const userId = await requireUserIdOrRedirect();
  const board = await listAchievementBoard(userId);
  if (!board) return null;
  return <AchievementsClient initialBoard={board} />;
}
