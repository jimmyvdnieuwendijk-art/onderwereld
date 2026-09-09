import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { getShopCatalog } from "@/lib/catalog";
import { redirect } from "next/navigation";
import { ShopClient } from "./shop-client";

export default async function ShopPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const [items, inventory] = await Promise.all([
    getShopCatalog(),
    prisma.inventoryItem.findMany({
      where: { userId: player.id },
      include: { item: true },
      orderBy: { item: { name: "asc" } },
    }),
  ]);
  return <ShopClient initialPlayer={player} items={items} inventory={inventory} />;
}
