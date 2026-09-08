"use server";

import { prisma } from "@/lib/prisma";
import { BAIL_PER_MINUTE, HOSPITAL_PER_MINUTE } from "@/lib/constants";
import { blockedReason, tickPlayer } from "@/lib/game/player";
import { clamp, remainingMs } from "@/lib/format";
import { bumpWanted, fail, logEvent, ok, requireUserId, revalidateGame } from "@/lib/actions/helpers";
import type { ActionResult } from "@/types/game";

export async function attackPlayer(defenderId: string, bulletsUsed: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  if (userId === defenderId) return fail("Je kunt jezelf niet aanvallen.");

  const attacker = await tickPlayer(userId);
  if (!attacker) return fail("Speler niet gevonden.");
  const blocked = blockedReason(attacker);
  if (blocked) return fail(blocked, "warning");

  const bullets = Math.max(1, Math.min(25, Math.floor(bulletsUsed)));
  if (!attacker.equippedWeapon) return fail("Rust eerst een wapen uit in de winkel.");
  if (attacker.bullets < bullets) return fail("Niet genoeg kogels.");

  const defenderLive = await tickPlayer(defenderId);
  if (!defenderLive) return fail("Doelwit niet gevonden.");
  if (defenderLive.isDead || (defenderLive.inHospitalUntil && new Date(defenderLive.inHospitalUntil).getTime() > Date.now())) {
    return fail("Dit slachtoffer ligt al in het ziekenhuis.");
  }
  if (defenderLive.inJailUntil && new Date(defenderLive.inJailUntil).getTime() > Date.now()) {
    return fail("Dit slachtoffer zit achter de tralies.");
  }
  if (defenderLive.isTraveling) {
    return fail("Dit doelwit zit in de lucht. Wacht tot het vliegtuig landt.");
  }

  const attackScore = attacker.attackPower * bullets * (0.85 + Math.random() * 0.3);
  const defenseScore = (defenderLive.defense + 8) * 1.1;
  const damage = Math.max(4, Math.round(attackScore - defenseScore / 3));
  const applied = Math.min(defenderLive.health, damage);
  const newHealth = defenderLive.health - applied;
  const killed = newHealth <= 0;
  const stolen = killed
    ? Math.floor(defenderLive.cash * 0.55)
    : Math.floor(defenderLive.cash * 0.18);
  const hospitalMinutes = killed ? 25 : clamp(Math.ceil(applied / 6), 8, 20);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        bullets: { decrement: bullets },
        cash: { increment: stolen },
        exp: { increment: killed ? 80 : 25 },
        killCount: { increment: killed ? 1 : 0 },
      },
    });
    await tx.user.update({
      where: { id: defenderId },
      data: {
        health: killed ? 0 : newHealth,
        cash: { decrement: stolen },
        isDead: killed,
        inHospitalUntil: new Date(Date.now() + hospitalMinutes * 60_000),
      },
    });
    await tx.attackLog.create({
      data: {
        attackerId: userId,
        defenderId,
        bulletsUsed: bullets,
        damage: applied,
        outcome: killed ? "KILL" : "HIT",
      },
    });
  });

  const outcome = killed
    ? `Je schakelt ${defenderLive.username} uit (${applied} schade) en rooft ${stolen} euro.`
    : `Je raakt ${defenderLive.username} voor ${applied} schade en rooft ${stolen} euro.`;
  await logEvent(userId, "ATTACK", outcome);
  await bumpWanted(userId, killed ? 12 : 7);
  await logEvent(
    defenderId,
    "ATTACK",
    `${attacker.username} valt je aan (${applied} schade). Je ligt ${hospitalMinutes} minuten in het ziekenhuis.`,
  );
  await tickPlayer(userId);
  return ok(outcome);
}

export async function payBail(): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const ms = remainingMs(player.inJailUntil);
  if (ms <= 0) return fail("Je zit niet in de gevangenis.");

  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const cost = minutes * BAIL_PER_MINUTE;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.cash < cost) return fail(`Borg kost ${cost} euro. Je hebt te weinig cash.`);

  await prisma.user.update({
    where: { id: userId },
    data: { cash: { decrement: cost }, inJailUntil: null },
  });
  const message = `Je koopt je vrij voor ${cost} euro.`;
  await logEvent(userId, "JAIL", message);
  return ok(message);
}

export async function payHospital(): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const ms = remainingMs(player.inHospitalUntil);
  if (ms <= 0 && !player.isDead) return fail("Je ligt niet in het ziekenhuis.");

  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const cost = minutes * HOSPITAL_PER_MINUTE;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.cash < cost) return fail(`Privékliniek kost ${cost} euro.`);

  await prisma.user.update({
    where: { id: userId },
    data: {
      cash: { decrement: cost },
      inHospitalUntil: null,
      isDead: false,
      health: 55,
    },
  });
  const message = `Je betaalt ${cost} euro aan de privékliniek en staat weer op straat.`;
  await logEvent(userId, "HOSPITAL", message);
  return ok(message);
}

export async function attackPlayerForm(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const result = await attackPlayer(
    String(formData.get("defenderId") ?? ""),
    Number(formData.get("bullets") ?? 1),
  );
  revalidateGame();
  return result;
}

