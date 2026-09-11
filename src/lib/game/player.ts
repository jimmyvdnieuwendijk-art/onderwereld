import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  BANK_INTEREST_INTERVAL_MS,
  BANK_INTEREST_RATE,
  ENERGY_PER_TICK,
  ENERGY_TICK_MS,
  FAMILY_HOUR_MS,
  LAST_SEEN_WRITE_MS,
  MAX_ENERGY,
} from "@/lib/constants";
import { cityDisplayName, getAirport, normalizeCityId } from "@/lib/airports";
import { MAIN_ESCORT_DEFENSE_BONUS, PIMP_HOUR_MS, pimpRankFor } from "@/lib/pimp";
import { gymAttackBonus, gymDefenseBonus } from "@/lib/gym";
import { parsePoker, publicPoker } from "@/lib/casino";
import { tickPimpEconomy } from "@/lib/game/pimp-tick";
import { tickFamilyEconomy } from "@/lib/family";
import { firePriceAlerts } from "@/lib/game/price-alerts";
import { getRanksCached } from "@/lib/catalog";
import type { PlayerSnapshot } from "@/types/game";

/** Persist energy at most every 30s so nav does not write on every request. */
const ENERGY_PERSIST_TICKS = 3;

const playerInclude = {
  rank: true,
  family: { select: { id: true, name: true, lastIncomeAt: true } },
  familyMembership: { select: { role: true } },
  equippedWeapon: true,
  equippedArmor: true,
  _count: {
    select: {
      vehicles: true,
      escorts: true,
      receivedMessages: { where: { read: false, deletedByTo: false } },
    },
  },
} as const;

const playerOmit = {
  hashedPassword: true,
  totpSecret: true,
  totpPending: true,
} as const;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

async function loadPlayerRow(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    omit: playerOmit,
    include: playerInclude,
  });
}

type PlayerRow = NonNullable<Awaited<ReturnType<typeof loadPlayerRow>>>;

export async function tickPlayer(
  userId: string,
  opts?: { economy?: boolean; persist?: "await" | "after" },
) {
  const now = new Date();
  const economy = opts?.economy === true;
  const persistMode = opts?.persist ?? "await";

  const [user, ranks] = await Promise.all([
    loadPlayerRow(userId),
    getRanksCached(),
  ]);

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
    lastSeenAt?: Date;
  } = {};

  const cityId = normalizeCityId(user.currentCity);
  if (cityId !== user.currentCity) {
    patch.currentCity = cityId;
  }

  if (user.wantedLevel < 0) patch.wantedLevel = 0;
  if (user.wantedLevel > 100) patch.wantedLevel = 100;

  if (!user.lastSeenAt || now.getTime() - user.lastSeenAt.getTime() >= LAST_SEEN_WRITE_MS) {
    patch.lastSeenAt = now;
  }

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
    const nextEnergy = Math.min(MAX_ENERGY, user.energy + energyTicks * ENERGY_PER_TICK);
    user.energy = nextEnergy;
    if (energyTicks >= ENERGY_PERSIST_TICKS || nextEnergy >= MAX_ENERGY) {
      patch.energy = nextEnergy;
      patch.lastEnergyAt = new Date(user.lastEnergyAt.getTime() + energyTicks * ENERGY_TICK_MS);
    }
  } else if (user.energy >= MAX_ENERGY && energyElapsed >= LAST_SEEN_WRITE_MS) {
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

  const currentExp = user.exp;
  const matching = [...ranks].reverse().find((rank) => currentExp >= rank.minExp) ?? ranks[0];
  if (matching && matching.id !== user.rankId) {
    patch.rankId = matching.id;
  }

  const live = {
    ...user,
    ...patch,
    rank: patch.rankId && matching ? matching : user.rank,
  };

  const pimpDue = now.getTime() - live.lastPimpTickAt.getTime() >= PIMP_HOUR_MS;
  const runPimp = pimpDue || (economy && live._count.escorts > 0);
  const familyDue =
    !!live.familyId &&
    !!live.family &&
    now.getTime() - live.family.lastIncomeAt.getTime() >= FAMILY_HOUR_MS;

  const persist = async () => {
    if (Object.keys(patch).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: patch,
      });
    }

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
      await firePriceAlerts(userId, dest.id);
    }

    if (runPimp) {
      await tickPimpEconomy(userId, now);
    }
    if (familyDue && live.familyId) {
      await tickFamilyEconomy(live.familyId, now);
    }
  };

  const needsWork =
    Object.keys(patch).length > 0 || arriving || runPimp || familyDue;

  if (needsWork) {
    if (persistMode === "after") {
      after(() => {
        void persist().catch(() => undefined);
      });
    } else {
      await persist();
      if (runPimp) {
        const again = await loadPlayerRow(userId);
        if (again) {
          return toSnapshot(again, ranks);
        }
      }
    }
  }

  return toSnapshot(live, ranks);
}

function toSnapshot(
  user: PlayerRow,
  ranks: { id: string; slug: string; name: string; minExp: number; order: number }[],
): PlayerSnapshot {
  const nextRank = ranks.find((rank) => rank.order === user.rank.order + 1) ?? null;
  const pimpRank = pimpRankFor(user.pimpExp);

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName ?? null,
    bio: user.bio ?? null,
    bioHidden: user.bioHidden,
    hideOnline: user.hideOnline,
    avatarUrl: user.avatarUrl ?? null,
    totpEnabled: !!user.totpEnabled,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: toIso(user.lastLoginAt),
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
    unreadMessages: user._count.receivedMessages,
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
