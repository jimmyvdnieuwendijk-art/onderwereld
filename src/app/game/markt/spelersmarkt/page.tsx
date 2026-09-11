import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { LISTING_ITEM, LISTING_VEHICLE } from "@/lib/constants";
import type { ListingDTO } from "@/lib/market";
import { PlayerMarketClient } from "./player-market-client";

function serializeListing(row: {
  id: string;
  type: string;
  quantity: number;
  price: number;
  sellerId: string;
  seller: { username: string };
  buyerId: string | null;
  buyer: { username: string } | null;
  active: boolean;
  createdAt: Date;
  completedAt: Date | null;
  vehicle: { vehicleType: { name: string } } | null;
  item: { name: string } | null;
}): ListingDTO {
  return {
    id: row.id,
    type: row.type,
    quantity: row.quantity,
    price: row.price,
    sellerId: row.sellerId,
    sellerName: row.seller.username,
    buyerId: row.buyerId,
    buyerName: row.buyer?.username ?? null,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    vehicleName: row.vehicle?.vehicleType.name ?? null,
    itemName: row.item?.name ?? null,
  };
}

export default async function SpelersmarktPage() {
  const userId = await requireUserIdOrRedirect();
  const include = {
    seller: { select: { username: true } },
    buyer: { select: { username: true } },
    vehicle: { include: { vehicleType: true } },
    item: true,
  } as const;
  const listings = await prisma.marketListing.findMany({
    where: { active: true, type: { in: [LISTING_VEHICLE, LISTING_ITEM] } },
    include,
    orderBy: { createdAt: "desc" },
  });
  return (
    <PlayerMarketClient
      userId={userId}
      listings={listings.map(serializeListing)}
    />
  );
}
