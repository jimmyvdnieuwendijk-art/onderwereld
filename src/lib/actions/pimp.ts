"use server";

import { prisma } from "@/lib/prisma";
import { cityDisplayName, isAirportId, normalizeCityId } from "@/lib/airports";
import { blockedReason, tickPlayer } from "@/lib/game/player";
import { randomInt } from "@/lib/format";
import {
  ESCORT_AVATARS,
  ESCORT_NAMES,
  HIRE_PIMP_EXP,
  MIN_LIST_PRICE,
  RECRUIT_COST,
  RECRUIT_PIMP_EXP,
  WINDOWS_PER_CITY,
  WINDOW_HIRE_HOURS,
  hourlyPayout,
  nextPimpRank,
  pimpRankFor,
  transferFee,
  windowDailyFee,
  workerCapReached,
} from "@/lib/pimp";
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

export async function recruitEscort(): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;

  const count = await prisma.escort.count({ where: { ownerId: g.userId } });
  if (workerCapReached(g.player.pimpExp, count)) {
    const next = nextPimpRank(g.player.pimpExp);
    return fail(
      next
        ? `Je stal is vol (${pimpRankFor(g.player.pimpExp).name}, max ${pimpRankFor(g.player.pimpExp).maxWorkers}). Volgende rang: ${next.name}.`
        : "Je zit aan je maximum. Ghetto Mogul heeft geen plafond — jij wel, nog niet.",
    );
  }

  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user || user.cash < RECRUIT_COST) {
    return fail(`Ronselen kost ${RECRUIT_COST} euro. Je hebt te weinig cash.`);
  }

  const existing = await prisma.escort.findMany({
    where: { ownerId: g.userId },
    select: { name: true },
  });
  const taken = new Set(existing.map((row) => row.name));
  const name =
    ESCORT_NAMES.find((row) => !taken.has(row)) ?? `${ESCORT_NAMES[randomInt(0, ESCORT_NAMES.length - 1)]} ${randomInt(2, 9)}`;
  const avatar = ESCORT_AVATARS[count % ESCORT_AVATARS.length];
  const cityId = normalizeCityId(g.player.currentCity);
  const charm = randomInt(32, 78);
  const loyalty = randomInt(55, 88);
  const health = randomInt(82, 100);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: g.userId },
      data: { cash: { decrement: RECRUIT_COST }, pimpExp: { increment: RECRUIT_PIMP_EXP } },
    }),
    prisma.escort.create({
      data: { ownerId: g.userId, name, avatar, charm, loyalty, health, cityId },
    }),
  ]);

  const message = `Je haalt ${name} binnen in ${cityDisplayName(cityId)}. Charme ${charm}, loyaliteit ${loyalty}.`;
  await logEvent(g.userId, "PIMP", message);
  return ok(message);
}

export async function hireWindow(slotIndex: number): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;

  const slot = Math.floor(slotIndex);
  if (slot < 0 || slot >= WINDOWS_PER_CITY) return fail("Ongeldig raam.");

  const cityId = normalizeCityId(g.player.currentCity);
  const fee = windowDailyFee(cityId);
  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user || user.cash < fee) return fail(`Dit raam kost ${fee} euro voor 24 uur.`);

  const now = new Date();
  const hiredUntil = new Date(now.getTime() + WINDOW_HIRE_HOURS * 60 * 60 * 1000);
  const existing = await prisma.redLightWindow.findUnique({
    where: { ownerId_cityId_slotIndex: { ownerId: g.userId, cityId, slotIndex: slot } },
  });
  if (existing && existing.hiredUntil.getTime() > now.getTime()) {
    return fail("Dit raam is al van jou. Wacht tot de huur verloopt of beheer het crew.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: g.userId },
      data: { cash: { decrement: fee }, pimpExp: { increment: HIRE_PIMP_EXP } },
    });
    if (existing) {
      await tx.redLightWindow.update({
        where: { id: existing.id },
        data: { hiredUntil },
      });
    } else {
      await tx.redLightWindow.create({
        data: { ownerId: g.userId, cityId, slotIndex: slot, hiredUntil },
      });
    }
  });

  const message = `Raam ${slot + 1} in ${cityDisplayName(cityId)} gehuurd tot ${hiredUntil.toLocaleString("nl-NL")} voor ${fee} euro.`;
  await logEvent(g.userId, "PIMP", message);
  return ok(message);
}

