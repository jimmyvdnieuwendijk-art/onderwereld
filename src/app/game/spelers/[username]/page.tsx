import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { PlayerProfileClient } from "./profile-client";
import { toPublicPlayer } from "@/lib/game/public-player";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  await requireUserIdOrRedirect();
  const { username } = await params;
  const user = await prisma.user.findFirst({
    where: { username },
    select: {
      id: true,
      username: true,
      health: true,
      isDead: true,
      killCount: true,
      exp: true,
      cash: true,
      inJailUntil: true,
      inHospitalUntil: true,
      travelEndAt: true,
      bio: true,
      bioHidden: true,
      hideOnline: true,
      lastSeenAt: true,
      displayName: true,
      avatarUrl: true,
      rank: { select: { name: true, order: true } },
      family: { select: { name: true } },
    },
  });
  if (!user) notFound();
  return <PlayerProfileClient target={toPublicPlayer(user)} />;
}
