import { prisma } from "@/lib/prisma";
import {
  FAMILY_HOUR_MS,
  FAMILY_MEMBER_LIMIT_MAX,
  FAMILY_MEMBER_LIMIT_START,
  FAMILY_MEMBER_LIMIT_STEPS,
  ONLINE_WINDOW_MS,
  ROLE_ASSOCIATE,
  ROLE_CAPO,
  ROLE_CONSIGLIERE,
  ROLE_DON,
  ROLE_LIEUTENANT,
  ROLE_SOLDIER,
  ROLE_UNDERBOSS,
} from "@/lib/constants";

export type FamilyRole =
  | typeof ROLE_DON
  | typeof ROLE_UNDERBOSS
  | typeof ROLE_CONSIGLIERE
  | typeof ROLE_CAPO
  | typeof ROLE_LIEUTENANT
  | typeof ROLE_SOLDIER
  | typeof ROLE_ASSOCIATE;
export type FamilyAsset = "CASH" | "LEGAL" | "BULLETS";
export type FamilyTab =
  | "overzicht"
  | "leden"
  | "bank"
  | "vastgoed"
  | "benefits"
  | "misdaden"
  | "beheer";
export type FamilyHeistTier = "klein" | "middel" | "groot";

export const FAMILY_ROLE_LADDER: FamilyRole[] = [
  ROLE_ASSOCIATE,
  ROLE_SOLDIER,
  ROLE_LIEUTENANT,
  ROLE_CAPO,
  ROLE_CONSIGLIERE,
  ROLE_UNDERBOSS,
  ROLE_DON,
];

export function normalizeFamilyRole(role: string): FamilyRole {
  if (role === "LEADER" || role === ROLE_DON) return ROLE_DON;
  if (role === "OFFICER" || role === ROLE_UNDERBOSS) return ROLE_UNDERBOSS;
  if (role === ROLE_CONSIGLIERE) return ROLE_CONSIGLIERE;
  if (role === ROLE_CAPO) return ROLE_CAPO;
  if (role === ROLE_LIEUTENANT) return ROLE_LIEUTENANT;
  if (role === ROLE_ASSOCIATE) return ROLE_ASSOCIATE;
  if (role === "MEMBER" || role === ROLE_SOLDIER) return ROLE_SOLDIER;
  return ROLE_ASSOCIATE;
}

export function familyRoleRank(role: string) {
  const idx = FAMILY_ROLE_LADDER.indexOf(normalizeFamilyRole(role));
  return idx + 1;
}

export function familyRoleLabel(role: string) {
  switch (normalizeFamilyRole(role)) {
    case ROLE_DON:
      return "Don";
    case ROLE_UNDERBOSS:
      return "Underboss";
    case ROLE_CONSIGLIERE:
      return "Consigliere";
    case ROLE_CAPO:
      return "Caporegime";
    case ROLE_LIEUTENANT:
      return "Luitenant";
    case ROLE_SOLDIER:
      return "Soldier";
    default:
      return "Associate";
  }
}

export const FAMILY_ROLE_RIGHTS: Record<FamilyRole, string[]> = {
  [ROLE_DON]: ["Alles", "Ontbinden", "Promote tot Underboss", "Uitbetalen"],
  [ROLE_UNDERBOSS]: ["Uitnodigen", "Kick onder zich", "Uitbetalen", "Upgrades", "Beheer"],
  [ROLE_CONSIGLIERE]: ["Uitnodigen", "Kick tot Luitenant", "Beheer", "Foto & layout"],
  [ROLE_CAPO]: ["Uitnodigen", "Kick Soldiers", "Heists openen", "Vastgoed kopen"],
  [ROLE_LIEUTENANT]: ["Uitnodigen", "Kick Associates", "Heist-plek claimen"],
  [ROLE_SOLDIER]: ["Doneren", "Heist-plek claimen"],
  [ROLE_ASSOCIATE]: ["Doneren", "Heist-plek claimen"],
};

