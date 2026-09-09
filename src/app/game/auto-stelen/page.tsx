import { requirePlayer } from "@/lib/actions/helpers";
import { getVehicleCatalog } from "@/lib/catalog";
import { redirect } from "next/navigation";
import { TheftClient } from "./theft-client";

export default async function TheftPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const types = await getVehicleCatalog();
  return <TheftClient initialPlayer={player} types={types} />;
}
