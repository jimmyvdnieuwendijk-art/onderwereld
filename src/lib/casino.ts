export const CASINO_MIN_BET = 10;
export const CASINO_MAX_BET = 600;
export const CASINO_COOLDOWN_MS = 8_000;
export const PEEK_COST = 80;
export const PEEK_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const KNIFE_ANTE = 15;
export const POKER_RAKE = 0.1;
export const PIT_VIG = 0.12;

export const SUITS = ["♠", "♥", "♦", "♣"] as const;
export const RANK_LABEL = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "B", "V", "H", "A"] as const;

export const ROULETTE_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type CasinoCard = { r: number; s: number };

export type PokerTable = {
  ante: number;
  knife: number;
  player: CasinoCard[];
  dealer: CasinoCard[];
  peeked: boolean;
};

export type PitFighter = {
  key: string;
  name: string;
  blurb: string;
  speed: number;
};

export const PIT_CARD: PitFighter[] = [
  { key: "bliksem", name: "Bliksem", blurb: "Favoriet. Korte kop, lange pas.", speed: 86 },
  { key: "asfalt", name: "Asfalt", blurb: "Vuile starter, bijt in de eerste bocht.", speed: 74 },
  { key: "nagel", name: "Nagel", blurb: "Buitenbaan, komt laat.", speed: 68 },
  { key: "diesel", name: "Diesel", blurb: "Outsider. Als hij wint, ruikt de zaal naar bloedgeld.", speed: 52 },
];

export const FIGHT_CARD: PitFighter[] = [
  { key: "hamer", name: "De Hamer", blurb: "Korte stoot, veel tape, veel bloed.", speed: 84 },
  { key: "naald", name: "De Naald", blurb: "Snel, vies, mes in de wrapping.", speed: 76 },
  { key: "karkas", name: "Karkas", blurb: "Tank. Komt laat, blijft staan.", speed: 64 },
  { key: "as", name: "As", blurb: "Outsider uit de kelder. Lange odds.", speed: 50 },
];

export function maxBetFor(cash: number) {
  return Math.max(CASINO_MIN_BET, Math.min(CASINO_MAX_BET, cash));
}

export function clampBet(raw: number, cash: number) {
  const value = Math.floor(raw);
  if (!Number.isFinite(value)) return null;
  if (value < CASINO_MIN_BET) return null;
  if (value > maxBetFor(cash)) return null;
  if (value > cash) return null;
  return value;
}

export function cardLabel(card: CasinoCard) {
  return `${RANK_LABEL[card.r] ?? "?"}${SUITS[card.s] ?? "?"}`;
}

export function parsePoker(json: string | null | undefined): PokerTable | null {
  if (!json) return null;
  try {
    const data = JSON.parse(json) as PokerTable;
    if (!Array.isArray(data.player) || data.player.length !== 5) return null;
    if (!Array.isArray(data.dealer) || data.dealer.length !== 5) return null;
    return data;
  } catch {
    return null;
  }
}

export function freshDeck(): CasinoCard[] {
  const deck: CasinoCard[] = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 2; r <= 14; r++) deck.push({ r, s });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j]!;
    deck[j] = tmp!;
  }
  return deck;
}

export function rouletteColor(n: number): "rood" | "zwart" | "groen" {
  if (n === 0) return "groen";
  return ROULETTE_RED.has(n) ? "rood" : "zwart";
}

export function spinEuropean() {
  return Math.floor(Math.random() * 37);
}

export function roulettePayout(kind: string, pick: string, n: number, stake: number): number {
  if (kind === "color") {
    if (n === 0) return 0;
    return rouletteColor(n) === pick ? stake * 2 : 0;
  }
  if (kind === "dozen") {
    const dozen = Number(pick);
    if (n === 0) return 0;
    const slot = n <= 12 ? 1 : n <= 24 ? 2 : 3;
    return slot === dozen ? stake * 3 : 0;
  }
  if (kind === "column") {
    const col = Number(pick);
    if (n === 0) return 0;
    const slot = n % 3 === 1 ? 1 : n % 3 === 2 ? 2 : 3;
    return slot === col ? stake * 3 : 0;
  }
  if (kind === "straight") {
    return n === Number(pick) ? stake * 36 : 0;
  }
  return 0;
}

