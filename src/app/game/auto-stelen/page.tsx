import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { TheftClient } from "./theft-client";

export default async function TheftPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const types = await prisma.vehicleType.findMany({ orderBy: { stealDifficulty: "asc" } });
  return <TheftClient initialPlayer={player} types={types} />;
}
