"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  FAMILY_ANNOUNCE_MAX,
  FAMILY_CREATE_COST,
  FAMILY_MEMBER_LIMIT_START,
  ROLE_DON,
  ROLE_SOLDIER,
  ROLE_UNDERBOSS,
  ROLE_CAPO,
} from "@/lib/constants";
import {
  canInviteKick,
  canLeadJobs,
  canManageFamily,
  FAMILY_UPGRADES,
  familyBuildingDef,
  familyHeistDef,
  familyLevel,
  familyRoleRank,
  nextMemberLimit,
  normalizeFamilyRole,
  slotsUpgradeCost,
  tickFamilyEconomy,
} from "@/lib/family";
import { blockedReason, tickPlayer } from "@/lib/game/player";
import { randomInt } from "@/lib/format";
import { fail, logEvent, ok, requireUserId, revalidateGame } from "@/lib/actions/helpers";
import type { ActionResult } from "@/types/game";

function revalidateFamily() {
  revalidateGame();
  revalidatePath("/game/familie");
  revalidatePath("/game/spelers");
}

async function requireFamilyActor() {
  const userId = await requireUserId();
  if (!userId) return { error: fail("Je bent niet ingelogd.") as ActionResult };
  const player = await tickPlayer(userId);
  if (!player) return { error: fail("Speler niet gevonden.") };
  const blocked = blockedReason(player);
  if (blocked) return { error: fail(blocked, "warning") };
  const membership = await prisma.familyMember.findUnique({ where: { userId } });
  if (!membership || !player.family) return { error: fail("Je zit in geen familie.") };
  await tickFamilyEconomy(membership.familyId);
  return {
    error: null as ActionResult | null,
    userId,
    membership: { ...membership, role: normalizeFamilyRole(membership.role) },
    familyId: membership.familyId,
  };
}

async function addLedger(
  familyId: string,
  type: string,
  asset: string,
  amount: number,
  note: string,
  userId?: string | null,
) {
  await prisma.familyLedger.create({
    data: { familyId, type, asset, amount, note, userId: userId ?? null },
  });
}

async function addFamilyExp(familyId: string, amount: number) {
  await prisma.family.update({ where: { id: familyId }, data: { exp: { increment: amount } } });
}

export async function createFamily(name: string, description: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");
  if (player.family) return fail("Je zit al in een familie.");

  const clean = name.trim().slice(0, 24);
  if (clean.length < 3) return fail("Familienaam is te kort.");
  const taken = await prisma.family.findUnique({ where: { name: clean } });
  if (taken) return fail("Die familienaam bestaat al.");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.cash < FAMILY_CREATE_COST) {
    return fail(`Een familie stichten kost ${FAMILY_CREATE_COST} euro zwart geld.`);
  }

  const family = await prisma.family.create({
    data: {
      name: clean,
      description: description.trim().slice(0, 280),
      leaderId: userId,
      memberLimit: FAMILY_MEMBER_LIMIT_START,
      memberships: { create: { userId, role: ROLE_DON } },
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { cash: { decrement: FAMILY_CREATE_COST }, familyId: family.id },
  });
  const message = `Je sticht familie ${family.name}.`;
  await logEvent(userId, "FAMILY", message);
  revalidateFamily();
  return ok(message);
}

export async function leaveFamily(): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (ctx.membership.role === ROLE_DON) {
    return fail("Als Don moet je de familie eerst ontbinden of de titel overdragen.");
  }
  await prisma.familyMember.deleteMany({ where: { userId: ctx.userId } });
  await prisma.user.update({ where: { id: ctx.userId }, data: { familyId: null } });
  await prisma.familyHeistSeat.updateMany({
    where: { userId: ctx.userId, heist: { familyId: ctx.familyId, status: "OPEN" } },
    data: { userId: null },
  });
  revalidateFamily();
  return ok("Je hebt de familie verlaten.");
}

export async function disbandFamily(): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (ctx.membership.role !== ROLE_DON) return fail("Alleen de Don kan ontbinden.");

  await prisma.user.updateMany({
    where: { familyId: ctx.familyId },
    data: { familyId: null },
  });
  await prisma.family.delete({ where: { id: ctx.familyId } });
  revalidateFamily();
  return ok("Familie ontbonden.");
}

