"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BIO_MAX, PASSWORD_MIN } from "@/lib/constants";
import { avatarPublicPath, readAvatarFile } from "@/lib/avatar";
import { fail, logEvent, ok, requireUserId, revalidateGame } from "@/lib/actions/helpers";
import type { ActionResult } from "@/types/game";

async function requireAccountUser() {
  const userId = await requireUserId();
  if (!userId) return { user: null, error: fail("Je bent niet ingelogd.") };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, hashedPassword: true },
  });
  if (!user) return { user: null, error: fail("Speler niet gevonden.") };
  return { user, error: null };
}

function revalidateAccount(username?: string) {
  revalidateGame();
  revalidatePath("/game/account");
  if (username) revalidatePath(`/game/spelers/${username}`);
}

export async function updateBio(rawBio: string): Promise<ActionResult> {
  const auth = await requireAccountUser();
  if (auth.error || !auth.user) return auth.error ?? fail("Je bent niet ingelogd.");

  const bio = rawBio.trim();
  if (bio.length > BIO_MAX) {
    return fail(`Bio mag maximaal ${BIO_MAX} tekens zijn.`);
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { bio: bio.length > 0 ? bio : null },
  });
  revalidateAccount(auth.user.username);
  return ok(bio.length > 0 ? "Bio opgeslagen." : "Bio gewist.");
}

export async function uploadAvatar(file: File): Promise<ActionResult> {
  const auth = await requireAccountUser();
  if (auth.error || !auth.user) return auth.error ?? fail("Je bent niet ingelogd.");

  const parsed = await readAvatarFile(file);
  if (!parsed.ok) return fail(parsed.message);

  const avatarUrl = avatarPublicPath(auth.user.id, Date.now());
  await prisma.$transaction([
    prisma.userAvatar.upsert({
      where: { userId: auth.user.id },
      create: { userId: auth.user.id, mimeType: parsed.mimeType, bytes: parsed.bytes },
      update: { mimeType: parsed.mimeType, bytes: parsed.bytes },
    }),
    prisma.user.update({
      where: { id: auth.user.id },
      data: { avatarUrl },
    }),
  ]);

  revalidateAccount(auth.user.username);
  return ok("Profielfoto opgeslagen.", "success", { avatarUrl });
}

export async function removeAvatar(): Promise<ActionResult> {
  const auth = await requireAccountUser();
  if (auth.error || !auth.user) return auth.error ?? fail("Je bent niet ingelogd.");

  await prisma.$transaction([
    prisma.userAvatar.deleteMany({ where: { userId: auth.user.id } }),
    prisma.user.update({
      where: { id: auth.user.id },
      data: { avatarUrl: null },
    }),
  ]);

  revalidateAccount(auth.user.username);
  return ok("Profielfoto verwijderd.");
}

export async function changePassword(
  current: string,
  next: string,
  confirm: string,
): Promise<ActionResult> {
  const auth = await requireAccountUser();
  if (auth.error || !auth.user) return auth.error ?? fail("Je bent niet ingelogd.");

  if (!current || !next || !confirm) {
    return fail("Vul huidig wachtwoord, nieuw wachtwoord en bevestiging in.");
  }
  if (next.length < PASSWORD_MIN) {
    return fail(`Wachtwoord moet minstens ${PASSWORD_MIN} tekens zijn.`);
  }
  if (next !== confirm) {
    return fail("Nieuwe wachtwoorden komen niet overeen.");
  }
  if (current === next) {
    return fail("Het nieuwe wachtwoord mag niet hetzelfde zijn als het huidige.");
  }

  const valid = await compare(current, auth.user.hashedPassword);
  if (!valid) return fail("Huidig wachtwoord is onjuist.");

  const hashedPassword = await hash(next, 10);
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { hashedPassword },
  });
  await logEvent(auth.user.id, "SYSTEM", "Je hebt je wachtwoord gewijzigd.");
  revalidateAccount();
  return ok("Wachtwoord gewijzigd.");
}

export async function updateBioForm(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return updateBio(String(formData.get("bio") ?? ""));
}

export async function uploadAvatarForm(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const file = formData.get("avatar");
  if (!(file instanceof File)) return fail("Kies een afbeelding.");
  return uploadAvatar(file);
}

export async function changePasswordForm(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return changePassword(
    String(formData.get("current") ?? ""),
    String(formData.get("next") ?? ""),
    String(formData.get("confirm") ?? ""),
  );
}
