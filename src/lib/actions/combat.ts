"use server";

import { prisma } from "@/lib/prisma";
import { BAIL_PER_MINUTE, HOSPITAL_PER_MINUTE, ITEM_AMMO } from "@/lib/constants";
import { blockedReason, tickPlayer } from "@/lib/game/player";
import { detentionBuyoutCost, formatMoney, remainingMs } from "@/lib/format";
import { hospitalMsForHealth } from "@/lib/hospital";
import { getFamilyPerks } from "@/lib/family";
import { ammoKindForWeapon, ammoKindMeta } from "@/lib/shop-catalog";
import { bumpWanted, fail, logEvent, ok, requireUserId, revalidateGame } from "@/lib/actions/helpers";
import type { ActionResult } from "@/types/game";
import type { Prisma } from "@prisma/client";

async function consumeMatchingAmmo(
  tx: Prisma.TransactionClient,
  userId: string,
  ammoKind: string,
  amount: number,
) {
  const stacks = await tx.inventoryItem.findMany({
    where: { userId, item: { type: ITEM_AMMO, ammoKind } },
    orderBy: { quantity: "asc" },
  });
  const have = stacks.reduce((sum, row) => sum + row.quantity, 0);
  if (have < amount) return false;
  let left = amount;
  for (const stack of stacks) {
    if (left <= 0) break;
    const take = Math.min(stack.quantity, left);
    if (take >= stack.quantity) {
      await tx.inventoryItem.delete({ where: { id: stack.id } });
    } else {
      await tx.inventoryItem.update({
        where: { id: stack.id },
        data: { quantity: { decrement: take } },
      });
    }
    left -= take;
  }
  return true;
}

