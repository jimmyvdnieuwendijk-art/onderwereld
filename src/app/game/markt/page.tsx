import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { MarketClient } from "./market-client";

export default async function MarketPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const listings = await prisma.marketListing.findMany({
    where: { active: true },
    include: {
      seller: { select: { username: true } },
      vehicle: { include: { vehicleType: true } },
      item: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <MarketClient
      userId={player.id}
      listings={listings}
      mine={listings.filter((row) => row.sellerId === player.id)}
    />
  );
}
