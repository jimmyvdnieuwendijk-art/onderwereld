import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { getShopCatalog } from "@/lib/catalog";
import { ShopClient } from "./shop-client";

export default async function ShopPage() {
  const userId = await requireUserIdOrRedirect();
  const [items, inventory] = await Promise.all([
    getShopCatalog(),
    prisma.inventoryItem.findMany({
      where: { userId },
      include: { item: true },
      orderBy: { item: { name: "asc" } },
    }),
  ]);
  return <ShopClient items={items} inventory={inventory} />;
}
