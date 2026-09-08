import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { CrimesClient } from "./crimes-client";

export default async function CrimesPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const crimes = await prisma.crime.findMany({ orderBy: { minRankOrder: "asc" } });
  return <CrimesClient initialPlayer={player} crimes={crimes} />;
}
