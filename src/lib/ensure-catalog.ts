import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** Exact cash for the shared DonDemo test account. */
export const DEMO_TEST_CASH = 500_000;
export const DEMO_EMAIL = "demo@onderwereld.nl";
export const DEMO_USERNAME = "DonDemo";
export const DEMO_PASSWORD = "demo1234";

type DemoRow = {
  id: string;
  cash: number;
  username: string;
  email: string;
};

async function findDemoUser() {
  const byEmail = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true, cash: true, username: true, email: true },
  });
  return (
    byEmail ??
    (await prisma.user.findFirst({
      where: { username: { equals: DEMO_USERNAME, mode: "insensitive" } },
      select: { id: true, cash: true, username: true, email: true },
    }))
  );
}

/**
 * Cash helper only. Never touches hashedPassword, TOTP, email, or session.
 * Existing DonDemo credentials always win.
 */
export async function grantDemoTestCash(): Promise<DemoRow | null> {
  const demo = await findDemoUser();
  if (!demo) return null;
  if (demo.cash === DEMO_TEST_CASH) return demo;
  return prisma.user.update({
    where: { id: demo.id },
    data: { cash: DEMO_TEST_CASH },
    select: { id: true, cash: true, username: true, email: true },
  });
}

/** Extra cars/crimes added after the first production seed. Idempotent upsert so Vercel shows them without a wipe. */
const EXTRA_CRIMES = [
  {
    slug: "pinautomaat",
    name: "Pinautomaat kraken",
    description: "Een nachtelijke skimmer en een boor. Klein geld, snel wegwezen.",
    minRankOrder: 2,
    successChance: 64,
    cashMin: 70,
    cashMax: 160,
    expReward: 24,
    energyCost: 12,
    jailRiskChance: 20,
    jailMinutes: 10,
    cooldownSeconds: 28,
  },
  {
    slug: "container",
    name: "Havencontainer leeghalen",
    description: "Een zegel knippen in de nacht. Elektronica, sigaretten, of pech.",
    minRankOrder: 4,
    successChance: 40,
    cashMin: 380,
    cashMax: 860,
    expReward: 88,
    energyCost: 26,
    jailRiskChance: 34,
    jailMinutes: 32,
    cooldownSeconds: 42,
  },
  {
    slug: "afpersing",
    name: "Beschermingsgeld innen",
    description: "Een rondje langs de zaakjes. Respect kost, weigeren kost meer.",
    minRankOrder: 5,
    successChance: 38,
    cashMin: 700,
    cashMax: 1600,
    expReward: 130,
    energyCost: 32,
    jailRiskChance: 38,
    jailMinutes: 40,
    cooldownSeconds: 50,
  },
  {
    slug: "museum",
    name: "Museumroof",
    description: "Alarm, glas, en één schilderij dat de hele nacht waard is.",
    minRankOrder: 7,
    successChance: 22,
    cashMin: 2800,
    cashMax: 6400,
    expReward: 310,
    energyCost: 58,
    jailRiskChance: 50,
    jailMinutes: 90,
    cooldownSeconds: 80,
  },
  {
    slug: "arsenaal",
    name: "Legerarsenaal",
    description: "Een depot buiten de stad. Alleen voor wie het leger durft te krenken.",
    minRankOrder: 9,
    successChance: 14,
    cashMin: 8000,
    cashMax: 18000,
    expReward: 620,
    energyCost: 82,
    jailRiskChance: 58,
    jailMinutes: 140,
    cooldownSeconds: 105,
  },
] as const;

const EXTRA_VEHICLES = [
  { slug: "corsa", name: "Opel Corsa", baseValue: 420, stealDifficulty: 18, rarity: "common", minRankOrder: 1 },
  { slug: "rs6", name: "Audi RS6", baseValue: 14500, stealDifficulty: 52, rarity: "uncommon", minRankOrder: 4 },
  { slug: "rover", name: "Range Rover Sport", baseValue: 28000, stealDifficulty: 58, rarity: "rare", minRankOrder: 5 },
  { slug: "roma", name: "Ferrari Roma", baseValue: 72000, stealDifficulty: 82, rarity: "rare", minRankOrder: 7 },
  { slug: "chiron", name: "Bugatti Chiron", baseValue: 185000, stealDifficulty: 96, rarity: "legendary", minRankOrder: 9 },
] as const;

const BOOTSTRAP_RANKS = [
  { slug: "schooier", name: "Schooier", minExp: 0, order: 1 },
  { slug: "zakkenroller", name: "Zakkenroller", minExp: 250, order: 2 },
  { slug: "inbreker", name: "Inbreker", minExp: 800, order: 3 },
  { slug: "overvaller", name: "Overvaller", minExp: 2000, order: 4 },
  { slug: "schutter", name: "Schutter", minExp: 5000, order: 5 },
  { slug: "huurmoordenaar", name: "Huurmoordenaar", minExp: 12000, order: 6 },
  { slug: "capo", name: "Capo", minExp: 25000, order: 7 },
  { slug: "consigliere", name: "Consigliere", minExp: 50000, order: 8 },
  { slug: "onderbaas", name: "Onderbaas", minExp: 100000, order: 9 },
  { slug: "peetvader", name: "Peetvader", minExp: 200000, order: 10 },
] as const;

let catalogSync: Promise<void> | null = null;
let liveBoot: Promise<void> | null = null;

export async function ensureGameCatalog() {
  if (!catalogSync) {
    catalogSync = (async () => {
      const extraCrime = await prisma.crime.findUnique({
        where: { slug: "arsenaal" },
        select: { id: true },
      });
      const extraCar = await prisma.vehicleType.findUnique({
        where: { slug: "chiron" },
        select: { id: true },
      });
      if (!extraCrime) {
        for (const crime of EXTRA_CRIMES) {
          await prisma.crime.upsert({
            where: { slug: crime.slug },
            create: { ...crime },
            update: { ...crime },
          });
        }
      }
      if (!extraCar) {
        for (const vehicle of EXTRA_VEHICLES) {
          await prisma.vehicleType.upsert({
            where: { slug: vehicle.slug },
            create: { ...vehicle },
            update: { ...vehicle },
          });
        }
      }
    })().catch((error) => {
      catalogSync = null;
      console.error("ensureGameCatalog", error);
    });
  }
  await catalogSync;
}

/** Non-destructive: ranks, extra catalog, demo user. Never deletes live players. */
export async function ensureLiveBootstrap() {
  if (!liveBoot) {
    liveBoot = (async () => {
      const rankCount = await prisma.rank.count();
      if (rankCount === 0) {
        await prisma.rank.createMany({ data: [...BOOTSTRAP_RANKS], skipDuplicates: true });
      }
      await ensureGameCatalog();
      if (process.env.SKIP_DEMO_USERS === "1") return;

      const existing = await findDemoUser();
      if (existing) return;

      const nameTaken = await prisma.user.findFirst({
        where: { username: { equals: DEMO_USERNAME, mode: "insensitive" } },
        select: { id: true },
      });
      if (nameTaken) return;

      const starter = await prisma.rank.findFirst({ orderBy: { order: "asc" } });
      if (!starter) return;

      const hashedPassword = await hash(DEMO_PASSWORD, 10);
      await prisma.user.create({
        data: {
          email: DEMO_EMAIL,
          hashedPassword,
          username: DEMO_USERNAME,
          currentCity: "ams",
          cash: DEMO_TEST_CASH,
          rankId: starter.id,
        },
      });
    })().catch((error) => {
      liveBoot = null;
      console.error("ensureLiveBootstrap", error);
    });
  }
  await liveBoot;
}