export async function assignToWindow(workerId: string, windowId: string): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;

  const now = new Date();
  const [escort, window] = await Promise.all([
    prisma.escort.findFirst({ where: { id: workerId, ownerId: g.userId } }),
    prisma.redLightWindow.findFirst({ where: { id: windowId, ownerId: g.userId }, include: { escort: true } }),
  ]);
  if (!escort) return fail("Die escort staat niet op jouw loonlijst.");
  if (!window) return fail("Dit raam is niet van jou.");
  if (window.hiredUntil.getTime() <= now.getTime()) return fail("De huur van dit raam is verlopen.");
  if (escort.listedPrice) return fail("Eerst van de markt halen.");
  if (escort.health < 20) return fail(`${escort.name} is te zwak voor het raam.`);
  if (escort.cityId !== window.cityId) {
    return fail(`${escort.name} zit in ${cityDisplayName(escort.cityId)}. Transfer eerst naar ${cityDisplayName(window.cityId)}.`);
  }
  if (window.escort && window.escort.id !== escort.id) {
    return fail(`Raam ${window.slotIndex + 1} is bezet door ${window.escort.name}.`);
  }

  if (escort.windowId && escort.windowId !== window.id) {
    await prisma.escort.update({ where: { id: escort.id }, data: { windowId: null } });
  }

  await prisma.escort.update({ where: { id: escort.id }, data: { windowId: window.id } });
  const rate = hourlyPayout(escort.charm, escort.loyalty, escort.health, escort.cityId);
  const message = `${escort.name} op raam ${window.slotIndex + 1} in ${cityDisplayName(window.cityId)}. Raming ${rate} euro per speeluur.`;
  await logEvent(g.userId, "PIMP", message);
  return ok(message);
}

export async function unassignFromWindow(workerId: string): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const escort = await prisma.escort.findFirst({ where: { id: workerId, ownerId: g.userId } });
  if (!escort) return fail("Onbekende escort.");
  if (!escort.windowId) return fail("Die staat al los.");
  await prisma.escort.update({ where: { id: escort.id }, data: { windowId: null } });
  const message = `${escort.name} van het raam gehaald.`;
  await logEvent(g.userId, "PIMP", message);
  return ok(message);
}

export async function transferToState(workerId: string, targetState: string): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  if (!isAirportId(targetState)) return fail("Onbekende stad.");

  const escort = await prisma.escort.findFirst({ where: { id: workerId, ownerId: g.userId } });
  if (!escort) return fail("Onbekende escort.");
  const from = normalizeCityId(escort.cityId);
  const to = normalizeCityId(targetState);
  if (from === to) return fail(`${escort.name} is al in ${cityDisplayName(to)}.`);
  if (escort.listedPrice) return fail("Eerst van de markt halen.");

  const fee = transferFee(from, to);
  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user || user.cash < fee) return fail(`Transfer naar ${cityDisplayName(to)} kost ${fee} euro.`);

  await prisma.$transaction([
    prisma.user.update({ where: { id: g.userId }, data: { cash: { decrement: fee } } }),
    prisma.escort.update({
      where: { id: escort.id },
      data: { cityId: to, windowId: null },
    }),
  ]);

  const hint = to === "mia" ? " Miami betaalt het best — als de razzia's meevallen." : "";
  const message = `${escort.name} verhuist van ${cityDisplayName(from)} naar ${cityDisplayName(to)} voor ${fee} euro.${hint}`;
  await logEvent(g.userId, "PIMP", message);
  return ok(message);
}

export async function setMainEscort(workerId: string): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const escort = await prisma.escort.findFirst({ where: { id: workerId, ownerId: g.userId } });
  if (!escort) return fail("Onbekende escort.");
  if (escort.listedPrice) return fail("Een escort op de markt kan geen main escort zijn.");

  await prisma.user.update({ where: { id: g.userId }, data: { mainEscortId: escort.id } });
  const message = `${escort.name} is nu je main escort. +10% verdediging zolang die op de loonlijst blijft.`;
  await logEvent(g.userId, "PIMP", message);
  return ok(message);
}

export async function listEscort(workerId: string, price: number): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const ask = Math.floor(price);
  if (ask < MIN_LIST_PRICE) return fail(`Vraagprijs minstens ${MIN_LIST_PRICE} euro.`);
  const escort = await prisma.escort.findFirst({ where: { id: workerId, ownerId: g.userId } });
  if (!escort) return fail("Onbekende escort.");
  if (g.player.mainEscortId === escort.id) {
    await prisma.user.update({ where: { id: g.userId }, data: { mainEscortId: null } });
  }
  await prisma.escort.update({
    where: { id: escort.id },
    data: { listedPrice: ask, windowId: null },
  });
  const message = `${escort.name} staat op de escortbeurs voor ${ask} euro.`;
  await logEvent(g.userId, "PIMP", message);
  return ok(message);
}

