"use server";

import { prisma } from "@/lib/prisma";
import { FAMILY_CREATE_COST, ROLE_LEADER, ROLE_MEMBER, ROLE_OFFICER } from "@/lib/constants";
import { blockedReason, tickPlayer } from "@/lib/game/player";
import { fail, logEvent, ok, requireUserId, revalidateGame } from "@/lib/actions/helpers";
import type { ActionResult } from "@/types/game";

export async function sendMessage(toUsername: string, subject: string, body: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");

  const cleanSubject = subject.trim().slice(0, 80);
  const cleanBody = body.trim().slice(0, 2000);
  if (cleanSubject.length < 2) return fail("Onderwerp is te kort.");
  if (cleanBody.length < 2) return fail("Bericht is te kort.");

  const target = await prisma.user.findFirst({ where: { username: toUsername.trim() } });
  if (!target) return fail("Gebruiker niet gevonden.");
  if (target.id === userId) return fail("Je kunt jezelf geen bericht sturen.");

  await prisma.message.create({
    data: {
      fromUserId: userId,
      toUserId: target.id,
      subject: cleanSubject,
      body: cleanBody,
    },
  });
  return ok(`Bericht verzonden naar ${target.username}.`);
}

export async function sendMessageForm(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const result = await sendMessage(
    String(formData.get("to") ?? ""),
    String(formData.get("subject") ?? ""),
    String(formData.get("body") ?? ""),
  );
  revalidateGame();
  return result;
}

export async function markMessageRead(messageId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  await prisma.message.updateMany({
    where: { id: messageId, toUserId: userId },
    data: { read: true },
  });
  return ok("Gelezen.");
}

export async function postShout(body: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");

  const text = body.trim().slice(0, 180);
  if (text.length < 2) return fail("Bericht is te kort.");

  await prisma.shoutboxMessage.create({ data: { userId, body: text } });
  return ok("Geplaatst in de shoutbox.");
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
    return fail(`Een familie stichten kost ${FAMILY_CREATE_COST} euro cash.`);
  }

  const family = await prisma.family.create({
    data: {
      name: clean,
      description: description.trim().slice(0, 280),
      leaderId: userId,
      memberships: { create: { userId, role: ROLE_LEADER } },
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { cash: { decrement: FAMILY_CREATE_COST }, familyId: family.id },
  });
  const message = `Je sticht familie ${family.name}.`;
  await logEvent(userId, "FAMILY", message);
  return ok(message);
}

export async function joinFamily(familyId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  if (player.family) return fail("Je zit al in een familie.");

  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) return fail("Familie niet gevonden.");

  await prisma.familyMember.create({
    data: { familyId: family.id, userId, role: ROLE_MEMBER },
  });
  await prisma.user.update({ where: { id: userId }, data: { familyId: family.id } });
  const message = `Je sluit je aan bij ${family.name}.`;
  await logEvent(userId, "FAMILY", message);
  return ok(message);
}

export async function leaveFamily(): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player?.family) return fail("Je zit in geen familie.");

  const membership = await prisma.familyMember.findUnique({ where: { userId } });
  if (membership?.role === ROLE_LEADER) {
    return fail("Als leider moet je de familie eerst ontbinden.");
  }

  await prisma.familyMember.deleteMany({ where: { userId } });
  await prisma.user.update({ where: { id: userId }, data: { familyId: null } });
  return ok("Je hebt de familie verlaten.");
}

export async function donateToFamily(amount: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player?.family) return fail("Je zit in geen familie.");
  const value = Math.floor(amount);
  if (value < 1) return fail("Ongeldig bedrag.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.cash < value) return fail("Niet genoeg cash.");

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { cash: { decrement: value } } }),
    prisma.family.update({
      where: { id: player.family.id },
      data: { bankBalance: { increment: value } },
    }),
  ]);
  return ok(`Je stort ${value} euro in de familiebank.`);
}

export async function promoteMember(memberUserId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const leader = await prisma.familyMember.findUnique({ where: { userId } });
  if (!leader || leader.role !== ROLE_LEADER) return fail("Alleen de leider kan promoveren.");

  const member = await prisma.familyMember.findFirst({
    where: { userId: memberUserId, familyId: leader.familyId },
  });
  if (!member) return fail("Lid niet gevonden.");
  await prisma.familyMember.update({
    where: { id: member.id },
    data: { role: ROLE_OFFICER },
  });
  return ok("Lid gepromoveerd tot officer.");
}

export async function disbandFamily(): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const membership = await prisma.familyMember.findUnique({ where: { userId } });
  if (!membership || membership.role !== ROLE_LEADER) return fail("Alleen de leider kan ontbinden.");

  await prisma.user.updateMany({
    where: { familyId: membership.familyId },
    data: { familyId: null },
  });
  await prisma.family.delete({ where: { id: membership.familyId } });
  return ok("Familie ontbonden.");
}
