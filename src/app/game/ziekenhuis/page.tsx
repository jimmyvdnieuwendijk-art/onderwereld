import { prisma } from "@/lib/prisma";
import { requirePlayer, requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { hospitalOccupantWhere } from "@/lib/hospital";
import { HospitalClient } from "./hospital-client";

export default async function HospitalPage() {
  await requireUserIdOrRedirect();
  const [player, occupantCount] = await Promise.all([
    requirePlayer(),
    prisma.user.count({ where: hospitalOccupantWhere() }),
  ]);
  return <HospitalClient initialPlayer={player ?? undefined} occupantCount={occupantCount} />;
}
