import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { DashboardClient } from "./dashboard-client";
import { redirect } from "next/navigation";

export default async function GameHomePage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");

  const logs = await prisma.gameLog.findMany({
    where: { userId: player.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <DashboardClient
      initialPlayer={player}
      logs={logs.map((log) => ({
        id: log.id,
        type: log.type,
        message: log.message,
        createdAt: log.createdAt.toISOString(),
      }))}
    />
  );
}
