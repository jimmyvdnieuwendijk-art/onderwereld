import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { InboxClient } from "./inbox-client";

export default async function InboxPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const [inbox, sent] = await Promise.all([
    prisma.message.findMany({
      where: { toUserId: player.id },
      include: { fromUser: { select: { username: true } }, toUser: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.message.findMany({
      where: { fromUserId: player.id },
      include: { fromUser: { select: { username: true } }, toUser: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return (
    <InboxClient
      inbox={inbox.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      sent={sent.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
    />
  );
}
