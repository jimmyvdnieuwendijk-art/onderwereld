import { cityDisplayName, normalizeCityId } from "@/lib/airports";
import { pimpRankFor, cityPimpStats } from "@/lib/pimp";
import { randomInt } from "@/lib/format";

export const VENUE_HIGH_CLASS = "HIGH_CLASS";
export const VENUE_STRIPCLUB = "STRIPCLUB";
export const VENUE_LIVE_CAM = "LIVE_CAM";
export const VENUE_BDSM = "BDSM";

export const MISSION_VIP_JOB = "VIP_JOB";

export const STREET_ZONES_PER_CITY = 3;
export const STREET_CLAIM_HOURS = 4;
export const STREET_CLAIM_PIMP_EXP = 14;
export const OUTBREAK_MS = 8 * 60 * 1000;
export const OUTBREAK_CLINIC_FEE = 400;
export const BLACKMAIL_WANTED_DROP = 18;
export const STREET_PROTECT_MS = 30 * 60 * 1000;
export const STRIP_RECRUIT_COST = 420;
export const STREET_RECRUIT_COST = 160;

export type VenueKind = typeof VENUE_HIGH_CLASS | typeof VENUE_STRIPCLUB | typeof VENUE_LIVE_CAM | typeof VENUE_BDSM;

export const VENUES: {
  key: VenueKind;
  name: string;
  blurb: string;
  payoutMult: number;
  image: string;
}[] = [
  {
    key: VENUE_HIGH_CLASS,
    name: "High-class escorts",
    blurb: "Penthouses, champagne, afgesproken nachten. Zij kiest de boeking. Geen dwang.",
    payoutMult: 1,
    image: "/game/hoeren/venue-high.jpg",
  },
  {
    key: VENUE_STRIPCLUB,
    name: "Underground stripclub",
    blurb: "Podium, polaroid-licht, privé-dans. Cash in de string, huisregels aan de deur.",
    payoutMult: 1.14,
    image: "/game/hoeren/venue-strip.jpg",
  },
  {
    key: VENUE_LIVE_CAM,
    name: "Hardcore live cams",
    blurb: "Studio, ringlight, tokens. Publiek betaalt om te kijken — zij bepaalt wat ze laat zien.",
    payoutMult: 1.24,
    image: "/game/hoeren/venue-cam.jpg",
  },
  {
    key: VENUE_BDSM,
    name: "BDSM-club",
    blurb: "Leer, neon, safeword. Consensuele clubavond, geen kelder, geen marteling.",
    payoutMult: 1.18,
    image: "/game/hoeren/venue-bdsm.jpg",
  },
];

export function venueByKey(key: string | null | undefined) {
  return VENUES.find((row) => row.key === key) ?? VENUES[0];
}

export function venuePayoutMult(kind: string | null | undefined) {
  return venueByKey(kind).payoutMult;
}

export const RIVAL_PIMPS = [
  { key: "roos", name: "De Roos", blurb: "Oude stalling, oude tanden." },
  { key: "vito", name: "Uncle Vito", blurb: "Haven, sigaren, achterkamer." },
  { key: "madamek", name: "Madame K", blurb: "Cam-lofts en wethouders." },
] as const;

export function rivalByKey(key: string | null | undefined) {
  return RIVAL_PIMPS.find((row) => row.key === key) ?? RIVAL_PIMPS[0];
}

export const STREET_ZONE_NAMES = ["Achterom", "Het Plein", "Havenrand"] as const;

export function streetZoneName(slotIndex: number) {
  return STREET_ZONE_NAMES[slotIndex] ?? `Hoek ${slotIndex + 1}`;
}

export function streetClaimCost(cityId: string) {
  return Math.max(180, Math.round(220 * cityPimpStats(cityId).payoutMult));
}

export function streetHourlyIncome(cityId: string) {
  return Math.max(12, Math.round(28 * cityPimpStats(cityId).payoutMult));
}

export type VipJob = {
  key: string;
  name: string;
  blurb: string;
  durationMs: number;
  cashBase: number;
  pimpExp: number;
  wantedChance: number;
  blackmailChance: number;
  outbreakChance: number;
  image: string;
};

export const VIP_JOBS: VipJob[] = [
  {
    key: "highroller",
    name: "High-roller penthouse",
    blurb: "Een gast met te veel chips en te weinig schaamte. Afdracht + pimp-exp. Zij mag de boeking afzeggen.",
    durationMs: 2 * 60 * 1000,
    cashBase: 640,
    pimpExp: 12,
    wantedChance: 8,
    blackmailChance: 12,
    outbreakChance: 6,
    image: "/game/hoeren/dark-casino.jpg",
  },
  {
    key: "politician",
    name: "Corrupte wethouder",
    blurb: "Hij boekt. Hij komt. Hij filmt zichzelf. Jij houdt de USB. Kompromat op hém — niet op haar.",
    durationMs: 3 * 60 * 1000,
    cashBase: 520,
    pimpExp: 16,
    wantedChance: 14,
    blackmailChance: 62,
    outbreakChance: 4,
    image: "/game/hoeren/empire-kompromat.jpg",
  },
  {
    key: "livecam",
    name: "Private cam-show",
    blurb: "Tokens tikken binnen. Hard, expliciet, vrijwillig. Zeden kan meelezen.",
    durationMs: 90 * 1000,
    cashBase: 380,
    pimpExp: 9,
    wantedChance: 10,
    blackmailChance: 0,
    outbreakChance: 14,
    image: "/game/hoeren/venue-cam.jpg",
  },
];

export function vipJobByKey(key: string) {
  return VIP_JOBS.find((row) => row.key === key) ?? null;
}

/** Five signature toasts — adult crime tone, never rape or slavery. */
export const EMPIRE_TOASTS = {
  streetOk:
    "Ze likt haar tanden, stopt het briefje in haar string en zegt: ik werk, jij rijd. Regen op de stoep — geen tranen.",
  streetFail:
    "Ze filmt je bek, spuugt naast je schoen en deelt de clip. Gezocht omhoog. Je ruikt naar nederlaag en goedkope aftershave.",
  stripOk:
    "Podiumlicht op haar huid, cash in de band van haar slip. De DJ knikt. Jouw hoek, jouw afdracht, haar regels.",
  politicianOk:
    "De wethouder komt klaar in de suite. USB in je binnenzak: zijn gezicht, haar mond, zijn stem die smeekt om stilte. Kompromat. Hij gaat betalen.",
  raid:
    "Zedenpolitie trapt de neon kapot. Condomen op straat, camera's aan. Jouw hoek is even van de staat. Gezocht + celgeur.",
} as const;

export function pickEmpireToast(key: keyof typeof EMPIRE_TOASTS) {
  return EMPIRE_TOASTS[key];
}

export function rivalContestChance(pimpExp: number) {
  const rank = pimpRankFor(pimpExp);
  const bonus = PIMP_RANK_CONTEST[rank.slug] ?? 8;
  return Math.min(78, 48 + bonus);
}

const PIMP_RANK_CONTEST: Record<string, number> = {
  "street-hustler": 0,
  "local-pimp": 8,
  "shot-caller": 14,
  kingpin: 22,
  "ghetto-mogul": 30,
};

export function claimFlavor(cityId: string, slot: number, rivalName: string) {
  return `Je zet ${streetZoneName(slot)} in ${cityDisplayName(normalizeCityId(cityId))} op slot. ${rivalName} ruikt sperma en nederlaag — de zijne.`;
}

export function randomRivalKey() {
  return RIVAL_PIMPS[randomInt(0, RIVAL_PIMPS.length - 1)].key;
}