/** Consigliere and up: beheer, foto, layout, mededelingen. */
export function canManageFamily(role: string) {
  return familyRoleRank(role) >= 5;
}

/** Underboss and Don: promote/demote, payouts, upgrades. */
export function canPromoteFamily(role: string) {
  return familyRoleRank(role) >= 6;
}

export function canInviteKick(role: string) {
  return familyRoleRank(role) >= 3;
}

export function canLeadJobs(role: string) {
  return familyRoleRank(role) >= 4;
}

export function isJunkFamilyAnnouncement(text: string) {
  return /testboard|verificatie\s*ok|test[- ]?banner|test[- ]?verificatie/i.test(text);
}

export function familyLevel(exp: number) {
  if (exp >= 8000) return 5;
  if (exp >= 3500) return 4;
  if (exp >= 1400) return 3;
  if (exp >= 400) return 2;
  return 1;
}

export function familyExpToNext(exp: number) {
  const caps = [400, 1400, 3500, 8000];
  const next = caps.find((n) => exp < n);
  return next ?? null;
}

export type FamilyBuildingDef = {
  slug: string;
  name: string;
  blurb: string;
  cost: number;
  cashPerHour: number;
  bulletsPerHour: number;
  defense: number;
};

export const FAMILY_BUILDINGS: FamilyBuildingDef[] = [
  {
    slug: "nachtclub",
    name: "Nachtclub",
    blurb: "Zwart geld over de toonbank. Rustig, tot de fiscus belt.",
    cost: 16_000,
    cashPerHour: 420,
    bulletsPerHour: 0,
    defense: 2,
  },
  {
    slug: "wapenopslag",
    name: "Wapenopslag",
    blurb: "Kratten, olie en een man die nooit vraagt waarom.",
    cost: 18_000,
    cashPerHour: 90,
    bulletsPerHour: 5,
    defense: 8,
  },
  {
    slug: "casino",
    name: "Illegaal casino",
    blurb: "Tapes, dobbelstenen, en een kluis achter de bar.",
    cost: 28_000,
    cashPerHour: 760,
    bulletsPerHour: 0,
    defense: 3,
  },
  {
    slug: "smokkelhaven",
    name: "Smokkelhaven",
    blurb: "Een steiger zonder naam. Containers die ‘leeg’ zijn.",
    cost: 22_000,
    cashPerHour: 380,
    bulletsPerHour: 3,
    defense: 5,
  },
  {
    slug: "dokterspost",
    name: "Dokterspost",
    blurb: "Geen vragen, wel hechtingen. Familie eerst.",
    cost: 15_000,
    cashPerHour: 140,
    bulletsPerHour: 0,
    defense: 1,
  },
  {
    slug: "bunker",
    name: "Bunker",
    blurb: "Beton, camera’s, en een deur die niet bestaat.",
    cost: 34_000,
    cashPerHour: 220,
    bulletsPerHour: 2,
    defense: 14,
  },
];

export function familyBuildingDef(slug: string) {
  return FAMILY_BUILDINGS.find((row) => row.slug === slug) ?? null;
}

export type FamilyUpgradeDef = {
  key: "slots" | "launder" | "doctor" | "defense";
  name: string;
  blurb: string;
  max: number;
  costFor: (level: number) => number;
  effect: (level: number) => string;
};

