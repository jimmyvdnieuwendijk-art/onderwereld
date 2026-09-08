import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { ROLE_LEADER } from "@/lib/constants";
import { redirect } from "next/navigation";
import { FamilyClient } from "./family-client";

export default async function FamilyPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");

  const families = await prisma.family.findMany({
    include: {
      leader: { select: { username: true } },
      memberships: { include: { user: { select: { username: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const mine = player.family ? families.find((f) => f.id === player.family?.id) ?? null : null;

  return (
    <FamilyClient
      mine={mine}
      families={families}
      isLeader={player.family?.role === ROLE_LEADER}
    />
  );
}
