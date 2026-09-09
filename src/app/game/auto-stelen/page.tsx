import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { ensureGameCatalog } from "@/lib/ensure-catalog";
import { redirect } from "next/navigation";
import { TheftClient } from "./theft-client";

export default async function TheftPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  await ensureGameCatalog();
  const types = await prisma.vehicleType.findMany({ orderBy: { stealDifficulty: "asc" } });
  return <TheftClient initialPlayer={player} types={types} />;
}
