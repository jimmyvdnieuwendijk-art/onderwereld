import { prisma } from "@/lib/prisma";
import {
  BANK_INTEREST_INTERVAL_MS,
  BANK_INTEREST_RATE,
  ENERGY_PER_TICK,
  ENERGY_TICK_MS,
  MAX_ENERGY,
} from "@/lib/constants";
import type { PlayerSnapshot } from "@/types/game";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function tickPlayer(userId: string) {
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      rank: true,
      family: true,
      familyMembership: true,
      equippedWeapon: true,
      equippedArmor: true,
      receivedMessages: { where: { read: false }, select: { id: true } },
      _count: { select: { vehicles: true } },
    },
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
  } = {};

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

  const updated =
    Object.keys(patch).length > 0
      ? await prisma.user.update({
          where: { id: userId },
          data: patch,
          include: {
            rank: true,
            family: true,
            familyMembership: true,
            equippedWeapon: true,
            equippedArmor: true,
            receivedMessages: { where: { read: false }, select: { id: true } },
            _count: { select: { vehicles: true } },
          },
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
    _count: { vehicles: number };
  },
  ranks: { id: string; slug: string; name: string; minExp: number; order: number }[],
): PlayerSnapshot {
  const nextRank = ranks.find((rank) => rank.order === user.rank.order + 1) ?? null;

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
    defense: user.defense,
    attackPower: user.attackPower,
    killCount: user.killCount,
    currentCity: user.currentCity,
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
  };
}

export function blockedReason(player: {
  isDead: boolean;
  inJailUntil: Date | string | null;
  inHospitalUntil: Date | string | null;
}) {
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
  return null;
}
