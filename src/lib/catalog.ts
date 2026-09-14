import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureGameCatalog } from "@/lib/ensure-catalog";
import { ensureRankLadder } from "@/lib/ensure-ranks";

export const getRanksCached = unstable_cache(
  async () => {
    await ensureRankLadder();
    return prisma.rank.findMany({ orderBy: { order: "asc" } });
  },
  ["ranks-v2"],
  { revalidate: 60 },
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
  async () => {
    await ensureGameCatalog();
    return prisma.shopItem.findMany({ orderBy: { price: "asc" } });
  },
  ["shop-catalog-v3"],
  { revalidate: 600 },
);
