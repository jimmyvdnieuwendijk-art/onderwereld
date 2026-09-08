import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { PlayersClient } from "./players-client";
import { toPublicPlayer } from "@/lib/game/public-player";

export default async function PlayersPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");

  const users = await prisma.user.findMany({
    where: { id: { not: player.id } },
    include: { rank: true, family: true },
    orderBy: { exp: "desc" },
    take: 30,
  });

  return <PlayersClient initial={users.map((user) => toPublicPlayer(user))} />;
}