export const FAMILY_UPGRADES: FamilyUpgradeDef[] = [
  {
    key: "slots",
    name: "Ledenaantal",
    blurb: "Meer stoelen aan tafel. Meer handen op straat.",
    max: FAMILY_MEMBER_LIMIT_MAX,
    costFor: (level) => 12_000 + level * 8_000,
    effect: (level) => `${level} leden max`,
  },
  {
    key: "launder",
    name: "Witwas / misdaadbonus",
    blurb: "Een deel van de buit wordt schoon, de rest gaat soepeler.",
    max: 3,
    costFor: (level) => 14_000 + level * 10_000,
    effect: (level) => `+${level * 6}% misdaadcash · ${level * 10}% witwas naar bank`,
  },
  {
    key: "doctor",
    name: "Familiedokter",
    blurb: "Korter in het ziekenhuis. De naald is van ons.",
    max: 3,
    costFor: (level) => 11_000 + level * 9_000,
    effect: (level) => `−${level * 18}% ziekenhuistijd`,
  },
  {
    key: "defense",
    name: "Straatverdediging",
    blurb: "Leden houden beter stand bij een aanslag.",
    max: 3,
    costFor: (level) => 13_000 + level * 11_000,
    effect: (level) => `+${level * 8}% verdediging in gevecht`,
  },
];

export type FamilyHeistDef = {
  slug: string;
  name: string;
  blurb: string;
  tier: FamilyHeistTier;
  minLevel: number;
  energy: number;
  seats: { key: string; label: string }[];
  cashMin: number;
  cashMax: number;
  bullets: number;
  familyExp: number;
  chance: number;
  jailChance: number;
  jailMinutes: number;
  hospitalMinutes: number;
};

export const HEIST_TIER_META: {
  id: FamilyHeistTier;
  label: string;
  crew: string;
  blurb: string;
}[] = [
  { id: "klein", label: "Klein", crew: "1–2 spelers", blurb: "Snel, vies, weinig ogen. Lage buit, lage celkans." },
  { id: "middel", label: "Middel", crew: "2–4 spelers", blurb: "Een plan, een wagen, iemand op de hoek. Meer cash, meer hitte." },
  { id: "groot", label: "Groot", crew: "4–10 spelers", blurb: "Een avond die de familie maakt of breekt. Grote kluis, zware cel." },
];

