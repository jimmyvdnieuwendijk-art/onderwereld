import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { PlayersClient } from "./players-client";
import type { PublicPlayer } from "@/types/game";

function toPublic(
  user: {
    id: string;
    username: string;
    health: number;
    isDead: boolean;
    killCount: number;
    currentCity: string;
    inJailUntil: Date | null;
    inHospitalUntil: Date | null;
    rank: { name: string; order: number };
    family: { name: string } | null;
  },
  now: Date,
): PublicPlayer {
  return {
    id: user.id,
    username: user.username,
    rankName: user.rank.name,
    rankOrder: user.rank.order,
    currentCity: user.currentCity,
    health: user.health,
    isDead: user.isDead,
    inJail: !!(user.inJailUntil && user.inJailUntil > now),
    inHospital: !!(user.inHospitalUntil && user.inHospitalUntil > now),
    killCount: user.killCount,
    familyName: user.family?.name ?? null,
  };
}

export default async function PlayersPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");

  const users = await prisma.user.findMany({
    where: { id: { not: player.id } },
    include: { rank: true, family: true },
    orderBy: { exp: "desc" },
    take: 30,
  });

  return <PlayersClient initial={users.map((user) => toPublic(user, new Date()))} />;
}