/** 5=straight flush … 0=high card. Higher tuple wins. */
export function handScore(cards: CasinoCard[]): number[] {
  const ranks = [...cards].map((c) => c.r).sort((a, b) => b - a);
  const suits = cards.map((c) => c.s);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = suits.every((s) => s === suits[0]);
  const unique = [...new Set(ranks)].sort((a, b) => a - b);
  let straightHigh = 0;
  if (unique.length === 5 && unique[4]! - unique[0]! === 4) straightHigh = unique[4]!;
  if (unique.join(",") === "2,3,4,5,14") straightHigh = 5;
  const straight = straightHigh > 0;

  if (straight && flush) return [8, straightHigh];
  if (groups[0]![1] === 4) return [7, groups[0]![0], groups[1]![0]];
  if (groups[0]![1] === 3 && groups[1]![1] === 2) return [6, groups[0]![0], groups[1]![0]];
  if (flush) return [5, ...ranks];
  if (straight) return [4, straightHigh];
  if (groups[0]![1] === 3) return [3, groups[0]![0], ...groups.slice(1).map((g) => g[0])];
  if (groups[0]![1] === 2 && groups[1]![1] === 2) {
    const pairA = Math.max(groups[0]![0], groups[1]![0]);
    const pairB = Math.min(groups[0]![0], groups[1]![0]);
    return [2, pairA, pairB, groups[2]![0]];
  }
  if (groups[0]![1] === 2) return [1, groups[0]![0], ...groups.slice(1).map((g) => g[0])];
  return [0, ...ranks];
}

export function compareHands(a: CasinoCard[], b: CasinoCard[]) {
  const sa = handScore(a);
  const sb = handScore(b);
  const n = Math.max(sa.length, sb.length);
  for (let i = 0; i < n; i++) {
    const da = sa[i] ?? 0;
    const db = sb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

export function handNameNl(cards: CasinoCard[]) {
  const tier = handScore(cards)[0] ?? 0;
  return ["Hoogste kaart", "Pair", "Two pair", "Three of a kind", "Straat", "Flush", "Full house", "Four of a kind", "Straight flush"][tier] ?? "Hand";
}

export function dealerDiscards(hand: CasinoCard[]): number[] {
  const score = handScore(hand)[0] ?? 0;
  if (score >= 3) return [];
  const counts = new Map<number, number>();
  for (const c of hand) counts.set(c.r, (counts.get(c.r) ?? 0) + 1);
  const keepPair = [...counts.entries()].filter(([, n]) => n >= 2).map(([r]) => r);
  const suitCounts = [0, 0, 0, 0];
  for (const c of hand) suitCounts[c.s] += 1;
  const flushSuit = suitCounts.findIndex((n) => n >= 4);
  const ranked = hand
    .map((c, i) => ({ i, c }))
    .sort((a, b) => a.c.r - b.c.r);
  const drop: number[] = [];
  for (const row of ranked) {
    if (drop.length >= 3) break;
    if (keepPair.includes(row.c.r)) continue;
    if (flushSuit >= 0 && row.c.s === flushSuit) continue;
    drop.push(row.i);
  }
  return drop;
}

function vigBoard(card: PitFighter[]) {
  const total = card.reduce((sum, row) => sum + row.speed, 0);
  return card.map((row) => {
    const fair = row.speed / total;
    const implied = fair * (1 - PIT_VIG);
    const decimal = Math.max(1.35, Math.round((1 / implied) * 100) / 100);
    return { ...row, fair, decimal, payoutMult: decimal };
  });
}

export function pitOdds() {
  return vigBoard(PIT_CARD);
}

export function fightOdds() {
  return vigBoard(FIGHT_CARD);
}

export function pitBoard(kind: "race" | "fight") {
  return kind === "fight" ? fightOdds() : pitOdds();
}

export type PublicPoker = {
  ante: number;
  knife: number;
  cards: string[];
  peeked: boolean;
  dealerPeek: string[];
};

export function publicPoker(table: PokerTable | null): PublicPoker | null {
  if (!table) return null;
  const rankedDealer = [...table.dealer].sort((a, b) => b.r - a.r);
  return {
    ante: table.ante,
    knife: table.knife,
    cards: table.player.map(cardLabel),
    peeked: table.peeked,
    dealerPeek: table.peeked ? rankedDealer.slice(0, 2).map(cardLabel) : [],
  };
}

export function streetOutcome(roll: number): { result: "win" | "lose" | "push"; mult: number; label: string } {
  if (roll === 7 || roll === 11) return { result: "win", mult: 2, label: "Pass" };
  if (roll === 2 || roll === 3 || roll === 12 || roll === 4 || roll === 10) {
    return { result: "lose", mult: 0, label: roll === 4 || roll === 10 ? "Straat-bust" : "Craps" };
  }
  return { result: "push", mult: 1, label: "Push" };
}
