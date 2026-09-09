import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureGameCatalog } from "@/lib/ensure-catalog";

export const getRanksCached = unstable_cache(
  async () => prisma.rank.findMany({ orderBy: { order: "asc" } }),
  ["ranks-v1"],
  { revalidate: 300 },
);

export const getCrimeCatalog = unstable_cache(
  async () => {
    await ensureGameCatalog();
    return prisma.crime.findMany({ orderBy: { minRankOrder: "asc" } });
  },
  ["crime-catalog-v1"],
  { revalidate: 600 },
);

export const getVehicleCatalog = unstable_cache(
  async () => {
    await ensureGameCatalog();
    return prisma.vehicleType.findMany({ orderBy: { stealDifficulty: "asc" } });
  },
  ["vehicle-catalog-v1"],
  { revalidate: 600 },
);

export const getShopCatalog = unstable_cache(
  async () => prisma.shopItem.findMany({ orderBy: { price: "asc" } }),
  ["shop-catalog-v1"],
  { revalidate: 600 },
);