export const FAMILY_HEISTS: FamilyHeistDef[] = [
  {
    slug: "tasjesroof",
    name: "Tasjesroof",
    blurb: "Eén man, één tas, één hoek. Wegwezen voor de camera knippert.",
    tier: "klein",
    minLevel: 1,
    energy: 8,
    seats: [{ key: "solo", label: "Uitvoerder" }],
    cashMin: 900,
    cashMax: 2_100,
    bullets: 0,
    familyExp: 18,
    chance: 80,
    jailChance: 28,
    jailMinutes: 6,
    hospitalMinutes: 0,
  },
  {
    slug: "brommer-run",
    name: "Brommer-run",
    blurb: "Een bezorgtas die niet van jou is. Solo, helm op, gas erop.",
    tier: "klein",
    minLevel: 1,
    energy: 10,
    seats: [{ key: "koerier", label: "Koerier" }],
    cashMin: 1_200,
    cashMax: 2_800,
    bullets: 0,
    familyExp: 22,
    chance: 76,
    jailChance: 32,
    jailMinutes: 8,
    hospitalMinutes: 0,
  },
  {
    slug: "pinautomaat",
    name: "Pinautomaat-run",
    blurb: "Twee man, één skimmer, vijf minuten.",
    tier: "klein",
    minLevel: 1,
    energy: 12,
    seats: [
      { key: "chauffeur", label: "Chauffeur" },
      { key: "hacker", label: "Hacker" },
    ],
    cashMin: 2_400,
    cashMax: 5_200,
    bullets: 0,
    familyExp: 40,
    chance: 72,
    jailChance: 36,
    jailMinutes: 10,
    hospitalMinutes: 0,
  },
  {
    slug: "nachtkluis",
    name: "Nachtkluis tankstation",
    blurb: "Twee paar handen, een boor, en een kluis die ‘leeg’ zou zijn.",
    tier: "klein",
    minLevel: 1,
    energy: 14,
    seats: [
      { key: "brute", label: "Brute" },
      { key: "uitkijk", label: "Uitkijk" },
    ],
    cashMin: 3_100,
    cashMax: 6_400,
    bullets: 4,
    familyExp: 48,
    chance: 68,
    jailChance: 40,
    jailMinutes: 12,
    hospitalMinutes: 0,
  },
  {
    slug: "gokhuis",
    name: "Gokhuis afromen",
    blurb: "Twee man aan de achtertafel. De kassa is van ons vannacht.",
    tier: "middel",
    minLevel: 2,
    energy: 16,
    seats: [
      { key: "insider", label: "Insider" },
      { key: "schutter", label: "Schutter" },
    ],
    cashMin: 5_400,
    cashMax: 11_000,
    bullets: 6,
    familyExp: 70,
    chance: 64,
    jailChance: 42,
    jailMinutes: 16,
    hospitalMinutes: 0,
  },
  {
    slug: "juwelier",
    name: "Juwelier-overval",
    blurb: "Glas, een tas, en iemand die de straat in de gaten houdt.",
    tier: "middel",
    minLevel: 2,
    energy: 18,
    seats: [
      { key: "chauffeur", label: "Chauffeur" },
      { key: "schutter", label: "Schutter" },
      { key: "uitkijk", label: "Uitkijk" },
    ],
    cashMin: 7_500,
    cashMax: 16_000,
    bullets: 8,
    familyExp: 90,
    chance: 58,
    jailChance: 46,
    jailMinutes: 18,
    hospitalMinutes: 0,
  },
  {
    slug: "wapenhandel",
    name: "Wapenhandel overnemen",
    blurb: "Drie man, een garagebox, kratten die niet op de vrachtbrief staan.",
    tier: "middel",
    minLevel: 2,
    energy: 20,
    seats: [
      { key: "onderhandelaar", label: "Onderhandelaar" },
      { key: "schutter", label: "Schutter" },
      { key: "koerier", label: "Koerier" },
    ],
    cashMin: 8_800,
    cashMax: 18_500,
    bullets: 14,
    familyExp: 105,
    chance: 54,
    jailChance: 48,
    jailMinutes: 20,
    hospitalMinutes: 0,
  },
  {
    slug: "drugslab",
    name: "Drugslab leeghalen",
    blurb: "Vier man door een achterkeuken. De geur blijft in je kleren.",
    tier: "middel",
    minLevel: 2,
    energy: 22,
    seats: [
      { key: "chauffeur", label: "Chauffeur" },
      { key: "hacker", label: "Hacker" },
      { key: "brute", label: "Brute" },
      { key: "uitkijk", label: "Uitkijk" },
    ],
    cashMin: 11_000,
    cashMax: 22_000,
    bullets: 12,
    familyExp: 120,
    chance: 52,
    jailChance: 50,
    jailMinutes: 22,
    hospitalMinutes: 0,
  },
  {
    slug: "pantserwagen",
    name: "Pantserwagen-hit",
    blurb: "Vier posities. Eén fout, en de straat is vol blauw.",
    tier: "middel",
    minLevel: 3,
    energy: 24,
    seats: [
      { key: "chauffeur", label: "Chauffeur" },
      { key: "schutter", label: "Schutter" },
      { key: "spreng", label: "Spreng" },
      { key: "uitkijk", label: "Uitkijk" },
    ],
    cashMin: 13_500,
    cashMax: 26_000,
    bullets: 18,
    familyExp: 135,
    chance: 48,
    jailChance: 55,
    jailMinutes: 28,
    hospitalMinutes: 2,
  },
  {
    slug: "haven",
    name: "Havenkraak",
    blurb: "Een zegel, een heftruck, en een loods die ‘leeg’ is.",
    tier: "groot",
    minLevel: 3,
    energy: 22,
    seats: [
      { key: "chauffeur", label: "Chauffeur" },
      { key: "hacker", label: "Hacker" },
      { key: "brute", label: "Brute" },
      { key: "uitkijk", label: "Uitkijk" },
    ],
    cashMin: 14_000,
    cashMax: 28_000,
    bullets: 16,
    familyExp: 140,
    chance: 50,
    jailChance: 52,
    jailMinutes: 30,
    hospitalMinutes: 2,
  },
  {
    slug: "casinokraak",
    name: "Casino-kraak",
    blurb: "Iedereen heeft een rol. Niemand praat erna.",
    tier: "groot",
    minLevel: 4,
    energy: 28,
    seats: [
      { key: "chauffeur", label: "Chauffeur" },
      { key: "schutter", label: "Schutter" },
      { key: "hacker", label: "Hacker" },
      { key: "brute", label: "Brute" },
      { key: "uitkijk", label: "Uitkijk" },
    ],
    cashMin: 26_000,
    cashMax: 52_000,
    bullets: 24,
    familyExp: 220,
    chance: 42,
    jailChance: 58,
    jailMinutes: 40,
    hospitalMinutes: 4,
  },
  {
    slug: "diamantkoerier",
    name: "Diamantkoerier",
    blurb: "Zes man op een konvooi dat niet bestaat. Eén tas, zes alibi’s.",
    tier: "groot",
    minLevel: 4,
    energy: 30,
    seats: [
      { key: "leider", label: "Leider" },
      { key: "chauffeur", label: "Chauffeur" },
      { key: "schutter", label: "Schutter" },
      { key: "hacker", label: "Hacker" },
      { key: "koerier", label: "Koerier" },
      { key: "uitkijk", label: "Uitkijk" },
    ],
    cashMin: 34_000,
    cashMax: 68_000,
    bullets: 28,
    familyExp: 260,
    chance: 38,
    jailChance: 62,
    jailMinutes: 50,
    hospitalMinutes: 6,
  },
  {
    slug: "bankoverval",
    name: "Bankoverval",
    blurb: "Zeven rollen, één kluis, geen tweede kans.",
    tier: "groot",
    minLevel: 4,
    energy: 32,
    seats: [
      { key: "leider", label: "Leider" },
      { key: "chauffeur", label: "Chauffeur" },
      { key: "schutter", label: "Schutter" },
      { key: "hacker", label: "Hacker" },
      { key: "brute", label: "Brute" },
      { key: "gijzel", label: "Gijzelnemer" },
      { key: "uitkijk", label: "Uitkijk" },
    ],
    cashMin: 48_000,
    cashMax: 92_000,
    bullets: 32,
    familyExp: 320,
    chance: 34,
    jailChance: 66,
    jailMinutes: 65,
    hospitalMinutes: 8,
  },
  {
    slug: "luchthaven",
    name: "Luchthaven-kraak",
    blurb: "Acht man door een douane die even de andere kant opkijkt.",
    tier: "groot",
    minLevel: 5,
    energy: 34,
    seats: [
      { key: "leider", label: "Leider" },
      { key: "chauffeur", label: "Chauffeur" },
      { key: "schutter", label: "Schutter" },
      { key: "hacker", label: "Hacker" },
      { key: "insider", label: "Insider" },
      { key: "koerier", label: "Koerier" },
      { key: "afdekking", label: "Afdekking" },
      { key: "uitkijk", label: "Uitkijk" },
    ],
    cashMin: 62_000,
    cashMax: 118_000,
    bullets: 36,
    familyExp: 380,
    chance: 30,
    jailChance: 70,
    jailMinutes: 80,
    hospitalMinutes: 10,
  },
  {
    slug: "goudtransport",
    name: "Goudtransport",
    blurb: "Tien stoelen. Als er één leeg blijft, gaat de vrachtwagen door.",
    tier: "groot",
    minLevel: 5,
    energy: 36,
    seats: [
      { key: "leider", label: "Leider" },
      { key: "chauffeur", label: "Chauffeur" },
      { key: "tweede-wagen", label: "Tweede wagen" },
      { key: "schutter", label: "Schutter" },
      { key: "hacker", label: "Hacker" },
      { key: "spreng", label: "Spreng" },
      { key: "brute", label: "Brute" },
      { key: "koerier", label: "Koerier" },
      { key: "afdekking", label: "Afdekking" },
      { key: "uitkijk", label: "Uitkijk" },
    ],
    cashMin: 88_000,
    cashMax: 165_000,
    bullets: 44,
    familyExp: 480,
    chance: 26,
    jailChance: 74,
    jailMinutes: 90,
    hospitalMinutes: 12,
  },
];

