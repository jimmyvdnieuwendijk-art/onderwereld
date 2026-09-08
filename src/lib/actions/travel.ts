"use server";

import { prisma } from "@/lib/prisma";
import {
  CUSTOMS_ARREST_CHANCE,
  CUSTOMS_JAIL_MINUTES,
  CUSTOMS_WANTED_THRESHOLD,
  cityDisplayName,
  flightQuote,
  isAirportId,
  normalizeCityId,
  smugglePrice,
  type SmuggleGood,
} from "@/lib/airports";
import { blockedReason, tickPlayer } from "@/lib/game/player";
import { clamp, randomInt } from "@/lib/format";
import { bumpWanted, fail, logEvent, ok, requireUserId, revalidateGame } from "@/lib/actions/helpers";
import type { ActionResult } from "@/types/game";

export async function bookFlight(destinationId: string, privateJet = false): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");

  const grounded = blockedReason(player, { travel: false });
  if (grounded) return fail(grounded, "warning");
  if (player.isTraveling) return fail("Je zit al in een vliegtuig.", "warning");
  if (!isAirportId(destinationId)) return fail("Onbekend vliegveld.");

  const fromId = normalizeCityId(player.currentCity);
  if (destinationId === fromId) return fail("Je bent daar al.");

  const quote = flightQuote(fromId, destinationId, privateJet);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.cash < quote.cost) {
    return fail(
      privateJet
        ? `Privéjet kost ${quote.cost} euro. Je hebt te weinig cash.`
        : `Het ticket kost ${quote.cost} euro. Je hebt te weinig cash.`,
    );
  }

  const now = new Date();

  if (player.wantedLevel > CUSTOMS_WANTED_THRESHOLD && randomInt(1, 100) <= CUSTOMS_ARREST_CHANCE) {
    const until = new Date(now.getTime() + CUSTOMS_JAIL_MINUTES * 60_000);
    await prisma.user.update({
      where: { id: userId },
      data: {
        cash: { decrement: quote.cost },
        inJailUntil: until,
      },
    });
    await bumpWanted(userId, 18);
    const message = `Douane op ${quote.from.airport}: gezocht (${player.wantedLevel}). Ticket verspeeld, ${CUSTOMS_JAIL_MINUTES} minuten cel.`;
    await logEvent(userId, "JAIL", message);
    return fail(message, "warning");
  }

  const travelEndAt = new Date(now.getTime() + quote.seconds * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      cash: { decrement: quote.cost },
      travelDestinationId: destinationId,
      travelEndAt,
    },
  });

  const jetLabel = privateJet ? "Privéjet" : "Lijnvlucht";
  const message = `${jetLabel} geboekt naar ${quote.to.city} (${quote.to.airport}) voor ${quote.cost} euro. Onderweg ${quote.seconds} seconden.`;
  await logEvent(userId, "TRAVEL", message);
  return ok(message);
}

export async function bookFlightForm(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const dest = String(formData.get("destinationId") ?? "");
  const privateJet = String(formData.get("privateJet") ?? "") === "1";
  const result = await bookFlight(dest, privateJet);
  revalidateGame();
  return result;
}

export async function smuggleTrade(good: string, side: string, quantity: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");

  const kind = good as SmuggleGood;
  if (kind !== "drugs" && kind !== "weapons" && kind !== "bullets") {
    return fail("Onbekende waar.");
  }
  if (side !== "buy" && side !== "sell") return fail("Kies kopen of verkopen.");

  const qty = clamp(Math.floor(quantity), 1, 200);
  const cityId = normalizeCityId(player.currentCity);
  const unitPrice = smugglePrice(cityId, kind, side);
  const total = unitPrice * qty;
  const label = kind === "drugs" ? "drugs" : kind === "weapons" ? "wapenkisten" : "kogels";

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail("Speler niet gevonden.");

  if (side === "buy") {
    if (user.cash < total) return fail("Niet genoeg contant geld.");
    const data =
      kind === "drugs"
        ? { cash: { decrement: total }, drugs: { increment: qty } }
        : kind === "weapons"
          ? { cash: { decrement: total }, weaponCrates: { increment: qty } }
          : { cash: { decrement: total }, bullets: { increment: qty } };
    await prisma.user.update({ where: { id: userId }, data });
    const message = `Je koopt ${qty} ${label} in ${cityDisplayName(cityId)} voor ${total} euro.`;
    await logEvent(userId, "SMUGGLE", message);
    return ok(message);
  }

  const have = kind === "drugs" ? user.drugs : kind === "weapons" ? user.weaponCrates : user.bullets;
  if (have < qty) return fail("Je hebt die voorraad niet.");
  const data =
    kind === "drugs"
      ? { cash: { increment: total }, drugs: { decrement: qty } }
      : kind === "weapons"
        ? { cash: { increment: total }, weaponCrates: { decrement: qty } }
        : { cash: { increment: total }, bullets: { decrement: qty } };
  await prisma.user.update({ where: { id: userId }, data });
  const message = `Je zet ${qty} ${label} van de hand voor ${total} euro.`;
  await logEvent(userId, "SMUGGLE", message);
  return ok(message);
}

export async function smuggleTradeForm(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const result = await smuggleTrade(
    String(formData.get("good") ?? ""),
    String(formData.get("side") ?? ""),
    Number(formData.get("quantity") ?? 1),
  );
  revalidateGame();
  return result;
}

