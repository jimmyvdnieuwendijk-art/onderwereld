import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { InboxClient } from "./inbox-client";

export default async function InboxPage() {
  const userId = await requireUserIdOrRedirect();

  const selectUser = { username: true, displayName: true };
  const [inbox, sent] = await Promise.all([
    prisma.message.findMany({
      where: { toUserId: userId, deletedByTo: false },
      include: { fromUser: { select: selectUser }, toUser: { select: selectUser } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.message.findMany({
      where: { fromUserId: userId, deletedByFrom: false },
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