export function familyHeistDef(slug: string) {
  return FAMILY_HEISTS.find((row) => row.slug === slug) ?? null;
}

export type FamilyPerks = {
  familyId: string;
  crimeBonus: number;
  launderPct: number;
  hospitalFactor: number;
  defenseBonus: number;
  memberLimit: number;
  level: number;
};

export async function getFamilyPerks(familyId: string | null | undefined): Promise<FamilyPerks | null> {
  if (!familyId) return null;
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: {
      id: true,
      exp: true,
      memberLimit: true,
      launderLevel: true,
      doctorLevel: true,
      defenseLevel: true,
    },
  });
  if (!family) return null;
  return {
    familyId: family.id,
    crimeBonus: family.launderLevel * 0.06,
    launderPct: family.launderLevel * 0.1,
    hospitalFactor: Math.max(0.4, 1 - family.doctorLevel * 0.18),
    defenseBonus: family.defenseLevel * 0.08,
    memberLimit: Math.min(FAMILY_MEMBER_LIMIT_MAX, family.memberLimit),
    level: familyLevel(family.exp),
  };
}

export async function migrateFamilyRoles(familyId: string) {
  await prisma.familyMember.updateMany({
    where: { familyId, role: "LEADER" },
    data: { role: ROLE_DON },
  });
  await prisma.familyMember.updateMany({
    where: { familyId, role: "OFFICER" },
    data: { role: ROLE_UNDERBOSS },
  });
  await prisma.familyMember.updateMany({
    where: { familyId, role: "MEMBER" },
    data: { role: ROLE_SOLDIER },
  });
}

