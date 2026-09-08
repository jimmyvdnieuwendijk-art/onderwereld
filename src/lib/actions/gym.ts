"use server";

import { prisma } from "@/lib/prisma";
import { MAX_ENERGY } from "@/lib/constants";
import { blockedReason, tickPlayer } from "@/lib/game/player";
import { clamp } from "@/lib/format";
import {
  MAX_CONDITION,
  MAX_FIGHT_SKILL,
  MAX_STRENGTH,
  MIN_TRAIN_HEALTH,
  canUnlockFloor,
  energyRefundAmount,
  gymLevelByNumber,
} from "@/lib/gym";
import { fail, logEvent, ok, requireUserId, revalidateGame } from "@/lib/actions/helpers";
import type { ActionResult } from "@/types/game";

type Gate =
  | { ok: true; userId: string; player: NonNullable<Awaited<ReturnType<typeof tickPlayer>>> }
  | { ok: false; error: ActionResult };

async function gate(): Promise<Gate> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: fail("Je bent niet ingelogd.") };
  const player = await tickPlayer(userId);
  if (!player) return { ok: false, error: fail("Speler niet gevonden.") };
  const blocked = blockedReason(player);
  if (blocked) return { ok: false, error: fail(blocked, "warning") };
  return { ok: true, userId, player };
}

export async function unlockGymFloor(level: number): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const target = gymLevelByNumber(level);
  if (!target) return fail("Onbekende verdieping.");
  if (target.level <= g.player.gymFloor) return fail("Die verdieping is al van jou.");

  const check = canUnlockFloor(g.player.gymFloor, g.player.gymExp, target);
  if (!check.ok) return fail(check.reason);

  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user) return fail("Speler niet gevonden.");
  if (user.cash < target.unlockCash) return fail(`Toegang kost ${target.unlockCash} euro.`);

  await prisma.user.update({
    where: { id: g.userId },
    data: { cash: { decrement: target.unlockCash }, gymFloor: target.level },
  });
  const message = `Je koopt toegang tot ${target.name}. De trainer knikt één keer. Geen welkomstpraatje.`;
  await logEvent(g.userId, "GYM", message);
  return ok(message);
}

export async function trainGym(level: number): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const session = gymLevelByNumber(level);
  if (!session) return fail("Onbekende training.");
  if (session.level > g.player.gymFloor) return fail("Eerst die verdieping openen.");
  if (g.player.health < MIN_TRAIN_HEALTH) return fail("Te weinig conditie. Eerst het ziekenhuis of rust.");
  if (g.player.energy < session.energyCost) {
    return fail(`Deze set kost ${session.energyCost} energie.`);
  }
  if (g.player.gymCooldownUntil && new Date(g.player.gymCooldownUntil).getTime() > Date.now()) {
    return fail("Je spieren zijn nog warm. Wacht de cooldown af.", "warning");
  }

  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user) return fail("Speler niet gevonden.");
  if (user.cash < session.cashCost) return fail(`De trainer wil ${session.cashCost} euro voor deze set.`);

  const strengthGain = Math.min(session.strength, MAX_STRENGTH - user.strength);
  const conditionGain = Math.min(session.condition, MAX_CONDITION - user.condition);
  const fightGain = Math.min(session.fightSkill, MAX_FIGHT_SKILL - user.fightSkill);
  const refund = energyRefundAmount(session.energyRefundPct);
  const energyAfterCost = user.energy - session.energyCost;
  const energyNext = Math.min(MAX_ENERGY, energyAfterCost + refund);

  await prisma.user.update({
    where: { id: g.userId },
    data: {
      cash: session.cashCost > 0 ? { decrement: session.cashCost } : undefined,
      energy: energyNext,
      lastEnergyAt: new Date(),
      strength: { increment: strengthGain },
      condition: { increment: conditionGain },
      fightSkill: { increment: fightGain },
      gymExp: { increment: session.gymExp },
      gymCooldownUntil: new Date(Date.now() + session.cooldownMs),
    },
  });

  const bits = [
    strengthGain > 0 ? `kracht +${strengthGain}` : null,
    conditionGain > 0 ? `conditie +${conditionGain}` : null,
    fightGain > 0 ? `vechtkunst +${fightGain}` : null,
    `energie −${session.energyCost}/+${refund}`,
    `+${session.gymExp} gym-rep`,
  ].filter(Boolean);
  const capped =
    strengthGain < session.strength || conditionGain < session.condition || fightGain < session.fightSkill
      ? " Een stat zit tegen het plafond."
      : "";
  const message = `${session.name}: ${session.exercises[0].toLowerCase()}. ${bits.join(", ")}.${capped}`;
  await logEvent(g.userId, "GYM", message);
  return ok(message);
}

export async function unlockGymFloorForm(_prev: ActionResult | null, form: FormData) {
  const result = await unlockGymFloor(Number(form.get("level")));
  revalidateGame();
  return result;
}

export async function trainGymForm(_prev: ActionResult | null, form: FormData) {
  const result = await trainGym(Number(form.get("level")));
  revalidateGame();
  return result;
}
