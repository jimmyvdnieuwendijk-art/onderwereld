import { prisma } from "@/lib/prisma";
import { requirePlayer, requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { jailOccupantWhere } from "@/lib/hospital";
import { JailClient } from "./jail-client";

export default async function JailPage() {
  await requireUserIdOrRedirect();
  const [player, occupantCount] = await Promise.all([
    requirePlayer(),
    prisma.user.count({ where: jailOccupantWhere() }),
  ]);
  return <JailClient initialPlayer={player ?? undefined} occupantCount={occupantCount} />;
}