export async function donateToFamily(kind: string, amount: number): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  const value = Math.floor(amount);
  if (value < 1) return fail("Ongeldig bedrag.");

  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!user) return fail("Speler niet gevonden.");

  const asset = kind === "legal" ? "LEGAL" : kind === "bullets" ? "BULLETS" : "CASH";
  if (asset === "CASH") {
    if (user.cash < value) return fail("Niet genoeg zwart geld.");
    await prisma.$transaction([
      prisma.user.update({ where: { id: ctx.userId }, data: { cash: { decrement: value } } }),
      prisma.family.update({ where: { id: ctx.familyId }, data: { bankBalance: { increment: value } } }),
      prisma.familyMember.update({
        where: { id: ctx.membership.id },
        data: { donatedCash: { increment: value } },
      }),
    ]);
  } else if (asset === "LEGAL") {
    if (user.bankBalance < value) return fail("Niet genoeg wit geld op de bank.");
    await prisma.$transaction([
      prisma.user.update({ where: { id: ctx.userId }, data: { bankBalance: { decrement: value } } }),
      prisma.family.update({ where: { id: ctx.familyId }, data: { legalBank: { increment: value } } }),
      prisma.familyMember.update({
        where: { id: ctx.membership.id },
        data: { donatedLegal: { increment: value } },
      }),
    ]);
  } else {
    if (user.bullets < value) return fail("Niet genoeg kogels.");
    await prisma.$transaction([
      prisma.user.update({ where: { id: ctx.userId }, data: { bullets: { decrement: value } } }),
      prisma.family.update({ where: { id: ctx.familyId }, data: { bulletsBank: { increment: value } } }),
      prisma.familyMember.update({
        where: { id: ctx.membership.id },
        data: { donatedBullets: { increment: value } },
      }),
    ]);
  }

  await addLedger(ctx.familyId, "DEPOSIT", asset, value, "Storting in de kluis", ctx.userId);
  await addFamilyExp(ctx.familyId, Math.max(1, Math.floor(value / 400)));
  revalidateFamily();
  return ok("Storting verwerkt.");
}

export async function payoutFromFamily(
  memberUserId: string,
  kind: string,
  amount: number,
): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (!canManageFamily(ctx.membership.role)) return fail("Alleen Don of Underboss kan uitbetalen.");
  const value = Math.floor(amount);
  if (value < 1) return fail("Ongeldig bedrag.");

  const target = await prisma.familyMember.findFirst({
    where: { familyId: ctx.familyId, userId: memberUserId },
  });
  if (!target) return fail("Lid niet gevonden.");

  const family = await prisma.family.findUnique({ where: { id: ctx.familyId } });
  if (!family) return fail("Familie niet gevonden.");
  const asset = kind === "legal" ? "LEGAL" : kind === "bullets" ? "BULLETS" : "CASH";

  if (asset === "CASH") {
    if (family.bankBalance < value) return fail("Niet genoeg zwart geld in de kluis.");
    await prisma.$transaction([
      prisma.family.update({ where: { id: ctx.familyId }, data: { bankBalance: { decrement: value } } }),
      prisma.user.update({ where: { id: memberUserId }, data: { cash: { increment: value } } }),
    ]);
  } else if (asset === "LEGAL") {
    if (family.legalBank < value) return fail("Niet genoeg wit geld in de kluis.");
    await prisma.$transaction([
      prisma.family.update({ where: { id: ctx.familyId }, data: { legalBank: { decrement: value } } }),
      prisma.user.update({ where: { id: memberUserId }, data: { bankBalance: { increment: value } } }),
    ]);
  } else {
    if (family.bulletsBank < value) return fail("Niet genoeg kogels in de kluis.");
    await prisma.$transaction([
      prisma.family.update({ where: { id: ctx.familyId }, data: { bulletsBank: { decrement: value } } }),
      prisma.user.update({ where: { id: memberUserId }, data: { bullets: { increment: value } } }),
    ]);
  }

  await addLedger(ctx.familyId, "PAYOUT", asset, value, "Uitbetaling aan lid", ctx.userId);
  revalidateFamily();
  return ok("Uitbetaling gedaan.");
}

