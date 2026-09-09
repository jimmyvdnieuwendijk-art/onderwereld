"use server";

import { prisma } from "@/lib/prisma";
import { blockedReason, tickPlayer } from "@/lib/game/player";
import { randomInt } from "@/lib/format";
import {
  CASINO_COOLDOWN_MS,
  CASINO_MIN_BET,
  KNIFE_ANTE,
  PEEK_COOLDOWN_MS,
  PEEK_COST,
  POKER_RAKE,
  clampBet,
  compareHands,
  dealerDiscards,
  freshDeck,
  handNameNl,
  maxBetFor,
  parsePoker,
  pitBoard,
  rouletteColor,
  roulettePayout,
  spinEuropean,
  streetOutcome,
  type CasinoCard,
  type PokerTable,
} from "@/lib/casino";
import { bumpWanted, fail, logEvent, ok, requireUserId, revalidateGame } from "@/lib/actions/helpers";
import type { ActionResult } from "@/types/game";

type Gate =
  | { ok: true; userId: string; player: NonNullable<Awaited<ReturnType<typeof tickPlayer>>> }
  | { ok: false; error: ActionResult };

async function gate(): Promise<Gate> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: fail("Je bent niet ingelogd.") };
  const player = await tickPlayer(userId);
  if (!player) return { ok: false, error: fail("Speler niet gevonden.") };
  const blocked = blockedReason(player);
  if (blocked) return { ok: false, error: fail(blocked, "warning") };
  return { ok: true, userId, player };
}

function cooling(until: string | null) {
  return !!(until && new Date(until).getTime() > Date.now());
}

async function takeStake(userId: string, stake: number, extra: Record<string, unknown> = {}) {
  const until = new Date(Date.now() + CASINO_COOLDOWN_MS);
  await prisma.user.update({
    where: { id: userId },
    data: { cash: { decrement: stake }, casinoCooldownUntil: until, ...extra },
  });
}

async function payOut(userId: string, amount: number) {
  if (amount <= 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: { cash: { increment: amount } },
  });
}

export async function playRoulette(kind: string, pick: string, stakeRaw: number, cheat: boolean): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  if (cooling(g.player.casinoCooldownUntil)) return fail("De croupier schudt nee. Wacht de cooldown af.", "warning");
  if (g.player.casinoPoker) return fail("Eerst je pokerhand afmaken of folden.");
  const stake = clampBet(stakeRaw, g.player.cash);
  if (stake == null) {
    return fail(`Inzet ${CASINO_MIN_BET}–${maxBetFor(g.player.cash)} euro, cash op zak.`);
  }
  if (!["color", "dozen", "column", "straight"].includes(kind)) return fail("Onbekende inzet.");

  if (cheat) {
    if (randomInt(1, 100) <= 35) {
      await takeStake(g.userId, stake);
      await bumpWanted(g.userId, 12);
      const msg = "De camera's knipperen. Vals spel. Inzet weg, gezocht +12. (Stub — later meer.)";
      await logEvent(g.userId, "CASINO", msg);
      return fail(msg, "warning");
    }
  }

  let n = spinEuropean();
  let returned = roulettePayout(kind, pick, n, stake);
  if (cheat && returned === 0 && randomInt(1, 100) <= 8) {
    n = kind === "straight" ? Number(pick) : n === 0 ? 1 : n;
    returned = roulettePayout(kind, pick, n, stake);
    if (returned === 0 && kind === "color") {
      const want = pick === "rood" || pick === "zwart" ? pick : "rood";
      for (let i = 1; i <= 36 && returned === 0; i++) {
        if (rouletteColor(i) === want) {
          n = i;
          returned = stake * 2;
        }
      }
    }
  }

  await takeStake(g.userId, stake);
  await payOut(g.userId, returned);
  const net = returned - stake;
  const label = `${n} ${rouletteColor(n)}`;
  const message =
    net > 0
      ? `Roulette ${label}. Je wint ${returned - stake} euro. Het huis glimlacht nog steeds.`
      : `Roulette ${label}. Inzet weg. Nul en de randen zijn van het huis.`;
  await logEvent(g.userId, "CASINO", message);
  return net > 0 ? ok(message) : fail(message, "warning");
}