export async function tickFamilyEconomy(familyId: string, now = new Date()) {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: { buildings: true },
  });
  if (!family) return null;

  const elapsed = now.getTime() - family.lastIncomeAt.getTime();
  const hours = Math.floor(elapsed / FAMILY_HOUR_MS);
  if (hours < 1) return family;

  let cash = 0;
  let bullets = 0;
  for (const building of family.buildings) {
    const def = familyBuildingDef(building.slug);
    if (!def) continue;
    cash += def.cashPerHour * building.level * hours;
    bullets += def.bulletsPerHour * building.level * hours;
  }

  const patch = {
    lastIncomeAt: new Date(family.lastIncomeAt.getTime() + hours * FAMILY_HOUR_MS),
    bankBalance: family.bankBalance + cash,
    bulletsBank: family.bulletsBank + bullets,
  };

  const updated = await prisma.family.update({
    where: { id: familyId },
    data: patch,
  });

  if (cash > 0 || bullets > 0) {
    await prisma.familyLedger.create({
      data: {
        familyId,
        type: "INCOME",
        asset: cash >= bullets * 80 ? "CASH" : "BULLETS",
        amount: cash > 0 ? cash : bullets,
        note: `Passief vastgoed · ${hours} uur`,
      },
    });
  }

  return updated;
}

export function isFamilyOnline(lastSeenAt: Date | null, hideOnline: boolean) {
  if (hideOnline || !lastSeenAt) return false;
  return Date.now() - lastSeenAt.getTime() <= ONLINE_WINDOW_MS;
}

export function nextMemberLimit(current: number) {
  const fromSteps = FAMILY_MEMBER_LIMIT_STEPS.find((n) => n > current);
  if (fromSteps) return fromSteps;
  if (current < FAMILY_MEMBER_LIMIT_MAX) return FAMILY_MEMBER_LIMIT_MAX;
  return null;
}

export function slotsUpgradeCost(currentLimit: number) {
  return 10_000 + Math.max(0, currentLimit - FAMILY_MEMBER_LIMIT_START) * 5_000;
}
