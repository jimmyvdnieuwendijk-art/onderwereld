"use server";

import { prisma } from "@/lib/prisma";
import {
  CUSTOMS_ARREST_CHANCE,
  CUSTOMS_JAIL_MINUTES,
  CUSTOMS_WANTED_THRESHOLD,
  flightQuote,
  isAirportId,
  normalizeCityId,
} from "@/lib/airports";
import { blockedReason, tickPlayer } from "@/lib/game/player";
import { randomInt } from "@/lib/format";
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