export async function playStreet(stakeRaw: number): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  if (cooling(g.player.casinoCooldownUntil)) return fail("Dobbel nog warm. Wacht even.", "warning");
  if (g.player.casinoPoker) return fail("Eerst je pokerhand afmaken of folden.");
  const stake = clampBet(stakeRaw, g.player.cash);
  if (stake == null) return fail(`Inzet ${CASINO_MIN_BET}–${maxBetFor(g.player.cash)} euro.`);

  const die1 = randomInt(1, 6);
  const die2 = randomInt(1, 6);
  const roll = die1 + die2;
  const out = streetOutcome(roll);
  const returned = Math.floor(stake * out.mult);
  await takeStake(g.userId, stake);
  await payOut(g.userId, returned);
  const net = returned - stake;
  const message = `De Straat ${die1}+${die2}=${roll} (${out.label}). ${
    net > 0 ? `+${net} euro.` : net === 0 ? "Push — inzet terug. Het huis wacht op 4 en 10." : `−${stake} euro.`
  }`;
  await logEvent(g.userId, "CASINO", message);
  return net >= 0 ? ok(message) : fail(message, "warning");
}

export async function playPit(kindRaw: string, pickKey: string, stakeRaw: number): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  if (cooling(g.player.casinoCooldownUntil)) return fail("De volgende heat start zo.", "warning");
  if (g.player.casinoPoker) return fail("Eerst je pokerhand afmaken of folden.");
  const stake = clampBet(stakeRaw, g.player.cash);
  if (stake == null) return fail(`Inzet ${CASINO_MIN_BET}–${maxBetFor(g.player.cash)} euro.`);
  const kind = kindRaw === "fight" ? "fight" : "race";
  const card = pitBoard(kind);
  const pick = card.find((row) => row.key === pickKey);
  if (!pick) return fail(kind === "fight" ? "Die vechter staat vanavond niet in de kooi." : "Die hond loopt vanavond niet.");

  const scored = card.map((row) => ({
    ...row,
    score: row.speed + randomInt(0, 12),
  }));
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0]!;
  await takeStake(g.userId, stake);
  let returned = 0;
  if (winner.key === pick.key) {
    returned = Math.floor(stake * pick.payoutMult);
    await payOut(g.userId, returned);
  }
  const net = returned - stake;
  const board = scored.map((row) => row.name).join(" → ");
  const label = kind === "fight" ? "Illegaal gevecht" : "Hondenkooi";
  const message =
    net > 0
      ? `${label}: ${winner.name} wint (${board}). Koers ${pick.decimal.toFixed(2)}. +${net} euro na 12% vig.`
      : `${label}: ${winner.name} wint (${board}). ${pick.name} blijft achter. −${stake} euro.`;
  await logEvent(g.userId, "CASINO", message);
  return net > 0 ? ok(message) : fail(message, "warning");
}

export async function dealPoker(anteRaw: number): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  if (g.player.casinoPoker) return fail("Je zit al aan tafel. Draw of fold.");
  if (cooling(g.player.casinoCooldownUntil)) return fail("Dealer schudt nog.", "warning");
  const ante = clampBet(anteRaw, g.player.cash - KNIFE_ANTE);
  if (ante == null) return fail(`Ante ${CASINO_MIN_BET}–${maxBetFor(Math.max(0, g.player.cash - KNIFE_ANTE))} plus ${KNIFE_ANTE} mes-ante.`);
  const total = ante + KNIFE_ANTE;
  if (g.player.cash < total) return fail(`Ante + mes-ante is ${total} euro.`);

  const deck = freshDeck();
  const table: PokerTable = {
    ante,
    knife: KNIFE_ANTE,
    player: deck.slice(0, 5),
    dealer: deck.slice(5, 10),
    peeked: false,
  };
  await takeStake(g.userId, total, { casinoPokerJson: JSON.stringify(table) });
  const message = `Five-card draw. Ante ${ante} + mes ${KNIFE_ANTE}. Jouw hand: ${table.player.map((c) => `${c.r}`).length} kaarten. Gooi max 3 weg.`;
  await logEvent(g.userId, "CASINO", `Poker deal. Ante ${ante} + mes ${KNIFE_ANTE}.`);
  return ok(message);
}

export async function peekPoker(): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user) return fail("Speler niet gevonden.");
  const table = parsePoker(user.casinoPokerJson);
  if (!table) return fail("Geen open hand.");
  if (table.peeked) return fail("Je hebt al gekeken.");
  if (user.casinoPeekUntil && user.casinoPeekUntil.getTime() > Date.now()) {
    return fail("Eén blik per nacht. De dealer onthoudt gezichten.");
  }
  if (user.cash < PEEK_COST) return fail(`Omkoping kost ${PEEK_COST} euro.`);

  table.peeked = true;
  await prisma.user.update({
    where: { id: g.userId },
    data: {
      cash: { decrement: PEEK_COST },
      casinoPeekUntil: new Date(Date.now() + PEEK_COOLDOWN_MS),
      casinoPokerJson: JSON.stringify(table),
    },
  });
  const message = "De dealer laat twee kaarten schuiven. Eén keer per nacht. Hij houdt de 80.";
  await logEvent(g.userId, "CASINO", message);
  return ok(message);
}

