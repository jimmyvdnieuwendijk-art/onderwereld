import { prisma } from "@/lib/prisma";

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

let syncing: Promise<void> | null = null;

export async function ensureGameCatalog() {
  if (!syncing) {
    syncing = (async () => {
      for (const crime of EXTRA_CRIMES) {
        await prisma.crime.upsert({
          where: { slug: crime.slug },
          create: { ...crime },
          update: { ...crime },
        });
      }
      for (const vehicle of EXTRA_VEHICLES) {
        await prisma.vehicleType.upsert({
          where: { slug: vehicle.slug },
          create: { ...vehicle },
          update: { ...vehicle },
        });
      }
    })().catch((error) => {
      syncing = null;
      console.error("ensureGameCatalog", error);
    });
  }
  await syncing;
}
