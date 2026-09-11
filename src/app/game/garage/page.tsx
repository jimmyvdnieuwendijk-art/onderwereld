import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { GarageClient } from "./garage-client";

export default async function GaragePage() {
  const userId = await requireUserIdOrRedirect();
  const vehicles = await prisma.vehicle.findMany({
    where: { userId, listings: { none: { active: true } } },
    include: { vehicleType: true },
    orderBy: { createdAt: "desc" },
  });
  return <GarageClient vehicles={vehicles} />;
}
