import { cache } from "react";
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

/** One player tick per incoming request — layout and page share this. */
export const requirePlayer = cache(async () => {
  const id = await requireUserId();
  if (!id) return null;
  return tickPlayer(id);
});

export function fail(
  message: string,
  variant: ActionResult["variant"] = "error",
  data?: unknown,
): ActionResult {
  return { ok: false, message, variant, data };
}

export function ok(message: string, variant: ActionResult["variant"] = "success", data?: unknown): ActionResult {
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
