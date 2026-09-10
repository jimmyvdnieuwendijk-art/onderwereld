"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BIO_MAX, DISPLAY_NAME_MAX, DISPLAY_NAME_MIN, PASSWORD_MIN } from "@/lib/constants";
import { avatarPublicPath, readAvatarFile } from "@/lib/avatar";
import { newTotpSecret, totpQrDataUrl, verifyTotp } from "@/lib/totp";
import { fail, logEvent, ok, requireUserId, revalidateGame } from "@/lib/actions/helpers";
import type { ActionResult } from "@/types/game";

async function requireAccountUser() {
  const userId = await requireUserId();
  if (!userId) return { user: null, error: fail("Je bent niet ingelogd.") };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      hashedPassword: true,
      totpEnabled: true,
      totpSecret: true,
      totpPending: true,
    },
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

export async function updateAppearance(
  rawDisplayName: string,
  bioHidden: boolean,
  hideOnline: boolean,
): Promise<ActionResult> {
  const auth = await requireAccountUser();
  if (auth.error || !auth.user) return auth.error ?? fail("Je bent niet ingelogd.");

  const displayName = rawDisplayName.trim().replace(/\s+/g, " ");
  if (displayName.length > 0 && displayName.length < DISPLAY_NAME_MIN) {
    return fail(`Weergavenaam moet minstens ${DISPLAY_NAME_MIN} tekens zijn.`);
  }
  if (displayName.length > DISPLAY_NAME_MAX) {
    return fail(`Weergavenaam mag maximaal ${DISPLAY_NAME_MAX} tekens zijn.`);
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      displayName: displayName.length > 0 ? displayName : null,
      bioHidden,
      hideOnline,
    },
  });
  revalidateAccount(auth.user.username);
  return ok("Weergave opgeslagen.");
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

export async function beginTotpSetup(): Promise<ActionResult> {
  const auth = await requireAccountUser();
  if (auth.error || !auth.user) return auth.error ?? fail("Je bent niet ingelogd.");
  if (auth.user.totpEnabled) return fail("Authenticator staat al aan.");

  const secret = newTotpSecret();
  const label = auth.user.username || auth.user.email;
  const qrDataUrl = await totpQrDataUrl(secret, label);
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { totpPending: secret },
  });
  revalidateAccount();
  return ok("Scan de QR-code en bevestig met een code.", "success", {
    qrDataUrl,
    secret,
  });
}

export async function confirmTotp(code: string): Promise<ActionResult> {
  const auth = await requireAccountUser();
  if (auth.error || !auth.user) return auth.error ?? fail("Je bent niet ingelogd.");
  const pending = auth.user.totpPending;
  if (!pending) return fail("Start eerst de authenticator-setup.");
  if (!verifyTotp(pending, code)) return fail("Ongeldige authenticatorcode.");

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { totpEnabled: true, totpSecret: pending, totpPending: null },
  });
  await logEvent(auth.user.id, "SYSTEM", "Je hebt twee-stapsverificatie ingeschakeld.");
  revalidateAccount();
  return ok("Authenticator is ingeschakeld.");
}

export async function disableTotp(password: string, code: string): Promise<ActionResult> {
  const auth = await requireAccountUser();
  if (auth.error || !auth.user) return auth.error ?? fail("Je bent niet ingelogd.");
  if (!auth.user.totpEnabled || !auth.user.totpSecret) {
    return fail("Authenticator staat niet aan.");
  }
  const validPass = await compare(password, auth.user.hashedPassword);
  if (!validPass) return fail("Wachtwoord is onjuist.");
  if (!verifyTotp(auth.user.totpSecret, code)) return fail("Ongeldige authenticatorcode.");

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { totpEnabled: false, totpSecret: null, totpPending: null },
  });
  await logEvent(auth.user.id, "SYSTEM", "Je hebt twee-stapsverificatie uitgeschakeld.");
  revalidateAccount();
  return ok("Authenticator is uitgeschakeld.");
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