export async function inviteToFamily(username: string): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (!canInviteKick(ctx.membership.role)) return fail("Jouw rang mag niet uitnodigen.");

  const family = await prisma.family.findUnique({
    where: { id: ctx.familyId },
    include: { _count: { select: { memberships: true } } },
  });
  if (!family) return fail("Familie niet gevonden.");
  if (family._count.memberships >= family.memberLimit) {
    return fail("De familie zit vol. Koop eerst meer plekken.");
  }

  const target = await prisma.user.findFirst({
    where: { username: { equals: username.trim(), mode: "insensitive" } },
  });
  if (!target) return fail("Speler niet gevonden.");
  if (target.id === ctx.userId) return fail("Je kunt jezelf niet uitnodigen.");
  if (target.familyId) return fail("Die speler zit al in een familie.");

  await prisma.familyInvite.upsert({
    where: { familyId_toUserId: { familyId: ctx.familyId, toUserId: target.id } },
    create: { familyId: ctx.familyId, fromUserId: ctx.userId, toUserId: target.id },
    update: { fromUserId: ctx.userId, createdAt: new Date() },
  });
  await logEvent(target.id, "FAMILY", `Uitnodiging van familie ${family.name}.`);
  revalidateFamily();
  return ok(`Uitnodiging naar ${target.username} verstuurd.`);
}

export async function acceptFamilyInvite(inviteId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");
  if (player.family) return fail("Je zit al in een familie.");

  const invite = await prisma.familyInvite.findFirst({
    where: { id: inviteId, toUserId: userId },
    include: { family: { include: { _count: { select: { memberships: true } } } } },
  });
  if (!invite) return fail("Uitnodiging niet gevonden.");
  if (invite.family._count.memberships >= invite.family.memberLimit) {
    return fail("Die familie zit vol.");
  }

  await prisma.$transaction([
    prisma.familyMember.create({
      data: { familyId: invite.familyId, userId, role: ROLE_SOLDIER },
    }),
    prisma.user.update({ where: { id: userId }, data: { familyId: invite.familyId } }),
    prisma.familyInvite.deleteMany({ where: { toUserId: userId } }),
  ]);
  const message = `Je sluit je aan bij ${invite.family.name}.`;
  await logEvent(userId, "FAMILY", message);
  revalidateFamily();
  return ok(message);
}

export async function declineFamilyInvite(inviteId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  await prisma.familyInvite.deleteMany({ where: { id: inviteId, toUserId: userId } });
  revalidateFamily();
  return ok("Uitnodiging geweigerd.");
}

export async function kickFamilyMember(memberUserId: string): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (!canInviteKick(ctx.membership.role)) return fail("Jouw rang mag niet kicken.");
  if (memberUserId === ctx.userId) return fail("Je kunt jezelf niet kicken.");

  const target = await prisma.familyMember.findFirst({
    where: { familyId: ctx.familyId, userId: memberUserId },
  });
  if (!target) return fail("Lid niet gevonden.");
  if (familyRoleRank(ctx.membership.role) <= familyRoleRank(target.role)) {
    return fail("Je kunt alleen lager in rang kicken.");
  }

  await prisma.familyMember.delete({ where: { id: target.id } });
  await prisma.user.update({ where: { id: memberUserId }, data: { familyId: null } });
  await prisma.familyHeistSeat.updateMany({
    where: { userId: memberUserId, heist: { familyId: ctx.familyId, status: "OPEN" } },
    data: { userId: null },
  });
  revalidateFamily();
  return ok("Lid uit de familie gezet.");
}

const ROLE_LADDER = [ROLE_SOLDIER, ROLE_CAPO, ROLE_UNDERBOSS, ROLE_DON] as const;

export async function setFamilyMemberRole(memberUserId: string, direction: "up" | "down"): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (familyRoleRank(ctx.membership.role) < 3) return fail("Alleen Don of Underboss kan rangen zetten.");
  if (memberUserId === ctx.userId) return fail("Je kunt je eigen rang niet zo wijzigen.");

  const target = await prisma.familyMember.findFirst({
    where: { familyId: ctx.familyId, userId: memberUserId },
  });
  if (!target) return fail("Lid niet gevonden.");
  const current = normalizeFamilyRole(target.role);
  if (current === ROLE_DON) return fail("De Don kan niet worden gedegradeerd.");
  const idx = ROLE_LADDER.indexOf(current);
  const next = ROLE_LADDER[idx + (direction === "up" ? 1 : -1)];
  if (!next || next === ROLE_DON) return fail("Die rangwijziging mag niet.");
  if (familyRoleRank(ctx.membership.role) <= familyRoleRank(next)) {
    return fail("Je kunt niemand tot jouw rang of hoger promoveren.");
  }
  if (next === ROLE_UNDERBOSS && ctx.membership.role !== ROLE_DON) {
    return fail("Alleen de Don benoemt een Underboss.");
  }

  await prisma.familyMember.update({ where: { id: target.id }, data: { role: next } });
  revalidateFamily();
  return ok(direction === "up" ? "Lid gepromoveerd." : "Lid gedegradeerd.");
}

