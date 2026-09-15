import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/actions/helpers";
import { getCrimeCatalog } from "@/lib/catalog";
import { CrimesClient } from "./crimes-client";

export default async function CrimesPage() {
  const [player, crimes] = await Promise.all([requirePlayer(), getCrimeCatalog()]);
  if (!player) redirect("/inloggen");
  return <CrimesClient initialPlayer={player} crimes={crimes} />;
}
