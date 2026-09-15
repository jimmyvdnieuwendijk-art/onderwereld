import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { familyHeistCooldownUntil } from "@/lib/family";
import { DashboardClient } from "./dashboard-client";

export default async function GameHomePage() {
  const userId = await requireUserIdOrRedirect();

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { familyId: true },
  });

  let heistCooldownUntil: string | null = null;
  if (me?.familyId) {
    const lastHeist = await prisma.familyHeist.findFirst({
      where: { familyId: me.familyId, status: { in: ["DONE", "FAILED"] }, resolvedAt: { not: null } },
      orderBy: { resolvedAt: "desc" },
      select: { slug: true, resolvedAt: true },
    });
    if (lastHeist?.resolvedAt) {
      heistCooldownUntil =
        familyHeistCooldownUntil(lastHeist.slug, lastHeist.resolvedAt)?.toISOString() ?? null;
    }
  }

  return <DashboardClient extras={{ heistCooldownUntil }} />;
}