export async function transferDon(memberUserId: string): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (ctx.membership.role !== ROLE_DON) return fail("Alleen de Don kan de titel overdragen.");

  const target = await prisma.familyMember.findFirst({
    where: { familyId: ctx.familyId, userId: memberUserId },
  });
  if (!target) return fail("Lid niet gevonden.");

  await prisma.$transaction([
    prisma.familyMember.update({ where: { id: ctx.membership.id }, data: { role: ROLE_UNDERBOSS } }),
    prisma.familyMember.update({ where: { id: target.id }, data: { role: ROLE_DON } }),
    prisma.family.update({ where: { id: ctx.familyId }, data: { leaderId: memberUserId } }),
  ]);
  revalidateFamily();
  return ok("De titel Don is overgedragen.");
}

export async function pinFamilyAnnouncement(text: string): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (!canManageFamily(ctx.membership.role)) return fail("Alleen Don of Underboss mag het bord pinnen.");
  const clean = text.trim().slice(0, FAMILY_ANNOUNCE_MAX);
  await prisma.family.update({
    where: { id: ctx.familyId },
    data: { announcement: clean, announcementAt: clean ? new Date() : null },
  });
  revalidateFamily();
  return ok(clean ? "Mededeling gepind." : "Bord gewist.");
}

export async function updateFamilyMotto(description: string): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (!canManageFamily(ctx.membership.role)) return fail("Geen beheer-rechten.");
  await prisma.family.update({
    where: { id: ctx.familyId },
    data: { description: description.trim().slice(0, 280) },
  });
  revalidateFamily();
  return ok("Motto opgeslagen.");
}

export async function buyFamilyBuilding(slug: string): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (!canLeadJobs(ctx.membership.role)) return fail("Vanaf Caporegime kun je vastgoed kopen.");
  const def = familyBuildingDef(slug);
  if (!def) return fail("Onbekend pand.");

  const existing = await prisma.familyBuilding.findUnique({
    where: { familyId_slug: { familyId: ctx.familyId, slug } },
  });
  const nextLevel = (existing?.level ?? 0) + 1;
  if (nextLevel > 3) return fail("Dit pand is al maximaal uitgebouwd.");
  const cost = def.cost * nextLevel;
  const family = await prisma.family.findUnique({ where: { id: ctx.familyId } });
  if (!family || family.bankBalance < cost) return fail(`Dit kost ${cost} euro zwart uit de kluis.`);

  await prisma.$transaction([
    prisma.family.update({ where: { id: ctx.familyId }, data: { bankBalance: { decrement: cost } } }),
    existing
      ? prisma.familyBuilding.update({ where: { id: existing.id }, data: { level: nextLevel } })
      : prisma.familyBuilding.create({ data: { familyId: ctx.familyId, slug, level: 1 } }),
  ]);
  await addLedger(ctx.familyId, "BUILDING", "CASH", cost, `${def.name} naar level ${nextLevel}`, ctx.userId);
  await addFamilyExp(ctx.familyId, 35 * nextLevel);
  revalidateFamily();
  return ok(`${def.name} staat op level ${nextLevel}.`);
}

