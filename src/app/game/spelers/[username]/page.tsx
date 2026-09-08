import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { PlayerProfileClient } from "./profile-client";

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
  const now = new Date();
  return (
    <PlayerProfileClient
      target={{
        id: user.id,
        username: user.username,
        rankName: user.rank.name,
        rankOrder: user.rank.order,
        currentCity: user.currentCity,
        health: user.health,
        isDead: user.isDead,
        inJail: !!(user.inJailUntil && user.inJailUntil.getTime() > now.getTime()),
        inHospital: !!(user.inHospitalUntil && user.inHospitalUntil.getTime() > now.getTime()),
        killCount: user.killCount,
        familyName: user.family?.name ?? null,
      }}
    />
  );
}
