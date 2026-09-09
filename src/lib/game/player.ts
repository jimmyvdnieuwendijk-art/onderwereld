import { prisma } from "@/lib/prisma";
import {
  BANK_INTEREST_INTERVAL_MS,
  BANK_INTEREST_RATE,
  ENERGY_PER_TICK,
  ENERGY_TICK_MS,
  MAX_ENERGY,
} from "@/lib/constants";
import { cityDisplayName, getAirport, normalizeCityId } from "@/lib/airports";
import { MAIN_ESCORT_DEFENSE_BONUS, PIMP_HOUR_MS, pimpRankFor } from "@/lib/pimp";
import { gymAttackBonus, gymDefenseBonus } from "@/lib/gym";
import { parsePoker, publicPoker } from "@/lib/casino";
import { tickPimpEconomy } from "@/lib/game/pimp-tick";
import { getRanksCached } from "@/lib/catalog";
import type { PlayerSnapshot } from "@/types/game";

/** Skip pimp DB work on rapid navigations; still run when an in-game hour is due. */
const PIMP_NAV_THROTTLE_MS = 12_000;
const lastPimpCallAt = new Map<string, number>();

function shouldTickPimp(userId: string, lastPimpTickAt: Date, now: Date) {
  const incomeDue = now.getTime() - lastPimpTickAt.getTime() >= PIMP_HOUR_MS;
  const lastCall = lastPimpCallAt.get(userId) ?? 0;
  if (!incomeDue && now.getTime() - lastCall < PIMP_NAV_THROTTLE_MS) {
    return false;
  }
  lastPimpCallAt.set(userId, now.getTime());
  if (lastPimpCallAt.size > 1500) {
    const cutoff = now.getTime() - 60_000;
    for (const [id, at] of lastPimpCallAt) {
      if (at < cutoff) lastPimpCallAt.delete(id);
    }
  }
  return true;
}

const playerInclude = {
  rank: true,
  family: true,
  familyMembership: true,
  equippedWeapon: true,
  equippedArmor: true,
  receivedMessages: { where: { read: false }, select: { id: true } },
  _count: { select: { vehicles: true, escorts: true } },
} as const;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function tickPlayer(userId: string) {
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: playerInclude,
  });

  if (!user) return null;

  const patch: {
    energy?: number;
    lastEnergyAt?: Date;
    bankBalance?: number;
    lastInterestAt?: Date;
    inJailUntil?: Date | null;
    inHospitalUntil?: Date | null;
    isDead?: boolean;
    health?: number;
    rankId?: string;
    currentCity?: string;
    travelEndAt?: Date | null;
    travelDestinationId?: string | null;
    wantedLevel?: number;
  } = {};

  const cityId = normalizeCityId(user.currentCity);
  if (cityId !== user.currentCity) {
    patch.currentCity = cityId;
  }

  if (user.wantedLevel < 0) patch.wantedLevel = 0;
  if (user.wantedLevel > 100) patch.wantedLevel = 100;

  const arriving =
    !!user.travelEndAt &&
    user.travelEndAt.getTime() <= now.getTime() &&
    !!user.travelDestinationId;

  if (arriving) {
    const dest = normalizeCityId(user.travelDestinationId);
    patch.currentCity = dest;
    patch.travelEndAt = null;
    patch.travelDestinationId = null;
  } else if (user.travelEndAt && user.travelEndAt.getTime() <= now.getTime()) {
    patch.travelEndAt = null;
    patch.travelDestinationId = null;
  }

  const energyElapsed = now.getTime() - user.lastEnergyAt.getTime();
  const energyTicks = Math.floor(energyElapsed / ENERGY_TICK_MS);
  if (energyTicks > 0 && user.energy < MAX_ENERGY) {
    patch.energy = Math.min(MAX_ENERGY, user.energy + energyTicks * ENERGY_PER_TICK);
    patch.lastEnergyAt = new Date(user.lastEnergyAt.getTime() + energyTicks * ENERGY_TICK_MS);
  } else if (user.energy >= MAX_ENERGY) {
    patch.lastEnergyAt = now;
  }

  const interestElapsed = now.getTime() - user.lastInterestAt.getTime();
  const hours = Math.floor(interestElapsed / BANK_INTEREST_INTERVAL_MS);
  if (hours > 0) {
    if (user.bankBalance > 0) {
      const interest = Math.floor(user.bankBalance * BANK_INTEREST_RATE * hours);
      if (interest > 0) {
        patch.bankBalance = user.bankBalance + interest;
      }
    }
    patch.lastInterestAt = new Date(
      user.lastInterestAt.getTime() + hours * BANK_INTEREST_INTERVAL_MS,
    );
  }

  if (user.inJailUntil && user.inJailUntil.getTime() <= now.getTime()) {
    patch.inJailUntil = null;
  }

  if (user.inHospitalUntil && user.inHospitalUntil.getTime() <= now.getTime()) {
    patch.inHospitalUntil = null;
    patch.isDead = false;
    if (user.health < 25) patch.health = 25;
  }

  const ranks = await getRanksCached();
  const currentExp = user.exp;
  const matching = [...ranks].reverse().find((rank) => currentExp >= rank.minExp) ?? ranks[0];
  if (matching && matching.id !== user.rankId) {
    patch.rankId = matching.id;
  }

  let updated =
    Object.keys(patch).length > 0
      ? await prisma.user.update({
          where: { id: userId },
          data: patch,
          include: playerInclude,
        })
      : user;

  if (patch.rankId && matching && matching.id !== user.rankId) {
    await prisma.gameLog.create({
      data: {
        userId,
        type: "RANK",
        message: `Je bent gepromoveerd tot ${matching.name}.`,
      },
    });
  }

  if (arriving) {
    const dest = getAirport(user.travelDestinationId ?? "ams");
    await prisma.gameLog.create({
      data: {
        userId,
        type: "TRAVEL",
        message: `Je landt op ${dest.airport} in ${dest.city}. De douane wuift je door — of kijkt de andere kant op.`,
      },
    });
  }

  if (shouldTickPimp(userId, updated.lastPimpTickAt, now)) {
    const pimp = await tickPimpEconomy(userId, now);
    if (pimp.changed) {
      const again = await prisma.user.findUnique({
        where: { id: userId },
        include: playerInclude,
      });
      if (again) updated = again;
    }
  }

  return toSnapshot(updated, ranks);
}
