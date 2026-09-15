import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/actions/helpers";
import { getShopCatalog } from "@/lib/catalog";
import { ShopClient } from "./shop-client";

export default async function ShopPage() {
  const [player, items] = await Promise.all([requirePlayer(), getShopCatalog()]);
  if (!player) redirect("/inloggen");
  return <ShopClient initialPlayer={player} items={items} />;
}
