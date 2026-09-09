"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STARTER_CASH, USERNAME_MAX, USERNAME_MIN, USERNAME_PATTERN } from "@/lib/constants";
import { fail, ok } from "@/lib/actions/helpers";
import { ensureLiveBootstrap } from "@/lib/ensure-catalog";
import type { ActionResult } from "@/types/game";

function safeCallback(raw: string) {
  if (raw.startsWith("/game")) return raw;
  return "/game";
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await ensureLiveBootstrap();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return fail("Vul e-mail en wachtwoord in.");
  const callbackUrl = safeCallback(String(formData.get("callbackUrl") ?? "/game"));

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
    return ok("Welkom terug.");
  } catch (error) {
    if (error instanceof AuthError) {
      return fail("Ongeldige inloggegevens. Controleer e-mail en wachtwoord.");
    }
    throw error;
  }
}

export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const city = "ams";

  if (!email.includes("@")) return fail("Vul een geldig e-mailadres in.");
  if (password.length < 6) return fail("Wachtwoord moet minstens 6 tekens zijn.");
  if (password !== confirm) return fail("Wachtwoorden komen niet overeen.");
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return fail(`Gebruikersnaam moet ${USERNAME_MIN}-${USERNAME_MAX} tekens zijn.`);
  }
  if (!USERNAME_PATTERN.test(username)) {
    return fail("Alleen letters, cijfers en underscore zijn toegestaan.");
  }

  await ensureLiveBootstrap();

  const [emailTaken, nameTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findFirst({
      where: { username: { equals: username } },
    }),
  ]);
  if (emailTaken) return fail("Dit e-mailadres is al in gebruik.");
  if (nameTaken) return fail("Deze gebruikersnaam is al bezet.");

  const starterRank = await prisma.rank.findFirst({ orderBy: { order: "asc" } });
  if (!starterRank) {
    return fail("Het spel is nog niet klaar. Probeer het over een minuut opnieuw.");
  }

  const hashedPassword = await hash(password, 10);
  const created = await prisma.user.create({
    data: {
      email,
      hashedPassword,
      username,
      currentCity: city,
      cash: STARTER_CASH,
      rankId: starterRank.id,
    },
  });

  await prisma.gameLog.create({
    data: {
      userId: created.id,
      type: "SYSTEM",
      message: `Welkom in Amsterdam, ${username}. Je start als ${starterRank.name}.`,
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/game" });
    return ok("Account aangemaakt. Welkom in de onderwereld.");
  } catch (error) {
    if (error instanceof AuthError) {
      return fail("Account is aangemaakt, maar inloggen faalde. Probeer in te loggen.");
    }
    throw error;
  }
}
