import { cache } from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LOG_KEEP } from "@/lib/constants";
import { tickPlayer } from "@/lib/game/player";
import type { ActionResult } from "@/types/game";

export const requireUserId = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return id;
});

export async function requireUserIdOrRedirect() {
  const id = await requireUserId();
  if (!id) redirect("/inloggen");
  return id;
}

/** Layout snapshot: one read, writes scheduled after the response. */
export const requirePlayer = cache(async () => {
  const id = await requireUserId();
  if (!id) return null;
  return tickPlayer(id, { persist: "after" });
});

export function fail<T = unknown>(
  message: string,
  variant: ActionResult["variant"] = "error",
  data?: T,
): ActionResult<T> {
  return { ok: false, message, variant, data };
}

export function ok<T = unknown>(
  message: string,
  variant: ActionResult["variant"] = "success",
  data?: T,
): ActionResult<T> {
  return { ok: true, message, variant, data };
}

export function revalidateGame() {
  revalidatePath("/game", "layout");
}

export async function bumpWanted(userId: string, amount: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { wantedLevel: true } });
  if (!user) return;
  const next = Math.max(0, Math.min(100, user.wantedLevel + amount));
  if (next === user.wantedLevel) return;
  await prisma.user.update({ where: { id: userId }, data: { wantedLevel: next } });
}

export async function logEvent(userId: string, type: string, message: string) {
  await prisma.gameLog.create({ data: { userId, type, message } });
  await pruneGameLogs(userId);
}

/** Keep only the newest LOG_KEEP rows; older lines are deleted permanently. */
export async function pruneGameLogs(userId: string) {
  const old = await prisma.gameLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: LOG_KEEP,
    select: { id: true },
  });
  if (old.length === 0) return;
  await prisma.gameLog.deleteMany({ where: { id: { in: old.map((row) => row.id) } } });
}
