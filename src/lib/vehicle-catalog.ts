export type VehicleSeed = {
  slug: string;
  name: string;
  baseValue: number;
  stealDifficulty: number;
  rarity: string;
  minRankOrder: number;
};

export const VEHICLES: VehicleSeed[] = [
  { slug: "fiets", name: "Stadsfiets", baseValue: 80, stealDifficulty: 14, rarity: "common", minRankOrder: 1 },
  { slug: "corsa", name: "Opel Corsa", baseValue: 480, stealDifficulty: 18, rarity: "common", minRankOrder: 1 },
  { slug: "scooter", name: "Vespa", baseValue: 650, stealDifficulty: 24, rarity: "common", minRankOrder: 1 },
  { slug: "golf", name: "Volkswagen Golf", baseValue: 3200, stealDifficulty: 38, rarity: "uncommon", minRankOrder: 2 },
  { slug: "bmw", name: "BMW 3-serie", baseValue: 9800, stealDifficulty: 54, rarity: "uncommon", minRankOrder: 3 },
  { slug: "rs6", name: "Audi RS6", baseValue: 14500, stealDifficulty: 58, rarity: "uncommon", minRankOrder: 4 },
  { slug: "mercedes", name: "Mercedes S-Klasse", baseValue: 22000, stealDifficulty: 66, rarity: "rare", minRankOrder: 5 },
  { slug: "rover", name: "Range Rover Sport", baseValue: 28000, stealDifficulty: 64, rarity: "rare", minRankOrder: 5 },
  { slug: "porsche", name: "Porsche 911", baseValue: 48000, stealDifficulty: 80, rarity: "rare", minRankOrder: 6 },
  { slug: "roma", name: "Ferrari Roma", baseValue: 72000, stealDifficulty: 84, rarity: "rare", minRankOrder: 7 },
  { slug: "lambo", name: "Lamborghini Huracán", baseValue: 110000, stealDifficulty: 92, rarity: "legendary", minRankOrder: 8 },
  { slug: "chiron", name: "Bugatti Chiron", baseValue: 185000, stealDifficulty: 97, rarity: "legendary", minRankOrder: 9 },
];

/** Chop-shop payout vs catalog. */
export const VEHICLE_SELL_MULT = 0.5;
/** Repair bill vs missing condition × catalog. */
export const VEHICLE_REPAIR_MULT = 0.32;
export const THEFT_COOLDOWN_MS = 40_000;
export const THEFT_JAIL_MINUTES = 12;

export function theftEnergyCost(minRankOrder: number) {
  return 8 + minRankOrder * 2;
}

export function theftJailChance(minRankOrder: number) {
  return 18 + minRankOrder * 3;
}
