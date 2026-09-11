import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { hospitalOccupantWhere } from "@/lib/hospital";
import { HospitalClient } from "./hospital-client";

export default async function HospitalPage() {
  await requireUserIdOrRedirect();
  const occupantCount = await prisma.user.count({ where: hospitalOccupantWhere() });
  return <HospitalClient occupantCount={occupantCount} />;
}
