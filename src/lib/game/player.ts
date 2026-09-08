import { prisma } from "@/lib/prisma";
import {
  BANK_INTEREST_INTERVAL_MS,
  BANK_INTEREST_RATE,
  ENERGY_PER_TICK,
  ENERGY_TICK_MS,
  MAX_ENERGY,
} from "@/lib/constants";
import { cityDisplayName, getAirport, normalizeCityId } from "@/lib/airports";
import { MAIN_ESCORT_DEFENSE_BONUS, pimpRankFor } from "@/lib/pimp";
import { gymAttackBonus, gymDefenseBonus } from "@/lib/gym";
import { parsePoker, publicPoker } from "@/lib/casino";
import { tickPimpEconomy } from "@/lib/game/pimp-tick";
import type { PlayerSnapshot } from "@/types/game";

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

  const ranks = await prisma.rank.findMany({ orderBy: { order: "asc" } });
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

  const pimp = await tickPimpEconomy(userId, now);
  if (pimp.changed) {
    const again = await prisma.user.findUnique({
      where: { id: userId },
      include: playerInclude,
    });
    if (again) updated = again;
  }

  return toSnapshot(updated, ranks);
}

function toSnapshot(
  user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>> & {
    rank: { id: string; slug: string; name: string; minExp: number; order: number };
    family: { id: string; name: string } | null;
    familyMembership: { role: string } | null;
    equippedWeapon: { id: string; name: string; attack: number; defense: number } | null;
    equippedArmor: { id: string; name: string; attack: number; defense: number } | null;
    receivedMessages: { id: string }[];
    _count: { vehicles: number; escorts: number };
    pimpExp: number;
    mainEscortId: string | null;
    lastRaidAt: Date | null;
    blackmailTapes: number;
    outbreakUntil: Date | null;
    streetProtectUntil: Date | null;
    strength: number;
    condition: number;
    fightSkill: number;
    gymExp: number;
    gymFloor: number;
    gymCooldownUntil: Date | null;
    casinoCooldownUntil: Date | null;
    casinoPeekUntil: Date | null;
    casinoPokerJson: string | null;
  },
  ranks: { id: string; slug: string; name: string; minExp: number; order: number }[],
): PlayerSnapshot {
  const nextRank = ranks.find((rank) => rank.order === user.rank.order + 1) ?? null;
  const pimpRank = pimpRankFor(user.pimpExp);

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    cash: user.cash,
    bankBalance: user.bankBalance,
    health: user.health,
    energy: user.energy,
    exp: user.exp,
    bullets: user.bullets,
    defense: user.defense + gymDefenseBonus(user.condition, user.fightSkill),
    attackPower: user.attackPower + gymAttackBonus(user.strength, user.fightSkill),
    killCount: user.killCount,
    wantedLevel: user.wantedLevel,
    currentCity: normalizeCityId(user.currentCity),
    currentCityName: cityDisplayName(user.currentCity),
    currentAirport: getAirport(user.currentCity).airport,
    isTraveling: !!(user.travelEndAt && user.travelEndAt.getTime() > Date.now()),
    travelEndAt: toIso(user.travelEndAt),
    travelDestinationId: user.travelDestinationId,
    travelDestinationName: user.travelDestinationId ? cityDisplayName(user.travelDestinationId) : null,
    drugs: user.drugs,
    weaponCrates: user.weaponCrates,
    isDead: user.isDead,
    inJailUntil: toIso(user.inJailUntil),
    inHospitalUntil: toIso(user.inHospitalUntil),
    crimeCooldownUntil: toIso(user.crimeCooldownUntil),
    carTheftCooldownUntil: toIso(user.carTheftCooldownUntil),
    rank: user.rank,
    nextRank,
    family: user.family
      ? { id: user.family.id, name: user.family.name, role: user.familyMembership?.role ?? null }
      : null,
    unreadMessages: user.receivedMessages.length,
    equippedWeapon: user.equippedWeapon,
    equippedArmor: user.equippedArmor,
    vehicleCount: user._count.vehicles,
    pimpExp: user.pimpExp,
    pimpRankName: pimpRank.name,
    pimpMaxWorkers: pimpRank.maxWorkers,
    workerCount: user._count.escorts,
    mainEscortId: user.mainEscortId,
    hasMainEscort: !!user.mainEscortId,
    escortDefenseBonus: user.mainEscortId ? MAIN_ESCORT_DEFENSE_BONUS : 0,
    lastRaidAt: toIso(user.lastRaidAt),
    blackmailTapes: user.blackmailTapes,
    outbreakUntil: toIso(user.outbreakUntil),
    streetProtectUntil: toIso(user.streetProtectUntil),
    strength: user.strength,
    condition: user.condition,
    fightSkill: user.fightSkill,
    gymExp: user.gymExp,
    gymFloor: user.gymFloor,
    gymCooldownUntil: toIso(user.gymCooldownUntil),
    casinoCooldownUntil: toIso(user.casinoCooldownUntil),
    casinoPeekUntil: toIso(user.casinoPeekUntil),
    casinoPoker: publicPoker(parsePoker(user.casinoPokerJson)),
  };
}

export function isPlayerTraveling(player: {
  travelEndAt?: Date | string | null;
  isTraveling?: boolean;
}) {
  const now = Date.now();
  if (player.travelEndAt) {
    const ts =
      typeof player.travelEndAt === "string"
        ? new Date(player.travelEndAt).getTime()
        : player.travelEndAt.getTime();
    if (ts > now) return true;
    return false;
  }
  return !!player.isTraveling;
}

export function blockedReason(
  player: {
    isDead: boolean;
    inJailUntil: Date | string | null;
    inHospitalUntil: Date | string | null;
    travelEndAt?: Date | string | null;
    isTraveling?: boolean;
  },
  opts?: { travel?: boolean },
) {
  const now = Date.now();
  const jail =
    player.inJailUntil &&
    (typeof player.inJailUntil === "string"
      ? new Date(player.inJailUntil).getTime()
      : player.inJailUntil.getTime()) > now;
  const hospital =
    player.inHospitalUntil &&
    (typeof player.inHospitalUntil === "string"
      ? new Date(player.inHospitalUntil).getTime()
      : player.inHospitalUntil.getTime()) > now;

  if (jail) return "Je zit in de gevangenis. Wacht of betaal borg.";
  if (hospital || player.isDead) return "Je ligt in het ziekenhuis en kunt nu niets ondernemen.";
  if (opts?.travel !== false && isPlayerTraveling(player)) {
    return "Je zit in het vliegtuig. Misdaden, handel en gevechten moeten wachten tot je landt.";
  }
  return null;
}
