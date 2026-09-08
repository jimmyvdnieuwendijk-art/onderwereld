import { AIRPORTS, flightQuote, normalizeCityId, type AirportId } from "@/lib/airports";

/** Real milliseconds per in-game hour of red-light income. */
export const PIMP_HOUR_MS = 10 * 60 * 1000;
export const MAX_PIMP_HOURS_PER_TICK = 24;
export const WINDOWS_PER_CITY = 6;
export const MAIN_ESCORT_DEFENSE_BONUS = 0.1;
export const RECRUIT_COST = 250;
export const RECRUIT_PIMP_EXP = 8;
export const HIRE_PIMP_EXP = 2;
export const RAID_WANTED_BUMP = 10;
export const MIN_LIST_PRICE = 500;
export const WINDOW_HIRE_HOURS = 24;

export const ESCORT_AVATARS = [
  "/game/hoeren/escort-1.jpg",
  "/game/hoeren/escort-2.jpg",
  "/game/hoeren/escort-3.jpg",
  "/game/hoeren/escort-4.jpg",
  "/game/hoeren/escort-5.jpg",
  "/game/hoeren/escort-6.jpg",
] as const;

export const ESCORT_NAMES = [
  "Nova",
  "Lana",
  "Ruby",
  "Sienna",
  "Maya",
  "Zara",
  "Ivy",
  "Carmen",
  "Nina",
  "Vera",
  "Sofia",
  "Luna",
  "Eva",
  "Mila",
  "Jade",
  "Tara",
  "Kim",
  "Dana",
  "Ayla",
  "Rox",
] as const;

export type PimpRank = {
  slug: string;
  name: string;
  minExp: number;
  /** 0 = unlimited */
  maxWorkers: number;
};

export const PIMP_RANKS: PimpRank[] = [
  { slug: "street-hustler", name: "Street Hustler", minExp: 0, maxWorkers: 2 },
  { slug: "local-pimp", name: "Local Pimp", minExp: 150, maxWorkers: 5 },
  { slug: "shot-caller", name: "Shot Caller", minExp: 600, maxWorkers: 10 },
  { slug: "kingpin", name: "Kingpin", minExp: 2000, maxWorkers: 20 },
  { slug: "ghetto-mogul", name: "Ghetto Mogul", minExp: 6000, maxWorkers: 0 },
];

export type CityPimpStats = {
  payoutMult: number;
  raidBias: number;
};

const CITY_PIMP: Record<AirportId, CityPimpStats> = {
  ams: { payoutMult: 1.0, raidBias: 0 },
  lon: { payoutMult: 1.15, raidBias: 2 },
  rom: { payoutMult: 1.1, raidBias: 1 },
  nyc: { payoutMult: 1.45, raidBias: 4 },
  mia: { payoutMult: 1.7, raidBias: 3 },
  rio: { payoutMult: 1.25, raidBias: 2 },
  med: { payoutMult: 1.05, raidBias: 5 },
  tok: { payoutMult: 1.5, raidBias: 1 },
  dub: { payoutMult: 1.55, raidBias: 2 },
  syd: { payoutMult: 1.4, raidBias: 1 },
};

export function pimpRankFor(exp: number): PimpRank {
  const value = Math.max(0, exp);
  return [...PIMP_RANKS].reverse().find((rank) => value >= rank.minExp) ?? PIMP_RANKS[0];
}

export function nextPimpRank(exp: number): PimpRank | null {
  const current = pimpRankFor(exp);
  const idx = PIMP_RANKS.findIndex((rank) => rank.slug === current.slug);
  return PIMP_RANKS[idx + 1] ?? null;
}

export function workerCapReached(exp: number, workerCount: number) {
  const cap = pimpRankFor(exp).maxWorkers;
  if (cap === 0) return false;
  return workerCount >= cap;
}

export function cityPimpStats(cityId: string): CityPimpStats {
  return CITY_PIMP[normalizeCityId(cityId)];
}

export function windowDailyFee(cityId: string) {
  return Math.max(180, Math.round(220 * cityPimpStats(cityId).payoutMult));
}

export function hourlyPayout(charm: number, loyalty: number, health: number, cityId: string) {
  const { payoutMult } = cityPimpStats(cityId);
  const healthFactor = Math.max(0.12, Math.min(1, health / 100));
  const loyaltyFactor = 0.45 + (Math.max(0, Math.min(100, loyalty)) / 100) * 0.55;
  return Math.max(1, Math.floor((18 + charm * 0.72) * payoutMult * healthFactor * loyaltyFactor));
}

export function transferFee(fromCity: string, toCity: string) {
  const quote = flightQuote(fromCity, toCity, false);
  return Math.max(80, Math.floor(quote.cost * 0.5));
}

export function raidChancePercent(wantedLevel: number, cityId: string) {
  const bias = cityPimpStats(cityId).raidBias;
  return Math.min(48, Math.max(4, 6 + wantedLevel * 0.28 + bias));
}

export function windowStatus(args: {
  hired: boolean;
  occupied: boolean;
  wantedLevel: number;
  lastRaidAt: Date | string | null;
  now?: number;
}): "actief" | "leeg" | "razzia" {
  const now = args.now ?? Date.now();
  const recentRaid =
    !!args.lastRaidAt &&
    now - (typeof args.lastRaidAt === "string" ? new Date(args.lastRaidAt).getTime() : args.lastRaidAt.getTime()) <
      30 * 60 * 1000;
  if (args.wantedLevel >= 40 || recentRaid) return "razzia";
  if (args.hired && args.occupied) return "actief";
  return "leeg";
}

