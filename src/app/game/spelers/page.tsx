import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PlayersClient } from "./players-client";
import { toPublicPlayer, publicDisplayName } from "@/lib/game/public-player";

export const metadata = {
  title: "Klassement",
};

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const tab = (await searchParams).tab === "families" ? "families" : "players";

  const [users, families] = await Promise.all([
    prisma.user.findMany({
      include: { rank: true, family: true },
      orderBy: [{ exp: "desc" }, { killCount: "desc" }, { cash: "desc" }],
      take: 80,
    }),
    prisma.family.findMany({
      include: {
        leader: { select: { username: true, displayName: true } },
        _count: { select: { memberships: true } },
      },
      orderBy: { bankBalance: "desc" },
    }),
  ]);

  return (
    <PlayersClient
      selfId={player.id}
      initialTab={tab}
      initial={users.map((user) => toPublicPlayer(user))}
      families={families.map((family) => ({
        id: family.id,
        name: family.name,
        leader: family.leader.username,
        leaderName: publicDisplayName(family.leader),
        members: family._count.memberships,
        bank: family.bankBalance,
      }))}
    />
  );
}
