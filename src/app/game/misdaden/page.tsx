import { getCrimeCatalog } from "@/lib/catalog";
import { CrimesClient } from "./crimes-client";

export default async function CrimesPage() {
  const crimes = await getCrimeCatalog();
  return <CrimesClient crimes={crimes} />;
}
