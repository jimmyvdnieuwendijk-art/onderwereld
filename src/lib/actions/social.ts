"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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
  revalidateGame();
  revalidatePath("/game/berichten");
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
    where: { id: messageId, toUserId: userId, deletedByTo: false },
    data: { read: true },
  });
  revalidateGame();
  revalidatePath("/game/berichten");
  return ok("Gelezen.");
}

export async function markAllMessagesRead(): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const result = await prisma.message.updateMany({
    where: { toUserId: userId, read: false, deletedByTo: false },
    data: { read: true },
  });
  revalidateGame();
  revalidatePath("/game/berichten");
  return ok(result.count > 0 ? `${result.count} berichten gelezen.` : "Alles was al gelezen.");
}

export async function deleteMessage(messageId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const msg = await prisma.message.findFirst({
    where: {
      id: messageId,
      OR: [{ toUserId: userId }, { fromUserId: userId }],
    },
  });
  if (!msg) return fail("Bericht niet gevonden.");

  const asTo = msg.toUserId === userId;
  const asFrom = msg.fromUserId === userId;
  const deletedByTo = asTo ? true : msg.deletedByTo;
  const deletedByFrom = asFrom ? true : msg.deletedByFrom;

  if (deletedByTo && deletedByFrom) {
    await prisma.message.delete({ where: { id: msg.id } });
  } else {
    await prisma.message.update({
      where: { id: msg.id },
      data: { deletedByTo, deletedByFrom, read: asTo ? true : msg.read },
    });
  }
  revalidateGame();
  revalidatePath("/game/berichten");
  return ok("Bericht verwijderd.");
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

export { createFamily, leaveFamily, disbandFamily } from "@/lib/actions/family";