export const TRANSFER_CITIES = AIRPORTS.map((row) => ({ id: row.id, city: row.city }));

export const TRANSFER_PIMP_EXP = 6;
export const SALE_PIMP_EXP = 18;
export const LIST_PIMP_EXP = 4;
export const DRUG_RUN_PIMP_EXP = 12;

export const MISSION_DRUG_RUN = "DRUG_RUN";
export const MISSION_DARK_ROOM = "DARK_ROOM";

export const DRUG_RUN = {
  key: "pickup",
  name: "Op pad — drugs ophalen",
  blurb:
    "Zij rijdt een afgesproken pickup. Vrijwillig werk, geen ontvoering. Risico: controles, gezocht, gezondheid. Beloning: drugs en cash.",
  durationMs: 2.5 * 60 * 1000,
  image: "/game/hoeren/mission-drugs.jpg",
} as const;

export type DarkRoomSession = {
  key: string;
  name: string;
  blurb: string;
  durationMs: number;
  cashBase: number;
  loyaltyDelta: number;
  healthDelta: number;
  pimpExp: number;
  wantedChance: number;
  image: string;
};

/** Consensual club VIP rooms — never framed as assault or coercion. */
export const DARK_ROOMS: DarkRoomSession[] = [
  {
    key: "vip",
    name: "Privé VIP-nacht",
    blurb: "Afgesproken privénacht in de lounge. Champagne, muziek, afgesloten deur — iedereen is er vrijwillig.",
    durationMs: 90 * 1000,
    cashBase: 420,
    loyaltyDelta: 4,
    healthDelta: -4,
    pimpExp: 8,
    wantedChance: 4,
    image: "/game/hoeren/dark-vip.jpg",
  },
  {
    key: "fetish",
    name: "Fetish club special",
    blurb: "Een themaset in de club, met huisregels en een safeword. Podium, leer, neon — geen dwang.",
    durationMs: 2 * 60 * 1000,
    cashBase: 560,
    loyaltyDelta: 2,
    healthDelta: -8,
    pimpExp: 11,
    wantedChance: 6,
    image: "/game/hoeren/dark-fetish.jpg",
  },
  {
    key: "duo",
    name: "Duo / party room",
    blurb: "Twee gasten, één suite, een geboekte avond. Zij kiest of de boeking doorgaat.",
    durationMs: 2.5 * 60 * 1000,
    cashBase: 780,
    loyaltyDelta: 1,
    healthDelta: -10,
    pimpExp: 14,
    wantedChance: 8,
    image: "/game/hoeren/dark-duo.jpg",
  },
  {
    key: "casino",
    name: "High-roller afterparty",
    blurb: "Na de tafels: een penthouse-afterparty voor high rollers. Glamour, geen kelder.",
    durationMs: 3 * 60 * 1000,
    cashBase: 980,
    loyaltyDelta: 6,
    healthDelta: -6,
    pimpExp: 16,
    wantedChance: 10,
    image: "/game/hoeren/dark-casino.jpg",
  },
  {
    key: "suite",
    name: "Overnight suite",
    blurb: "Een nacht in een suite, ontbijt inbegrepen. Langste boeking, hoogste afdracht, zij mag nee zeggen.",
    durationMs: 4 * 60 * 1000,
    cashBase: 1320,
    loyaltyDelta: 8,
    healthDelta: -12,
    pimpExp: 20,
    wantedChance: 7,
    image: "/game/hoeren/dark-suite.jpg",
  },
];

export function darkRoomByKey(key: string) {
  return DARK_ROOMS.find((row) => row.key === key) ?? null;
}

export function npcBuyoutPrice(charm: number, loyalty: number, health: number, cityId: string) {
  const raw = 380 + charm * 14 + loyalty * 5 + health * 4;
  return Math.max(500, Math.round(raw * cityPimpStats(cityId).payoutMult));
}

export function isEscortBusy(escort: { busyUntil?: Date | string | null }, now = Date.now()) {
  if (!escort.busyUntil) return false;
  const ts = typeof escort.busyUntil === "string" ? new Date(escort.busyUntil).getTime() : escort.busyUntil.getTime();
  return ts > now;
}

/** Prisma filter: not listed and not on a live mission (race-safe with updateMany). */
export function escortIdleWhere(now = new Date()) {
  return {
    listedPrice: null,
    OR: [{ busyUntil: null }, { busyUntil: { lte: now } }],
  };
}

export function pimpRankProgress(exp: number) {
  const current = pimpRankFor(exp);
  const next = nextPimpRank(exp);
  if (!next) return { current, next: null, value: 100, label: "Maximale rang" };
  const span = Math.max(1, next.minExp - current.minExp);
  const value = Math.min(100, Math.round(((exp - current.minExp) / span) * 100));
  return { current, next, value, label: `${exp} / ${next.minExp} exp` };
}

export function durationLabelNl(ms: number) {
  const sec = Math.max(1, Math.round(ms / 1000));
  if (sec < 60) return `${sec} sec`;
  const min = sec / 60;
  if (Number.isInteger(min)) return `${min} min`;
  return `${String(min).replace(".", ",")} min`;
}

export function missionLabel(kind: string | null | undefined, key: string | null | undefined) {
  if (kind === MISSION_DRUG_RUN) return DRUG_RUN.name;
  if (kind === MISSION_DARK_ROOM) return darkRoomByKey(key ?? "")?.name ?? "Dark Room";
  if (kind === "VIP_JOB") {
    if (key === "highroller") return "High-roller penthouse";
    if (key === "politician") return "Corrupte wethouder";
    if (key === "livecam") return "Private cam-show";
    return "VIP-klus";
  }
  return "Bezet";
}
