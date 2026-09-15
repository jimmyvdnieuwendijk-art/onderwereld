import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { familyHeistCooldownUntil } from "@/lib/family";
import { DashboardClient } from "./dashboard-client";

export default async function GameHomePage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");

  let heistCooldownUntil: string | null = null;
  if (player.family?.id) {
    const lastHeist = await prisma.familyHeist.findFirst({
      where: { familyId: player.family.id, status: { in: ["DONE", "FAILED"] }, resolvedAt: { not: null } },
      orderBy: { resolvedAt: "desc" },
      select: { slug: true, resolvedAt: true },
    });
    if (lastHeist?.resolvedAt) {
      heistCooldownUntil =
        familyHeistCooldownUntil(lastHeist.slug, lastHeist.resolvedAt)?.toISOString() ?? null;
    }
  }

  return <DashboardClient initialPlayer={player} extras={{ heistCooldownUntil }} />;
}
