import { prisma } from "@/lib/prisma";
import {
  FAMILY_HOUR_MS,
  FAMILY_MEMBER_LIMIT_MAX,
  FAMILY_MEMBER_LIMIT_START,
  ONLINE_WINDOW_MS,
  ROLE_CAPO,
  ROLE_DON,
  ROLE_SOLDIER,
  ROLE_UNDERBOSS,
} from "@/lib/constants";

export type FamilyRole = typeof ROLE_DON | typeof ROLE_UNDERBOSS | typeof ROLE_CAPO | typeof ROLE_SOLDIER;
export type FamilyAsset = "CASH" | "LEGAL" | "BULLETS";
export type FamilyTab =
  | "overzicht"
  | "leden"
  | "bank"
  | "vastgoed"
  | "benefits"
  | "misdaden"
  | "beheer";

export function normalizeFamilyRole(role: string): FamilyRole {
  if (role === "LEADER" || role === ROLE_DON) return ROLE_DON;
  if (role === "OFFICER" || role === ROLE_UNDERBOSS) return ROLE_UNDERBOSS;
  if (role === ROLE_CAPO) return ROLE_CAPO;
  return ROLE_SOLDIER;
}

export function familyRoleRank(role: string) {
  switch (normalizeFamilyRole(role)) {
    case ROLE_DON:
      return 4;
    case ROLE_UNDERBOSS:
      return 3;
    case ROLE_CAPO:
      return 2;
    default:
      return 1;
  }
}

export function familyRoleLabel(role: string) {
  switch (normalizeFamilyRole(role)) {
    case ROLE_DON:
      return "Don";
    case ROLE_UNDERBOSS:
      return "Underboss";
    case ROLE_CAPO:
      return "Caporegime";
    default:
      return "Soldier";
  }
}

export const FAMILY_ROLE_RIGHTS: Record<FamilyRole, string[]> = {
  [ROLE_DON]: ["Alles", "Ontbinden", "Promote tot Underboss", "Uitbetalen"],
  [ROLE_UNDERBOSS]: ["Uitnodigen", "Kick onder zich", "Uitbetalen", "Upgrades", "Beheer"],
  [ROLE_CAPO]: ["Uitnodigen", "Kick Soldiers", "Heists openen", "Vastgoed kopen"],
  [ROLE_SOLDIER]: ["Doneren", "Heist-plek claimen"],
};

export function canManageFamily(role: string) {
  return familyRoleRank(role) >= 3;
}

export function canInviteKick(role: string) {
  return familyRoleRank(role) >= 2;
}

export function canLeadJobs(role: string) {
  return familyRoleRank(role) >= 2;
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
  minLevel: number;
  energy: number;
  seats: { key: string; label: string }[];
  cashMin: number;
  cashMax: number;
  bullets: number;
  familyExp: number;
  chance: number;
};

export const FAMILY_HEISTS: FamilyHeistDef[] = [
  {
    slug: "pinautomaat",
    name: "Pinautomaat-run",
    blurb: "Twee man, één skimmer, vijf minuten.",
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
  },
  {
    slug: "juwelier",
    name: "Juwelier-overval",
    blurb: "Glas, een tas, en iemand die de straat in de gaten houdt.",
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
  },
  {
    slug: "haven",
    name: "Havenkraak",
    blurb: "Een zegel, een heftruck, en een loods die ‘leeg’ is.",
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
  },
  {
    slug: "casinokraak",
    name: "Casino-kraak",
    blurb: "Iedereen heeft een rol. Niemand praat erna.",
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
    memberLimit: family.memberLimit,
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
  const steps = [8, 10, 12, 15];
  return steps.find((n) => n > current) ?? null;
}

export function slotsUpgradeCost(currentLimit: number) {
  return 12_000 + Math.max(0, currentLimit - FAMILY_MEMBER_LIMIT_START) * 8_000;
}