export async function unlistEscort(workerId: string): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const escort = await prisma.escort.findFirst({ where: { id: workerId, ownerId: g.userId } });
  if (!escort) return fail("Onbekende escort.");
  if (!escort.listedPrice) return fail("Die staat niet te koop.");
  await prisma.escort.update({ where: { id: escort.id }, data: { listedPrice: null } });
  return ok(`${escort.name} is van de beurs gehaald.`);
}

export async function buyListedEscort(escortId: string): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;

  const listing = await prisma.escort.findFirst({
    where: { id: escortId, listedPrice: { not: null } },
    include: { owner: { select: { username: true } } },
  });
  if (!listing || listing.listedPrice == null) return fail("Deze listing is weg.");
  if (listing.ownerId === g.userId) return fail("Dat is je eigen stalling.");

  const count = await prisma.escort.count({ where: { ownerId: g.userId } });
  if (workerCapReached(g.player.pimpExp, count)) {
    return fail("Je stal is vol. Verkoop of promoveer eerst.");
  }

  const price = listing.listedPrice;
  const buyer = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!buyer || buyer.cash < price) return fail(`De vraagprijs is ${price} euro.`);

  const cityId = normalizeCityId(g.player.currentCity);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: g.userId }, data: { cash: { decrement: price } } });
    await tx.user.update({ where: { id: listing.ownerId }, data: { cash: { increment: price } } });
    const seller = await tx.user.findUnique({
      where: { id: listing.ownerId },
      select: { mainEscortId: true },
    });
    if (seller?.mainEscortId === listing.id) {
      await tx.user.update({ where: { id: listing.ownerId }, data: { mainEscortId: null } });
    }
    await tx.escort.update({
      where: { id: listing.id },
      data: {
        ownerId: g.userId,
        cityId,
        windowId: null,
        listedPrice: null,
      },
    });
    await tx.gameLog.create({
      data: {
        userId: listing.ownerId,
        type: "PIMP",
        message: `${g.player.username} koopt ${listing.name} van je voor ${price} euro.`,
      },
    });
  });

  const message = `Je koopt ${listing.name} van ${listing.owner.username} voor ${price} euro. ${listing.name} landt in ${cityDisplayName(cityId)}.`;
  await logEvent(g.userId, "PIMP", message);
  return ok(message);
}

export async function collectPimpIncome(): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const before = await prisma.user.findUnique({ where: { id: userId }, select: { cash: true } });
  const player = await tickPlayer(userId);
  if (!player || !before) return fail("Speler niet gevonden.");
  const gained = player.cash - before.cash;
  if (gained > 0) return ok(`Stand bijgewerkt. ${gained} euro van de ramen bijgeschreven.`);
  return ok("Geen nieuwe omzet. Zet iemand achter een gehuurd raam en wacht een speeluur (10 minuten).");
}

function formId(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

export async function recruitEscortForm(_prev: ActionResult | null, _form: FormData) {
  const result = await recruitEscort();
  revalidateGame();
  return result;
}

export async function hireWindowForm(_prev: ActionResult | null, form: FormData) {
  const result = await hireWindow(Number(form.get("slotIndex")));
  revalidateGame();
  return result;
}

export async function assignToWindowForm(_prev: ActionResult | null, form: FormData) {
  const result = await assignToWindow(formId(form, "workerId"), formId(form, "windowId"));
  revalidateGame();
  return result;
}

export async function unassignFromWindowForm(_prev: ActionResult | null, form: FormData) {
  const result = await unassignFromWindow(formId(form, "workerId"));
  revalidateGame();
  return result;
}

export async function transferToStateForm(_prev: ActionResult | null, form: FormData) {
  const result = await transferToState(formId(form, "workerId"), formId(form, "targetState"));
  revalidateGame();
  return result;
}

export async function setMainEscortForm(_prev: ActionResult | null, form: FormData) {
  const result = await setMainEscort(formId(form, "workerId"));
  revalidateGame();
  return result;
}

export async function listEscortForm(_prev: ActionResult | null, form: FormData) {
  const result = await listEscort(formId(form, "workerId"), Number(form.get("price")));
  revalidateGame();
  return result;
}

export async function unlistEscortForm(_prev: ActionResult | null, form: FormData) {
  const result = await unlistEscort(formId(form, "workerId"));
  revalidateGame();
  return result;
}

export async function buyListedEscortForm(_prev: ActionResult | null, form: FormData) {
  const result = await buyListedEscort(formId(form, "escortId"));
  revalidateGame();
  return result;
}

export async function collectPimpIncomeForm(_prev: ActionResult | null, _form: FormData) {
  const result = await collectPimpIncome();
  revalidateGame();
  return result;
}