export async function buyFamilyUpgrade(key: string): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (!canManageFamily(ctx.membership.role)) return fail("Alleen Don of Underboss koopt upgrades.");

  const family = await prisma.family.findUnique({ where: { id: ctx.familyId } });
  if (!family) return fail("Familie niet gevonden.");

  if (key === "slots") {
    const next = nextMemberLimit(family.memberLimit);
    if (!next) return fail("Ledenaantal is al maximaal.");
    const cost = slotsUpgradeCost(family.memberLimit);
    if (family.bankBalance < cost) return fail(`Dit kost ${cost} euro uit de kluis.`);
    await prisma.family.update({
      where: { id: ctx.familyId },
      data: { bankBalance: { decrement: cost }, memberLimit: next },
    });
    await addLedger(ctx.familyId, "UPGRADE", "CASH", cost, `Ledenaantal ${next}`, ctx.userId);
    revalidateFamily();
    return ok(`Ledenaantal is nu ${next}.`);
  }

  const def = FAMILY_UPGRADES.find((row) => row.key === key);
  if (!def || def.key === "slots") return fail("Onbekende upgrade.");
  const current =
    key === "launder" ? family.launderLevel : key === "doctor" ? family.doctorLevel : family.defenseLevel;
  if (current >= def.max) return fail("Deze upgrade is max.");
  const cost = def.costFor(current);
  if (family.bankBalance < cost) return fail(`Dit kost ${cost} euro uit de kluis.`);
  const data =
    key === "launder"
      ? { launderLevel: current + 1 }
      : key === "doctor"
        ? { doctorLevel: current + 1 }
        : { defenseLevel: current + 1 };
  await prisma.family.update({
    where: { id: ctx.familyId },
    data: { bankBalance: { decrement: cost }, ...data },
  });
  await addLedger(ctx.familyId, "UPGRADE", "CASH", cost, def.name, ctx.userId);
  revalidateFamily();
  return ok(`${def.name} naar level ${current + 1}.`);
}

export async function openFamilyHeist(slug: string): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (!canLeadJobs(ctx.membership.role)) return fail("Vanaf Caporegime kun je een klus openen.");
  const def = familyHeistDef(slug);
  if (!def) return fail("Onbekende klus.");
  const family = await prisma.family.findUnique({ where: { id: ctx.familyId } });
  if (!family) return fail("Familie niet gevonden.");
  if (familyLevel(family.exp) < def.minLevel) return fail(`Familie-level ${def.minLevel} vereist.`);

  const open = await prisma.familyHeist.findFirst({
    where: { familyId: ctx.familyId, status: "OPEN" },
  });
  if (open) return fail("Er loopt al een open klus. Rond die eerst af.");

  const heist = await prisma.familyHeist.create({
    data: {
      familyId: ctx.familyId,
      slug: def.slug,
      status: "OPEN",
      createdById: ctx.userId,
      seats: { create: def.seats.map((seat) => ({ roleKey: seat.key })) },
    },
  });
  revalidateFamily();
  return ok(`${def.name} staat open. Claim een rol.`, "success", { heistId: heist.id });
}

export async function claimHeistSeat(heistId: string, roleKey: string): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error) return ctx.error;
  const heist = await prisma.familyHeist.findFirst({
    where: { id: heistId, familyId: ctx.familyId, status: "OPEN" },
    include: { seats: true },
  });
  if (!heist) return fail("Klus niet gevonden.");
  if (heist.seats.some((seat) => seat.userId === ctx.userId)) {
    return fail("Je hebt al een rol op deze klus.");
  }
  const seat = heist.seats.find((row) => row.roleKey === roleKey);
  if (!seat) return fail("Die rol bestaat niet.");
  if (seat.userId) return fail("Die rol is al geclaimd.");

  await prisma.familyHeistSeat.update({ where: { id: seat.id }, data: { userId: ctx.userId } });
  revalidateFamily();
  return ok("Rol geclaimd.");
}

