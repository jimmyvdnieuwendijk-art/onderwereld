import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { prisma } from "@/lib/prisma";
import { PlayersClient } from "./players-client";
import { toPublicPlayer, publicDisplayName } from "@/lib/game/public-player";
import {
  LEADERBOARD_TAKE,
  playerLeaderboardOrder,
  PUBLIC_PLAYER_SELECT,
} from "@/lib/game/leaderboard";

export const metadata = {
  title: "Klassement",
};

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const selfId = await requireUserIdOrRedirect();
  const tab = (await searchParams).tab === "families" ? "families" : "players";

  const [users, families] = await Promise.all([
    prisma.user.findMany({
      select: PUBLIC_PLAYER_SELECT,
      orderBy: playerLeaderboardOrder("rank", "desc"),
      take: LEADERBOARD_TAKE,
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
      selfId={selfId}
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
