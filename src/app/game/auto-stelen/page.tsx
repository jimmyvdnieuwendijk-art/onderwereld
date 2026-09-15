import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/actions/helpers";
import { getVehicleCatalog } from "@/lib/catalog";
import { TheftClient } from "./theft-client";

export default async function TheftPage() {
  const [player, types] = await Promise.all([requirePlayer(), getVehicleCatalog()]);
  if (!player) redirect("/inloggen");
  return <TheftClient initialPlayer={player} types={types} />;
}
