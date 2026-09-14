import { getShopCatalog } from "@/lib/catalog";
import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { ShopClient } from "./shop-client";

export default async function ShopPage() {
  await requireUserIdOrRedirect();
  const items = await getShopCatalog();
  return <ShopClient items={items} />;
}
