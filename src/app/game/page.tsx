import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tickPlayer } from "@/lib/game/player";
import { DashboardClient } from "./dashboard-client";
import { redirect } from "next/navigation";

export default async function GameHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/inloggen");
  const player = await tickPlayer(session.user.id);
  if (!player) redirect("/inloggen");

  const logs = await prisma.gameLog.findMany({
    where: { userId: session.user.id },
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
