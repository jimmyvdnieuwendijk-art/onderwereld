import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { DashboardClient } from "./dashboard-client";

export default async function GameHomePage() {
  const userId = await requireUserIdOrRedirect();

  const logs = await prisma.gameLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, type: true, message: true, createdAt: true },
  });

  return (
    <DashboardClient
      logs={logs.map((log) => ({
        id: log.id,
        type: log.type,
        message: log.message,
        createdAt: log.createdAt.toISOString(),
      }))}
    />
  );
}
