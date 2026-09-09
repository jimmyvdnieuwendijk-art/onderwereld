import { requirePlayer } from "@/lib/actions/helpers";
import { getCrimeCatalog } from "@/lib/catalog";
import { redirect } from "next/navigation";
import { CrimesClient } from "./crimes-client";

export default async function CrimesPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const crimes = await getCrimeCatalog();
  return <CrimesClient initialPlayer={player} crimes={crimes} />;
}