export async function runFamilyHeist(heistId: string): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (!canLeadJobs(ctx.membership.role)) return fail("Vanaf Caporegime kun je de klus starten.");

  const heist = await prisma.familyHeist.findFirst({
    where: { id: heistId, familyId: ctx.familyId, status: "OPEN" },
    include: { seats: true },
  });
  if (!heist) return fail("Klus niet gevonden.");
  const def = familyHeistDef(heist.slug);
  if (!def) return fail("Onbekende klus.");
  if (heist.seats.some((seat) => !seat.userId)) return fail("Nog niet alle rollen zijn gevuld.");

  const crewIds = [...new Set(heist.seats.map((seat) => seat.userId).filter(Boolean))] as string[];
  const crew = await prisma.user.findMany({ where: { id: { in: crewIds } } });
  for (const member of crew) {
    if (member.energy < def.energy) return fail(`${member.username} heeft te weinig energie.`);
    if (member.inJailUntil && member.inJailUntil.getTime() > Date.now()) {
      return fail(`${member.username} zit vast.`);
    }
    if (member.inHospitalUntil && member.inHospitalUntil.getTime() > Date.now()) {
      return fail(`${member.username} ligt in het ziekenhuis.`);
    }
  }

  const family = await prisma.family.findUnique({ where: { id: ctx.familyId } });
  const chance = Math.min(88, def.chance + familyLevel(family?.exp ?? 0) * 3);
  const success = randomInt(1, 100) <= chance;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { id: { in: crewIds } },
      data: { energy: { decrement: def.energy } },
    });
    if (success) {
      const cash = randomInt(def.cashMin, def.cashMax);
      const cut = Math.floor(cash * 0.35);
      const vault = cash - cut;
      const each = Math.floor(cut / Math.max(1, crewIds.length));
      await tx.family.update({
        where: { id: ctx.familyId },
        data: {
          bankBalance: { increment: vault },
          bulletsBank: { increment: def.bullets },
          exp: { increment: def.familyExp },
        },
      });
      for (const id of crewIds) {
        await tx.user.update({
          where: { id },
          data: { cash: { increment: each }, exp: { increment: 20 } },
        });
      }
      await tx.familyHeist.update({
        where: { id: heist.id },
        data: { status: "DONE", resolvedAt: now },
      });
      await tx.familyLedger.create({
        data: {
          familyId: ctx.familyId,
          userId: ctx.userId,
          type: "HEIST",
          asset: "CASH",
          amount: vault,
          note: `${def.name} gelukt`,
        },
      });
    } else {
      await tx.familyHeist.update({
        where: { id: heist.id },
        data: { status: "FAILED", resolvedAt: now },
      });
    }
  });

  if (success) {
    for (const id of crewIds) {
      await logEvent(id, "FAMILY", `Familieklus ${def.name} gelukt. Buit gedeeld.`);
    }
    revalidateFamily();
    return ok(`${def.name} gelukt. Kluis + persoonlijke snede.`);
  }

  for (const id of crewIds) {
    await logEvent(id, "FAMILY", `Familieklus ${def.name} mislukt.`);
  }
  revalidateFamily();
  return fail(`${def.name} is mislukt. De straat was te heet.`, "warning");
}

export async function raidRivalFamily(targetFamilyId: string): Promise<ActionResult> {
  const ctx = await requireFamilyActor();
  if (ctx.error || !ctx.membership) return ctx.error ?? fail("Je zit in geen familie.");
  if (!canLeadJobs(ctx.membership.role)) return fail("Vanaf Caporegime kun je een rivaal raken.");
  if (targetFamilyId === ctx.familyId) return fail("Niet je eigen huis.");

  const target = await prisma.family.findUnique({
    where: { id: targetFamilyId },
    include: { buildings: true },
  });
  if (!target) return fail("Rivaal niet gevonden.");
  await tickFamilyEconomy(target.id);

  let defense = target.defenseLevel * 8;
  for (const building of target.buildings) {
    const def = familyBuildingDef(building.slug);
    if (def) defense += def.defense * building.level;
  }
  const chance = Math.max(12, 70 - defense);
  const win = randomInt(1, 100) <= chance;
  const fresh = await prisma.family.findUnique({ where: { id: target.id } });
  if (!fresh) return fail("Rivaal niet gevonden.");

  if (win) {
    const steal = Math.max(50, Math.floor(fresh.bankBalance * 0.12));
    await prisma.$transaction([
      prisma.family.update({ where: { id: target.id }, data: { bankBalance: { decrement: steal } } }),
      prisma.family.update({ where: { id: ctx.familyId }, data: { bankBalance: { increment: steal } } }),
    ]);
    await addLedger(ctx.familyId, "RAID", "CASH", steal, `Overval op ${target.name}`, ctx.userId);
    await addLedger(target.id, "RAID_LOSS", "CASH", steal, "Getroffen door rivaal", null);
    await addFamilyExp(ctx.familyId, 25);
    revalidateFamily();
    return ok(`Overval gelukt. ${steal} euro zwart meegenomen.`);
  }

  const fine = 800 + defense * 20;
  const ours = await prisma.family.findUnique({ where: { id: ctx.familyId } });
  const pay = Math.min(fine, ours?.bankBalance ?? 0);
  if (pay > 0) {
    await prisma.family.update({ where: { id: ctx.familyId }, data: { bankBalance: { decrement: pay } } });
    await addLedger(ctx.familyId, "RAID_FAIL", "CASH", pay, `Mislukte hit op ${target.name}`, ctx.userId);
  }
  revalidateFamily();
  return fail("De bunker hield stand. Jullie laten bloed en cash achter.", "warning");
}
