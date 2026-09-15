"use server";

import { revalidatePath } from "next/cache";
import { claimAchievements, listAchievementBoard } from "@/lib/achievements";
import { isCatalogNameColor, isCatalogTitle, nameColorLabel } from "@/lib/achievement-catalog";
import { fail, ok, requireUserId, revalidateGame } from "@/lib/actions/helpers";
import { prisma } from "@/lib/prisma";
import { normalizeNameColor } from "@/lib/player-name";
import type { ActionResult } from "@/types/game";

function revalidateAccount() {
  revalidateGame();
  revalidatePath("/game/account");
  revalidatePath("/game/account/prestaties");
}

export async function loadAchievementBoard() {
  const userId = await requireUserId();
  if (!userId) return null;
  return listAchievementBoard(userId);
}

export async function claimAchievement(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const result = await claimAchievements(userId, [id]);
  if (result.claimed < 1) return fail("Die beloning kun je nu niet claimen.", "warning");
  revalidateAccount();
  return ok(claimMessage(result), "success", result);
}

export async function claimAllAchievements(): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const result = await claimAchievements(userId, "all");
  if (result.claimed < 1) return fail("Er is niets om te claimen.", "warning");
  revalidateAccount();
  return ok(claimMessage(result), "success", result);
}

export async function selectIdentity(
  rawTitle: string,
  rawColor: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { unlockedTitles: true, unlockedNameColors: true },
  });
  if (!user) return fail("Speler niet gevonden.");

  const title = rawTitle.trim();
  const color = normalizeNameColor(rawColor.trim());

  if (title && (!isCatalogTitle(title) || !user.unlockedTitles.includes(title))) {
    return fail("Die titel is nog niet van jou.");
  }
  const unlockedColors = user.unlockedNameColors.map((hex) => hex.toLowerCase());
  if (color && (!isCatalogNameColor(color) || !unlockedColors.includes(color))) {
    return fail("Die naamkleur is nog niet van jou.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      selectedTitle: title || null,
      selectedNameColor: color,
    },
  });
  revalidateAccount();
  return ok("Identiteit opgeslagen.");
}

function claimMessage(result: { claimed: number; titles: string[]; colors: string[] }) {
  const extras = [
    ...result.titles.map((title) => `titel ${title}`),
    ...result.colors.map((color) => `kleur ${nameColorLabel(color) ?? color}`),
  ];
  const extra = extras.length > 0 ? ` Vrijgespeeld: ${extras.join(", ")}.` : "";
  if (result.claimed === 1) return `Beloning geclaimd.${extra}`;
  return `${result.claimed} beloningen geclaimd.${extra}`;
}
