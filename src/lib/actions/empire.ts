"use server";

import { prisma } from "@/lib/prisma";
import { cityDisplayName, normalizeCityId } from "@/lib/airports";
import { blockedReason, tickPlayer } from "@/lib/game/player";
import { clamp, randomInt } from "@/lib/format";
import {
  ESCORT_AVATARS,
  ESCORT_NAMES,
  escortIdleWhere,
  isEscortBusy,
  pimpRankFor,
  workerCapReached,
  nextPimpRank,
} from "@/lib/pimp";
import {
  BLACKMAIL_WANTED_DROP,
  MISSION_VIP_JOB,
  OUTBREAK_CLINIC_FEE,
  STREET_CLAIM_HOURS,
  STREET_CLAIM_PIMP_EXP,
  STREET_PROTECT_MS,
  STRIP_RECRUIT_COST,
  STREET_RECRUIT_COST,
  STREET_ZONES_PER_CITY,
  VENUE_HIGH_CLASS,
  VENUE_STRIPCLUB,
  VENUES,
  claimFlavor,
  pickEmpireToast,
  randomRivalKey,
  rivalByKey,
  rivalContestChance,
  streetClaimCost,
  streetZoneName,
  venueByKey,
  vipJobByKey,
} from "@/lib/empire";
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

function formId(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

export async function ensureStreetZones(cityId: string) {
  const id = normalizeCityId(cityId);
  const existing = await prisma.streetZone.findMany({ where: { cityId: id } });
  if (existing.length >= STREET_ZONES_PER_CITY) return existing;
  const now = new Date();
  const until = new Date(now.getTime() + STREET_CLAIM_HOURS * 60 * 60 * 1000);
  for (let slot = 0; slot < STREET_ZONES_PER_CITY; slot++) {
    if (existing.some((row) => row.slotIndex === slot)) continue;
    await prisma.streetZone.create({
      data: {
        cityId: id,
        slotIndex: slot,
        rivalKey: randomRivalKey(),
        claimedUntil: until,
        ownerId: null,
      },
    });
  }
  return prisma.streetZone.findMany({ where: { cityId: id }, orderBy: { slotIndex: "asc" } });
}

async function spawnEscort(
  userId: string,
  cityId: string,
  venueKind: string,
  charm: number,
  loyalty: number,
  health: number,
) {
  const existing = await prisma.escort.findMany({ where: { ownerId: userId }, select: { name: true } });
  const taken = new Set(existing.map((row) => row.name));
  const name =
    ESCORT_NAMES.find((row) => !taken.has(row)) ?? `${ESCORT_NAMES[randomInt(0, ESCORT_NAMES.length - 1)]} ${randomInt(2, 9)}`;
  const avatar = ESCORT_AVATARS[existing.length % ESCORT_AVATARS.length];
  await prisma.escort.create({
    data: { ownerId: userId, name, avatar, charm, loyalty, health, cityId, venueKind },
  });
  return name;
}

export async function recruitStreet(): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const count = await prisma.escort.count({ where: { ownerId: g.userId } });
  if (workerCapReached(g.player.pimpExp, count)) {
    const next = nextPimpRank(g.player.pimpExp);
    return fail(
      next
        ? `Stal vol (${pimpRankFor(g.player.pimpExp).name}). Volgende rang: ${next.name}.`
        : "Stal vol.",
    );
  }
  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user || user.cash < STREET_RECRUIT_COST) {
    return fail(`Straat-ronselen kost ${STREET_RECRUIT_COST} euro.`);
  }

  const cityId = normalizeCityId(g.player.currentCity);
  const roll = randomInt(1, 100);
  if (roll <= 58) {
    const charm = randomInt(28, 62);
    const name = await spawnEscort(g.userId, cityId, VENUE_HIGH_CLASS, charm, randomInt(48, 78), randomInt(70, 95));
    await prisma.user.update({
      where: { id: g.userId },
      data: { cash: { decrement: STREET_RECRUIT_COST }, pimpExp: { increment: 10 } },
    });
    const message = `${pickEmpireToast("streetOk")} ${name} stapt in ${cityDisplayName(cityId)}. Charme ${charm}.`;
    await logEvent(g.userId, "PIMP", message);
    return ok(message);
  }

  const wanted = Math.min(100, user.wantedLevel + 8);
  await prisma.user.update({
    where: { id: g.userId },
    data: { cash: { decrement: STREET_RECRUIT_COST }, wantedLevel: wanted },
  });
  await logEvent(g.userId, "PIMP", pickEmpireToast("streetFail"));
  return fail(pickEmpireToast("streetFail"), "warning");
}

