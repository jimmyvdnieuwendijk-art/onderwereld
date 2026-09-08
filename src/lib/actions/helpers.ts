import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tickPlayer } from "@/lib/game/player";
import type { ActionResult } from "@/types/game";

export async function requireUserId() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return id;
}

export async function requirePlayer() {
  const id = await requireUserId();
  if (!id) return null;
  return tickPlayer(id);
}

export function fail(message: string, variant: ActionResult["variant"] = "error"): ActionResult {
  return { ok: false, message, variant };
}

export function ok(message: string, variant: ActionResult["variant"] = "success", data?: unknown): ActionResult {
  return { ok: true, message, variant, data };
}

export async function logEvent(userId: string, type: string, message: string) {
  await prisma.gameLog.create({ data: { userId, type, message } });
}
