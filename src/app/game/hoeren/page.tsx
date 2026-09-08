import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cityDisplayName, normalizeCityId } from "@/lib/airports";
import { WINDOWS_PER_CITY, hourlyPayout, windowDailyFee, windowStatus } from "@/lib/pimp";
import { HoerenClient } from "./hoeren-client";
import type { EscortDTO, MarketEscortDTO, WindowDTO } from "./types";

export const metadata = {
  title: "Hoeren",
};

export default async function HoerenPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");

  const cityId = normalizeCityId(player.currentCity);
  const now = Date.now();

  const [escorts, windows, listings, logs] = await Promise.all([
    prisma.escort.findMany({
      where: { ownerId: player.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.redLightWindow.findMany({
      where: { ownerId: player.id, cityId },
      include: { escort: { select: { id: true, name: true, avatar: true } } },
    }),
    prisma.escort.findMany({
      where: { listedPrice: { not: null }, ownerId: { not: player.id } },
      include: { owner: { select: { username: true } } },
      orderBy: { listedPrice: "asc" },
      take: 24,
    }),
    prisma.gameLog.findMany({
      where: { userId: player.id, type: "PIMP" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const escortDtos: EscortDTO[] = escorts.map((row) => ({
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    charm: row.charm,
    loyalty: row.loyalty,
    health: row.health,
    cityId: row.cityId,
    cityName: cityDisplayName(row.cityId),
    windowId: row.windowId,
    listedPrice: row.listedPrice,
    isMain: player.mainEscortId === row.id,
    hourly: hourlyPayout(row.charm, row.loyalty, row.health, row.cityId),
  }));

  const windowDtos: WindowDTO[] = Array.from({ length: WINDOWS_PER_CITY }, (_, slotIndex) => {
    const row = windows.find((item) => item.slotIndex === slotIndex);
    const hired = !!row && row.hiredUntil.getTime() > now;
    const occupied = hired && !!row?.escort;
    return {
      id: row?.id ?? null,
      slotIndex,
      hiredUntil: row?.hiredUntil.toISOString() ?? null,
      hired,
      escort: hired && row?.escort ? row.escort : null,
      fee: windowDailyFee(cityId),
      status: windowStatus({
        hired,
        occupied: !!occupied,
        wantedLevel: player.wantedLevel,
        lastRaidAt: player.lastRaidAt,
        now,
      }),
    };
  });

  const market: MarketEscortDTO[] = listings
    .filter((row) => row.listedPrice != null)
    .map((row) => ({
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      charm: row.charm,
      loyalty: row.loyalty,
      health: row.health,
      cityName: cityDisplayName(row.cityId),
      listedPrice: row.listedPrice ?? 0,
      seller: row.owner.username,
    }));

  return (
    <HoerenClient
      initialPlayer={player}
      escorts={escortDtos}
      windows={windowDtos}
      market={market}
      logs={logs.map((row) => ({
        id: row.id,
        message: row.message,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