export async function recruitStripclub(): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const count = await prisma.escort.count({ where: { ownerId: g.userId } });
  if (workerCapReached(g.player.pimpExp, count)) return fail("Stal vol. Promoveer of verkoop.");
  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user || user.cash < STRIP_RECRUIT_COST) {
    return fail(`Stripclub-ronselen kost ${STRIP_RECRUIT_COST} euro.`);
  }

  const cityId = normalizeCityId(g.player.currentCity);
  const roll = randomInt(1, 100);
  if (roll <= 72) {
    const charm = randomInt(48, 88);
    const name = await spawnEscort(g.userId, cityId, VENUE_STRIPCLUB, charm, randomInt(55, 86), randomInt(78, 100));
    await prisma.user.update({
      where: { id: g.userId },
      data: {
        cash: { decrement: STRIP_RECRUIT_COST },
        pimpExp: { increment: 14 },
        wantedLevel: Math.min(100, user.wantedLevel + 4),
      },
    });
    const message = `${pickEmpireToast("stripOk")} ${name} komt van het podium in ${cityDisplayName(cityId)}. Charme ${charm}.`;
    await logEvent(g.userId, "PIMP", message);
    return ok(message);
  }

  await prisma.user.update({
    where: { id: g.userId },
    data: {
      cash: { decrement: STRIP_RECRUIT_COST },
      wantedLevel: Math.min(100, user.wantedLevel + 10),
    },
  });
  const msg = "De portier kent je smoel. Geen meisje, wel zeden in de zaal. Gezocht +10.";
  await logEvent(g.userId, "PIMP", msg);
  return fail(msg, "warning");
}

export async function setEscortVenue(workerId: string, venueKind: string): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const venue = venueByKey(venueKind);
  if (!VENUES.some((row) => row.key === venueKind)) return fail("Onbekende zaak.");
  const escort = await prisma.escort.findFirst({ where: { id: workerId, ownerId: g.userId } });
  if (!escort) return fail("Onbekende escort.");
  if (isEscortBusy(escort)) return fail("Ze is nog bezet.");
  await prisma.escort.update({ where: { id: escort.id }, data: { venueKind: venue.key } });
  const message = `${escort.name} draait nu ${venue.name}. Vrijwillig clubwerk.`;
  await logEvent(g.userId, "PIMP", message);
  return ok(message);
}

export async function startVipJob(workerId: string, jobKey: string): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const job = vipJobByKey(jobKey);
  if (!job) return fail("Onbekende VIP-klus.");
  const escort = await prisma.escort.findFirst({ where: { id: workerId, ownerId: g.userId } });
  if (!escort) return fail("Onbekende escort.");
  if (escort.listedPrice) return fail("Haal haar van de beurs.");
  if (escort.windowId) return fail("Haal haar van het raam. VIP en glas lopen niet tegelijk.");
  if (isEscortBusy(escort)) return fail("Ze is nog bezet.");
  if (escort.health < 28) return fail("Te weinig conditie voor deze boeking.");

  const until = new Date(Date.now() + job.durationMs);
  const booked = await prisma.escort.updateMany({
    where: { id: escort.id, ownerId: g.userId, windowId: null, ...escortIdleWhere() },
    data: {
      busyUntil: until,
      missionKind: MISSION_VIP_JOB,
      missionKey: job.key,
      windowId: null,
    },
  });
  if (booked.count === 0) {
    return fail(`${escort.name} is net bezet. VIP en raam lopen niet tegelijk.`);
  }
  const message = `${escort.name} neemt ${job.name}. Zij mag nee zeggen. Klaar over ${Math.round(job.durationMs / 1000)} seconden.`;
  await logEvent(g.userId, "PIMP", message);
  return ok(message);
}

export async function claimStreetZone(slotIndex: number): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const slot = Math.floor(slotIndex);
  if (slot < 0 || slot >= STREET_ZONES_PER_CITY) return fail("Onbekende hoek.");
  const cityId = normalizeCityId(g.player.currentCity);
  const zones = await ensureStreetZones(cityId);
  const zone = zones.find((row) => row.slotIndex === slot);
  if (!zone) return fail("Hoek bestaat niet.");
  const now = new Date();
  if (zone.ownerId === g.userId && zone.claimedUntil.getTime() > now.getTime()) {
    return fail("Die hoek is al van jou.");
  }
  if (zone.ownerId && zone.ownerId !== g.userId && zone.claimedUntil.getTime() > now.getTime()) {
    return fail("Een andere speler houdt deze stoep vast.");
  }

  const fee = streetClaimCost(cityId);
  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user || user.cash < fee) return fail(`Overnemen kost ${fee} euro.`);

  const protectedUntil = user.streetProtectUntil && user.streetProtectUntil.getTime() > now.getTime();
  const chance = rivalContestChance(g.player.pimpExp) + (protectedUntil ? 12 : 0);
  const roll = randomInt(1, 100);
  const rival = rivalByKey(zone.rivalKey);

  if (roll > chance) {
    await prisma.user.update({
      where: { id: g.userId },
      data: {
        cash: { decrement: fee },
        wantedLevel: Math.min(100, user.wantedLevel + 7),
        health: clamp(user.health - randomInt(4, 12), 8, 100),
      },
    });
    const msg = `${rival.name} houdt ${streetZoneName(slot)}. Jij bloedt uit je lip, niet uit je ego. Gezocht +7.`;
    await logEvent(g.userId, "PIMP", msg);
    return fail(msg, "warning");
  }

  const until = new Date(now.getTime() + STREET_CLAIM_HOURS * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: g.userId },
      data: { cash: { decrement: fee }, pimpExp: { increment: STREET_CLAIM_PIMP_EXP } },
    }),
    prisma.streetZone.update({
      where: { id: zone.id },
      data: { ownerId: g.userId, claimedUntil: until, heat: zone.heat + 1 },
    }),
  ]);
  const message = claimFlavor(cityId, slot, rival.name);
  await logEvent(g.userId, "PIMP", message);
  return ok(message);
}

