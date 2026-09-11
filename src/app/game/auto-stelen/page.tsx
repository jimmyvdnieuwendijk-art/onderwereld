import { getVehicleCatalog } from "@/lib/catalog";
import { TheftClient } from "./theft-client";

export default async function TheftPage() {
  const types = await getVehicleCatalog();
  return <TheftClient types={types} />;
}