export async function attackPlayer(defenderId: string, bulletsUsed: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  if (userId === defenderId) return fail("Je kunt jezelf niet aanvallen.");

  const attacker = await tickPlayer(userId);
  if (!attacker) return fail("Speler niet gevonden.");
  const blocked = blockedReason(attacker);
  if (blocked) return fail(blocked, "warning");

  if (!attacker.equippedWeapon) return fail("Rust eerst een wapen uit via Overzicht of de winkel.");

  const weaponRow = await prisma.shopItem.findUnique({
    where: { id: attacker.equippedWeapon.id },
    select: { id: true, slug: true, name: true, ammoKind: true },
  });
  const ammoKind = ammoKindForWeapon(weaponRow ?? attacker.equippedWeapon);
  const ammoMeta = ammoKindMeta(ammoKind);
  const shots = ammoKind ? Math.max(1, Math.min(25, Math.floor(bulletsUsed))) : 1;

  if (ammoKind && ammoMeta) {
    const have = (attacker.inventory ?? [])
      .filter((row) => row.item.type === ITEM_AMMO && row.item.ammoKind === ammoKind)
      .reduce((sum, row) => sum + row.quantity, 0);
    if (have < shots) {
      return fail(
        `Niet genoeg ${ammoMeta.ammoName}. ${attacker.equippedWeapon.name} schiet alleen ${ammoMeta.caliber} (${have} van ${shots}).`,
      );
    }
  }

  const defenderLive = await tickPlayer(defenderId);
  if (!defenderLive) return fail("Doelwit niet gevonden.");
  if (defenderLive.isDead || remainingMs(defenderLive.inHospitalUntil) > 0) {
    return fail("Dit slachtoffer ligt al in het ziekenhuis.");
  }
  if (remainingMs(defenderLive.inJailUntil) > 0) {
    return fail("Dit slachtoffer zit achter de tralies.");
  }
  if (defenderLive.isTraveling) {
    return fail("Dit doelwit zit in de lucht. Wacht tot het vliegtuig landt.");
  }

  const attackScore = attacker.attackPower * shots * (0.85 + Math.random() * 0.3);
  const escortMult = 1 + (defenderLive.escortDefenseBonus ?? 0);
  const defenderPerks = await getFamilyPerks(defenderLive.family?.id);
  const defenseScore =
    (defenderLive.defense + 8) * 1.1 * escortMult * (1 + (defenderPerks?.defenseBonus ?? 0));
  const damage = Math.max(4, Math.round(attackScore - defenseScore / 3));
  const applied = Math.min(defenderLive.health, damage);
  const newHealth = defenderLive.health - applied;
  const killed = newHealth <= 0;
  const stolen = killed
    ? Math.floor(defenderLive.cash * 0.55)
    : Math.floor(defenderLive.cash * 0.18);
  const stayMs = hospitalMsForHealth(newHealth, killed, defenderPerks?.hospitalFactor ?? 1);
  const hospitalUntil = new Date(Date.now() + stayMs);
  const lostGoods = killed
    ? {
        drugs: defenderLive.drugs,
        weaponCrates: defenderLive.weaponCrates,
        bullets: defenderLive.bullets,
      }
    : null;

  const spent = await prisma.$transaction(async (tx) => {
    if (ammoKind) {
      const okAmmo = await consumeMatchingAmmo(tx, userId, ammoKind, shots);
      if (!okAmmo) return false;
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        cash: { increment: stolen },
        exp: { increment: killed ? 55 : 18 },
        killCount: { increment: killed ? 1 : 0 },
      },
    });
    await tx.user.update({
      where: { id: defenderId },
      data: {
        health: killed ? 0 : newHealth,
        cash: { decrement: stolen },
        isDead: killed,
        inHospitalUntil: hospitalUntil,
        ...(killed ? { drugs: 0, weaponCrates: 0, bullets: 0 } : {}),
      },
    });
    await tx.attackLog.create({
      data: {
        attackerId: userId,
        defenderId,
        bulletsUsed: shots,
        damage: applied,
        outcome: killed ? "KILL" : "HIT",
      },
    });
    return true;
  });

  if (!spent) {
    return fail(
      ammoMeta
        ? `Niet genoeg ${ammoMeta.ammoName} voor ${attacker.equippedWeapon.name}.`
        : "Niet genoeg munitie.",
    );
  }

  const outcome = killed
    ? `Je schakelt ${defenderLive.username} uit (${applied} schade) en rooft ${stolen} euro.`
    : `Je raakt ${defenderLive.username} voor ${applied} schade en rooft ${stolen} euro.`;
  await logEvent(userId, "ATTACK", outcome);
  await bumpWanted(userId, killed ? 12 : 7);
  await logEvent(
    defenderId,
    "ATTACK",
    `${attacker.username} valt je aan (${applied} schade). Je ligt in het ziekenhuis.`,
  );
  if (lostGoods && (lostGoods.drugs > 0 || lostGoods.weaponCrates > 0 || lostGoods.bullets > 0)) {
    const parts = [
      lostGoods.drugs > 0 ? `${lostGoods.drugs} drugs` : null,
      lostGoods.weaponCrates > 0 ? `${lostGoods.weaponCrates} wapenkisten` : null,
      lostGoods.bullets > 0 ? `${lostGoods.bullets} smokkelkogels` : null,
    ].filter(Boolean);
    await logEvent(
      defenderId,
      "ATTACK",
      `Bij de nederlaag verlies je je zwarte handel: ${parts.join(", ")}.`,
    );
  }
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
  const cost = detentionBuyoutCost(ms, BAIL_PER_MINUTE);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.cash < cost) {
    return fail(`Borg kost ${formatMoney(cost)}. Je hebt te weinig cash.`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { cash: { decrement: cost }, inJailUntil: null },
  });
  const message = `Je koopt jezelf vrij voor ${formatMoney(cost)} (${minutes} min × ${formatMoney(BAIL_PER_MINUTE)}).`;
  await logEvent(userId, "JAIL", message);
  await tickPlayer(userId);
  revalidateGame();
  return ok(message);
}

export async function payHospital(): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const ms = remainingMs(player.inHospitalUntil);
  if (ms <= 0) return fail("Je ligt niet in het ziekenhuis.");

  const cost = detentionBuyoutCost(ms, HOSPITAL_PER_MINUTE);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.cash < cost) {
    return fail(`Privékliniek kost ${formatMoney(cost)}. Je hebt te weinig cash.`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      cash: { decrement: cost },
      inHospitalUntil: null,
      isDead: false,
      health: 55,
    },
  });
  const message = `Je betaalt ${formatMoney(cost)} aan de privékliniek en staat weer op straat.`;
  await logEvent(userId, "HOSPITAL", message);
  await tickPlayer(userId);
  revalidateGame();
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