export async function spendBlackmail(mode: string): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user || user.blackmailTapes < 1) return fail("Geen kompromat. Stuur iemand naar de wethouder.");

  if (mode === "wanted") {
    await prisma.user.update({
      where: { id: g.userId },
      data: {
        blackmailTapes: { decrement: 1 },
        wantedLevel: Math.max(0, user.wantedLevel - BLACKMAIL_WANTED_DROP),
      },
    });
    const message = "Je speelt de USB voor de commissaris. Hij zwijgt. Gezocht daalt. De wethouder zweet.";
    await logEvent(g.userId, "PIMP", message);
    return ok(message);
  }
  if (mode === "cash") {
    const payout = randomInt(700, 1400);
    await prisma.user.update({
      where: { id: g.userId },
      data: { blackmailTapes: { decrement: 1 }, cash: { increment: payout } },
    });
    const message = `Hij koopt de tape terug. ${payout} euro, contant, nog warm. Sextortion op een corrupte gast — niet op je crew.`;
    await logEvent(g.userId, "PIMP", message);
    return ok(message);
  }
  if (mode === "protect") {
    const until = new Date(Date.now() + STREET_PROTECT_MS);
    await prisma.user.update({
      where: { id: g.userId },
      data: { blackmailTapes: { decrement: 1 }, streetProtectUntil: until },
    });
    const message = "De wethouder belt de zeden terug. Dertig minuten dekking op je stoepen.";
    await logEvent(g.userId, "PIMP", message);
    return ok(message);
  }
  return fail("Onbekend gebruik.");
}

export async function treatOutbreak(): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user) return fail("Speler niet gevonden.");
  if (!user.outbreakUntil || user.outbreakUntil.getTime() <= Date.now()) {
    return fail("Geen uitbraak. De stalling is schoon.");
  }
  if (user.cash < OUTBREAK_CLINIC_FEE) return fail(`Privékliniek kost ${OUTBREAK_CLINIC_FEE} euro.`);
  await prisma.user.update({
    where: { id: g.userId },
    data: { cash: { decrement: OUTBREAK_CLINIC_FEE }, outbreakUntil: null },
  });
  const message = "Spuit, bloedtest, geen preek. De uitbraak is eraf. Condomen weer verplicht op de hoek.";
  await logEvent(g.userId, "PIMP", message);
  return ok(message);
}

export async function recruitStreetForm(_prev: ActionResult | null, _form: FormData) {
  const result = await recruitStreet();
  revalidateGame();
  return result;
}

export async function recruitStripclubForm(_prev: ActionResult | null, _form: FormData) {
  const result = await recruitStripclub();
  revalidateGame();
  return result;
}

export async function setEscortVenueForm(_prev: ActionResult | null, form: FormData) {
  const result = await setEscortVenue(formId(form, "workerId"), formId(form, "venueKind"));
  revalidateGame();
  return result;
}

export async function startVipJobForm(_prev: ActionResult | null, form: FormData) {
  const result = await startVipJob(formId(form, "workerId"), formId(form, "jobKey"));
  revalidateGame();
  return result;
}

export async function claimStreetZoneForm(_prev: ActionResult | null, form: FormData) {
  const result = await claimStreetZone(Number(form.get("slotIndex")));
  revalidateGame();
  return result;
}

export async function spendBlackmailForm(_prev: ActionResult | null, form: FormData) {
  const result = await spendBlackmail(formId(form, "mode"));
  revalidateGame();
  return result;
}

export async function treatOutbreakForm(_prev: ActionResult | null, _form: FormData) {
  const result = await treatOutbreak();
  revalidateGame();
  return result;
}