export async function foldPoker(): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user) return fail("Speler niet gevonden.");
  const table = parsePoker(user.casinoPokerJson);
  if (!table) return fail("Geen open hand.");
  await prisma.user.update({
    where: { id: g.userId },
    data: { casinoPokerJson: null, casinoCooldownUntil: new Date(Date.now() + CASINO_COOLDOWN_MS) },
  });
  const message = `Fold. Ante ${table.ante + table.knife} blijft in de pot. Het mes ook.`;
  await logEvent(g.userId, "CASINO", message);
  return fail(message, "warning");
}

export async function drawPoker(discard: number[]): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return g.error;
  const user = await prisma.user.findUnique({ where: { id: g.userId } });
  if (!user) return fail("Speler niet gevonden.");
  const table = parsePoker(user.casinoPokerJson);
  if (!table) return fail("Geen open hand.");

  const unique = [...new Set(discard.map((n) => Math.floor(n)).filter((n) => n >= 0 && n < 5))];
  if (unique.length > 3) return fail("Maximaal drie kaarten weg.");

  const used = new Set<string>([...table.player, ...table.dealer].map((c) => `${c.r}-${c.s}`));
  const deck = freshDeck().filter((c) => !used.has(`${c.r}-${c.s}`));
  let next = 0;
  const player: CasinoCard[] = table.player.map((c, i) => {
    if (!unique.includes(i)) return c;
    const drawn = deck[next++];
    return drawn ?? c;
  });
  const houseDrop = dealerDiscards(table.dealer);
  const dealer: CasinoCard[] = table.dealer.map((c, i) => {
    if (!houseDrop.includes(i)) return c;
    const drawn = deck[next++];
    return drawn ?? c;
  });

  const cmp = compareHands(player, dealer);
  const pot = (table.ante + table.knife) * 2;
  const rake = Math.floor(pot * POKER_RAKE);
  let returned = 0;
  let outcome = "split";
  if (cmp > 0) {
    returned = pot - rake;
    outcome = "win";
  } else if (cmp === 0) {
    returned = table.ante + table.knife;
    outcome = "push";
  } else {
    outcome = "lose";
  }

  await prisma.user.update({
    where: { id: g.userId },
    data: {
      cash: returned > 0 ? { increment: returned } : undefined,
      casinoPokerJson: null,
      casinoCooldownUntil: new Date(Date.now() + CASINO_COOLDOWN_MS),
    },
  });

  const you = `${player.map((c) => `${c.r}`).length && handNameNl(player)}`;
  const them = handNameNl(dealer);
  const net = returned - (table.ante + table.knife);
  const message =
    outcome === "win"
      ? `Showdown: ${you} slaat ${them}. Pot ${pot} minus 10% rake. +${net} euro.`
      : outcome === "push"
        ? `Showdown: ${you} tegen ${them}. Push. Ante terug.`
        : `Showdown: ${you} verliest van ${them}. Het huis houdt ante en mes.`;
  await logEvent(g.userId, "CASINO", message);
  return outcome === "lose" ? fail(message, "warning") : ok(message);
}

function formNum(form: FormData, key: string) {
  return Number(form.get(key) ?? 0);
}

export async function playRouletteForm(_prev: ActionResult | null, form: FormData) {
  const result = await playRoulette(
    String(form.get("kind") ?? ""),
    String(form.get("pick") ?? ""),
    formNum(form, "stake"),
    form.get("cheat") === "1",
  );
  revalidateGame();
  return result;
}

export async function playStreetForm(_prev: ActionResult | null, form: FormData) {
  const result = await playStreet(formNum(form, "stake"));
  revalidateGame();
  return result;
}

export async function playPitForm(_prev: ActionResult | null, form: FormData) {
  const pick = String(form.get("pick") ?? form.get("dog") ?? "");
  const result = await playPit(String(form.get("kind") ?? "race"), pick, formNum(form, "stake"));
  revalidateGame();
  return result;
}

export async function dealPokerForm(_prev: ActionResult | null, form: FormData) {
  const result = await dealPoker(formNum(form, "ante"));
  revalidateGame();
  return result;
}

export async function drawPokerForm(_prev: ActionResult | null, form: FormData) {
  const discard = form.getAll("d").map((value) => Number(value));
  const result = await drawPoker(discard);
  revalidateGame();
  return result;
}

export async function peekPokerForm(_prev: ActionResult | null, _form: FormData) {
  const result = await peekPoker();
  revalidateGame();
  return result;
}

export async function foldPokerForm(_prev: ActionResult | null, _form: FormData) {
  const result = await foldPoker();
  revalidateGame();
  return result;
}
