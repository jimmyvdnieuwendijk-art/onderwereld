import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { CONTRABAND_TYPES, type ListingDTO, type PriceAlertDTO, type TradeLogDTO } from "@/lib/market";
import { BlackMarketClient } from "./black-market-client";

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

export default async function ZwarteMarktPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");

  const include = {
    seller: { select: { username: true } },
    buyer: { select: { username: true } },
    vehicle: { include: { vehicleType: true } },
    item: true,
  } as const;

  const [active, mine, history, logs, alerts] = await Promise.all([
    prisma.marketListing.findMany({
      where: { active: true, type: { in: [...CONTRABAND_TYPES] } },
      include,
      orderBy: { createdAt: "desc" },
    }),
    prisma.marketListing.findMany({
      where: { active: true, sellerId: player.id, type: { in: [...CONTRABAND_TYPES] } },
      include,
      orderBy: { createdAt: "desc" },
    }),
    prisma.marketListing.findMany({
      where: {
        active: false,
        type: { in: [...CONTRABAND_TYPES] },
        OR: [{ sellerId: player.id }, { buyerId: player.id }],
      },
      include,
      orderBy: { completedAt: "desc" },
      take: 40,
    }),
    prisma.gameLog.findMany({
      where: { userId: player.id, type: { in: ["SMUGGLE", "MARKET", "ALERT"] } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.priceAlert.findMany({
      where: { userId: player.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const alertRows: PriceAlertDTO[] = alerts.map((row) => ({
    id: row.id,
    good: row.good,
    side: row.side,
    threshold: row.threshold,
    cityId: row.cityId,
    lastFiredAt: row.lastFiredAt?.toISOString() ?? null,
    lastFiredCity: row.lastFiredCity,
    createdAt: row.createdAt.toISOString(),
  }));

  const logRows: TradeLogDTO[] = logs.map((row) => ({
    id: row.id,
    type: row.type,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <BlackMarketClient
      initialPlayer={player}
      listings={active.map(serializeListing)}
      mine={mine.map(serializeListing)}
      history={history.map(serializeListing)}
      logs={logRows}
      alerts={alertRows}
    />
  );
}
