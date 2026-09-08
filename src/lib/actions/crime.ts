"use server";

import { prisma } from "@/lib/prisma";
import { blockedReason } from "@/lib/game/player";
import { clamp, randomInt } from "@/lib/format";
import { fail, logEvent, ok, requireUserId } from "@/lib/actions/helpers";
import { tickPlayer } from "@/lib/game/player";
import type { ActionResult } from "@/types/game";

export async function attemptCrime(crimeId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");

  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");

  const blocked = blockedReason({
    isDead: player.isDead,
    inJailUntil: player.inJailUntil,
    inHospitalUntil: player.inHospitalUntil,
  });
  if (blocked) return fail(blocked, "warning");

  if (player.crimeCooldownUntil && new Date(player.crimeCooldownUntil).getTime() > Date.now()) {
    return fail("Je moet nog bijkomen van je vorige klus.", "warning");
  }

  const crime = await prisma.crime.findUnique({ where: { id: crimeId } });
  if (!crime) return fail("Deze misdaad bestaat niet.");
  if (player.rank.order < crime.minRankOrder) {
    return fail("Je rang is te laag voor deze klus.");
  }
  if (player.energy < crime.energyCost) {
    return fail("Niet genoeg energie.");
  }

  const rankBonus = (player.rank.order - crime.minRankOrder) * 4;
  const gearBonus = Math.min(12, Math.floor(player.attackPower / 4));
  const chance = clamp(crime.successChance + rankBonus + gearBonus, 8, 92);
  const roll = randomInt(1, 100);
  const now = new Date();
  const cooldownUntil = new Date(now.getTime() + crime.cooldownSeconds * 1000);

  if (roll <= chance) {
    const cash = randomInt(crime.cashMin, crime.cashMax);
    await prisma.user.update({
      where: { id: userId },
      data: {
        cash: { increment: cash },
        exp: { increment: crime.expReward },
        energy: { decrement: crime.energyCost },
        lastCrimeAt: now,
        crimeCooldownUntil: cooldownUntil,
      },
    });
    const message = `Gelukt: ${crime.name}. Je pakt ${cash} euro en ${crime.expReward} ervaring.`;
    await logEvent(userId, "CRIME", message);
    await tickPlayer(userId);
    return ok(message);
  }

  const jailRoll = randomInt(1, 100);
  if (jailRoll <= crime.jailRiskChance) {
    const until = new Date(now.getTime() + crime.jailMinutes * 60_000);
    await prisma.user.update({
      where: { id: userId },
      data: {
        energy: { decrement: crime.energyCost },
        lastCrimeAt: now,
        crimeCooldownUntil: cooldownUntil,
        inJailUntil: until,
      },
    });
    const message = `Mislukt: ${crime.name}. De politie pakt je. Je zit ${crime.jailMinutes} minuten vast.`;
    await logEvent(userId, "JAIL", message);
    return fail(message, "warning");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      energy: { decrement: crime.energyCost },
      lastCrimeAt: now,
      crimeCooldownUntil: cooldownUntil,
    },
  });
  const message = `Mislukt: ${crime.name}. Je komt met de schrik vrij.`;
  await logEvent(userId, "CRIME", message);
  return fail(message, "warning");
}
