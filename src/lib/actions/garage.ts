"use server";

import { prisma } from "@/lib/prisma";
import { blockedReason, tickPlayer } from "@/lib/game/player";
import { clamp, randomInt } from "@/lib/format";
import { bumpWanted, fail, logEvent, ok, requireUserId, revalidateGame } from "@/lib/actions/helpers";
import {
  THEFT_COOLDOWN_MS,
  THEFT_JAIL_MINUTES,
  VEHICLE_REPAIR_MULT,
  VEHICLE_SELL_MULT,
  theftEnergyCost,
  theftJailChance,
} from "@/lib/vehicle-catalog";
import type { ActionResult } from "@/types/game";

export async function stealCar(vehicleTypeId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");

  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");

  if (player.carTheftCooldownUntil && new Date(player.carTheftCooldownUntil).getTime() > Date.now()) {
    return fail("Je kunt nog geen nieuwe auto stelen.", "warning");
  }

  const type = await prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } });
  if (!type) return fail("Onbekend voertuig.");
  if (player.rank.order < type.minRankOrder) return fail("Te laag in rang voor dit voertuig.");
  const energyCost = theftEnergyCost(type.minRankOrder);
  if (player.energy < energyCost) return fail(`Niet genoeg energie (${energyCost} nodig).`);

  const bonus = (player.rank.order - type.minRankOrder) * 5;
  const chance = clamp(88 - type.stealDifficulty + bonus, 6, 85);
  const roll = randomInt(1, 100);
  const now = new Date();
  const cooldownUntil = new Date(now.getTime() + THEFT_COOLDOWN_MS);
  const jailChance = theftJailChance(type.minRankOrder);

  if (roll <= chance) {
    const condition = randomInt(45, 100);
    await prisma.$transaction([
      prisma.vehicle.create({
        data: { userId, vehicleTypeId: type.id, condition },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          energy: { decrement: energyCost },
          exp: { increment: 12 + type.minRankOrder * 2 },
          carTheftCooldownUntil: cooldownUntil,
        },
      }),
    ]);
    const message = `Je steelt een ${type.name} (${condition}% staat).`;
    await logEvent(userId, "THEFT", message);
    await tickPlayer(userId);
    return ok(message);
  }

  if (randomInt(1, 100) <= jailChance) {
    const until = new Date(now.getTime() + THEFT_JAIL_MINUTES * 60_000);
    await prisma.user.update({
      where: { id: userId },
      data: {
        energy: { decrement: energyCost },
        carTheftCooldownUntil: cooldownUntil,
        inJailUntil: until,
      },
    });
    await bumpWanted(userId, 10);
    const message = `Betrapt bij een ${type.name}. ${THEFT_JAIL_MINUTES} minuten cel.`;
    await logEvent(userId, "JAIL", message);
    return fail(message, "warning");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { energy: { decrement: energyCost }, carTheftCooldownUntil: cooldownUntil },
  });
  const message = `Het alarm gaat af. De ${type.name} blijft staan.`;
  await logEvent(userId, "THEFT", message);
  return fail(message, "warning");
}

export async function sellVehicle(vehicleId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },
    include: { vehicleType: true, listings: { where: { active: true } } },
  });
  if (!vehicle) return fail("Auto niet gevonden.");
  if (vehicle.listings.length > 0) return fail("Deze auto staat op de markt.");

  const payout = Math.max(10, Math.floor((vehicle.condition / 100) * vehicle.vehicleType.baseValue * VEHICLE_SELL_MULT));
  await prisma.$transaction([
    prisma.vehicle.delete({ where: { id: vehicle.id } }),
    prisma.user.update({ where: { id: userId }, data: { cash: { increment: payout } } }),
  ]);
  const message = `Je verkoopt de ${vehicle.vehicleType.name} voor ${payout} euro.`;
  await logEvent(userId, "GARAGE", message);
  return ok(message);
}

export async function repairVehicle(vehicleId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },
    include: { vehicleType: true },
  });
  if (!vehicle) return fail("Auto niet gevonden.");
  if (vehicle.condition >= 100) return fail("Deze auto is al in topstaat.");

  const cost = Math.max(15, Math.floor(((100 - vehicle.condition) / 100) * vehicle.vehicleType.baseValue * VEHICLE_REPAIR_MULT));
  const fresh = await prisma.user.findUnique({ where: { id: userId } });
  if (!fresh || fresh.cash < cost) return fail("Niet genoeg contant geld voor reparatie.");

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { cash: { decrement: cost } } }),
    prisma.vehicle.update({ where: { id: vehicle.id }, data: { condition: 100 } }),
  ]);
  const message = `Je laat de ${vehicle.vehicleType.name} repareren voor ${cost} euro.`;
  await logEvent(userId, "GARAGE", message);
  return ok(message);
}

export async function stealCarForm(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const result = await stealCar(String(formData.get("vehicleTypeId") ?? ""));
  revalidateGame();
  return result;
}
