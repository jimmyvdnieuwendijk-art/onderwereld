import { prisma } from "@/lib/prisma";
import { STARTER_CASH, USERNAME_MAX, USERNAME_MIN, USERNAME_PATTERN } from "@/lib/constants";
import { ensureLiveBootstrap } from "@/lib/ensure-catalog";

export { facebookCredentials, isFacebookConfigured } from "@/lib/auth/facebook-config";

export class FacebookAuthError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "no_id" | "email_taken",
  ) {
    super(message);
    this.name = "FacebookAuthError";
  }
}

export function usernameFromDisplayName(name: string) {
  const ascii = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_]+/g, "");
  if (ascii.length >= USERNAME_MIN) {
    return ascii.slice(0, USERNAME_MAX);
  }
  return "";
}

function facebookFallbackEmail(facebookId: string) {
  return `fb.${facebookId}@users.onderwereld.local`;
}

async function uniqueUsername(base: string) {
  const seed =
    base.length >= USERNAME_MIN && USERNAME_PATTERN.test(base)
      ? base.slice(0, USERNAME_MAX)
      : `speler${Math.floor(1000 + Math.random() * 9000)}`;
  let candidate = seed;
  for (let i = 0; i < 40; i += 1) {
    const taken = await prisma.user.findFirst({
      where: { username: { equals: candidate, mode: "insensitive" } },
      select: { id: true },
    });
    if (!taken) return candidate;
    const suffix = String(i + 2);
    const prefix = seed.slice(0, Math.max(USERNAME_MIN, USERNAME_MAX - suffix.length));
    candidate = `${prefix}${suffix}`.slice(0, USERNAME_MAX);
  }
  return `speler${Date.now().toString(36).slice(-8)}`.slice(0, USERNAME_MAX);
}

export async function upsertFacebookUser(input: {
  facebookId: string;
  email?: string | null;
  name?: string | null;
}) {
  const facebookId = String(input.facebookId ?? "").trim();
  if (!facebookId) {
    throw new FacebookAuthError("Facebook gaf geen account-id terug.", "no_id");
  }

  await ensureLiveBootstrap();

  const existingByFacebook = await prisma.user.findUnique({
    where: { facebookId },
    select: { id: true, username: true, email: true, usernameChosen: true },
  });
  if (existingByFacebook) {
    await prisma.user
      .update({
        where: { id: existingByFacebook.id },
        data: { lastLoginAt: new Date() },
      })
      .catch(() => undefined);
    return existingByFacebook;
  }

  const emailRaw = input.email?.trim().toLowerCase();
  const email =
    emailRaw && emailRaw.includes("@") ? emailRaw : facebookFallbackEmail(facebookId);

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, email: true, facebookId: true, usernameChosen: true },
  });
  if (existingByEmail) {
    if (existingByEmail.facebookId && existingByEmail.facebookId !== facebookId) {
      throw new FacebookAuthError(
        "Dit e-mailadres hoort al bij een ander account.",
        "email_taken",
      );
    }
    const linked = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: { facebookId, lastLoginAt: new Date() },
      select: { id: true, username: true, email: true, usernameChosen: true },
    });
    return linked;
  }

  const starterRank = await prisma.rank.findFirst({ orderBy: { order: "asc" } });
  if (!starterRank) {
    throw new Error("Het spel is nog niet klaar. Probeer het over een minuut opnieuw.");
  }

  const suggested = usernameFromDisplayName(input.name ?? "");
  const username = await uniqueUsername(suggested);

  try {
    const created = await prisma.user.create({
      data: {
        email,
        facebookId,
        hashedPassword: null,
        username,
        usernameChosen: false,
        currentCity: "ams",
        cash: STARTER_CASH,
        rankId: starterRank.id,
        lastLoginAt: new Date(),
      },
      select: { id: true, username: true, email: true, usernameChosen: true },
    });
    await prisma.gameLog.create({
      data: {
        userId: created.id,
        type: "SYSTEM",
        message: `Welkom in Amsterdam, ${created.username}. Je start als ${starterRank.name}.`,
      },
    });
    return created;
  } catch (error) {
    const raced = await prisma.user.findUnique({
      where: { facebookId },
      select: { id: true, username: true, email: true, usernameChosen: true },
    });
    if (raced) return raced;
    throw error;
  }
}
