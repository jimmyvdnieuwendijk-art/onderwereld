import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { PlayerProfileClient } from "./profile-client";
import { toPublicPlayer } from "@/lib/game/public-player";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const self = await requirePlayer();
  if (!self) redirect("/inloggen");
  const { username } = await params;
  const user = await prisma.user.findFirst({
    where: { username },
    include: { rank: true, family: true },
  });
  if (!user) notFound();
  return <PlayerProfileClient target={toPublicPlayer(user)} />;
}
