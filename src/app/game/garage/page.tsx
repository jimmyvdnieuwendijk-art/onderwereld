import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { GarageClient } from "./garage-client";

export default async function GaragePage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const vehicles = await prisma.vehicle.findMany({
    where: { userId: player.id, listings: { none: { active: true } } },
    include: { vehicleType: true },
    orderBy: { createdAt: "desc" },
  });
  return <GarageClient vehicles={vehicles} />;
}
