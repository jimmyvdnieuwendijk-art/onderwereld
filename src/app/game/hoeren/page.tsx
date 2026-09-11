import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { tickPimpEconomy } from "@/lib/game/pimp-tick";
import { cityDisplayName, normalizeCityId } from "@/lib/airports";
import {
  WINDOWS_PER_CITY,
  hourlyPayout,
  isEscortBusy,
  missionLabel,
  npcBuyoutPrice,
  windowDailyFee,
  windowStatus,
} from "@/lib/pimp";
import { rivalByKey, streetClaimCost, streetZoneName, venueByKey, venuePayoutMult } from "@/lib/empire";
import { ensureStreetZones } from "@/lib/actions/empire";
import { HoerenClient } from "./hoeren-client";
import type { EscortDTO, MarketEscortDTO, WindowDTO } from "./types";

export const metadata = {
  title: "Hoeren",
};

export default async function HoerenPage() {
  const userId = await requireUserIdOrRedirect();
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentCity: true,
      wantedLevel: true,
      lastRaidAt: true,
      mainEscortId: true,
    },
  });
  if (!me) redirect("/inloggen");
  await tickPimpEconomy(userId);

  const cityId = normalizeCityId(me.currentCity);
  const now = Date.now();

  const [escorts, windows, listings, logs, zones] = await Promise.all([
    prisma.escort.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.redLightWindow.findMany({
      where: { ownerId: userId, cityId },
      include: { escort: { select: { id: true, name: true, avatar: true } } },
    }),
    prisma.escort.findMany({
      where: { listedPrice: { not: null }, ownerId: { not: userId } },
      include: { owner: { select: { username: true } } },
      orderBy: { listedPrice: "asc" },
      take: 24,
    }),
    prisma.gameLog.findMany({
      where: { userId, type: "PIMP" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    ensureStreetZones(cityId),
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
    isMain: me.mainEscortId === row.id,
    hourly: Math.floor(
      hourlyPayout(row.charm, row.loyalty, row.health, row.cityId) * venuePayoutMult(row.venueKind),
    ),
    busy: isEscortBusy(row, now),
    busyUntil: row.busyUntil ? row.busyUntil.toISOString() : null,
    missionKind: row.missionKind,
    missionKey: row.missionKey,
    missionLabel: row.missionKind ? missionLabel(row.missionKind, row.missionKey) : null,
    npcPrice: npcBuyoutPrice(row.charm, row.loyalty, row.health, row.cityId),
    venueKind: row.venueKind,
    venueName: venueByKey(row.venueKind).name,
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
        wantedLevel: me.wantedLevel,
        lastRaidAt: me.lastRaidAt,
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
      escorts={escortDtos}
      windows={windowDtos}
      market={market}
      zones={zones.map((row) => ({
        id: row.id,
        slotIndex: row.slotIndex,
        name: streetZoneName(row.slotIndex),
        rivalName: rivalByKey(row.rivalKey).name,
        ownerId: row.ownerId,
        mine: row.ownerId === userId && row.claimedUntil.getTime() > now,
        claimedUntil: row.claimedUntil.toISOString(),
        heat: row.heat,
        fee: streetClaimCost(cityId),
      }))}
      logs={logs.map((row) => ({
        id: row.id,
        message: row.message,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
