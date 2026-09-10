import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { InboxClient } from "./inbox-client";

export default async function InboxPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");

  const selectUser = { username: true, displayName: true };
  const [inbox, sent] = await Promise.all([
    prisma.message.findMany({
      where: { toUserId: player.id, deletedByTo: false },
      include: { fromUser: { select: selectUser }, toUser: { select: selectUser } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.message.findMany({
      where: { fromUserId: player.id, deletedByFrom: false },
      include: { fromUser: { select: selectUser }, toUser: { select: selectUser } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  return (
    <InboxClient
      inbox={inbox.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      sent={sent.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
    />
  );
}