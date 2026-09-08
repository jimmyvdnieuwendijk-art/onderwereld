import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PlayersClient } from "./players-client";
import { toPublicPlayer } from "@/lib/game/public-player";

export const metadata = {
  title: "Klassement",
};

export default async function PlayersPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");

  const users = await prisma.user.findMany({
    include: { rank: true, family: true },
    orderBy: [{ exp: "desc" }, { killCount: "desc" }, { cash: "desc" }],
    take: 50,
  });

  return (
    <PlayersClient
      selfId={player.id}
      initial={users.map((user) => toPublicPlayer(user))}
    />
  );
}
