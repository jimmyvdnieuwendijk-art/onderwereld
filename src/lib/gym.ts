import { MAX_ENERGY } from "@/lib/constants";

export const MAX_STRENGTH = 80;
export const MAX_CONDITION = 80;
export const MAX_FIGHT_SKILL = 12;
export const MIN_TRAIN_HEALTH = 20;

export type GymLevel = {
  level: number;
  slug: string;
  name: string;
  tagline: string;
  exercises: string[];
  strength: number;
  condition: number;
  fightSkill: number;
  energyRefundPct: number;
  energyCost: number;
  cashCost: number;
  cooldownMs: number;
  gymExp: number;
  unlockGymExp: number;
  unlockCash: number;
  image: string;
};

export const GYM_LEVELS: GymLevel[] = [
  {
    level: 1,
    slug: "kelder",
    name: "Kelder",
    tagline: "Beton, schimmel, één bokszak. Iedereen mag naar binnen.",
    exercises: ["Beton-push-ups tot de polsen knarsen", "Zware bokszak — geen handschoenen, wel tape"],
    strength: 1,
    condition: 0,
    fightSkill: 0,
    energyRefundPct: 5,
    energyCost: 12,
    cashCost: 0,
    cooldownMs: 45_000,
    gymExp: 6,
    unlockGymExp: 0,
    unlockCash: 0,
    image: "/game/gym/gym-l1.jpg",
  },
  {
    level: 2,
    slug: "ijzeren-hal",
    name: "IJzeren hal",
    tagline: "Waterleidingen als rekstok. Banden van een gestolen truck.",
    exercises: ["Pull-ups aan de roestige waterleiding", "Tractorband-flips over het beton"],
    strength: 2,
    condition: 1,
    fightSkill: 0,
    energyRefundPct: 8,
    energyCost: 16,
    cashCost: 40,
    cooldownMs: 75_000,
    gymExp: 10,
    unlockGymExp: 20,
    unlockCash: 150,
    image: "/game/gym/gym-l2.jpg",
  },
  {
    level: 3,
    slug: "roestplaat",
    name: "Roestplaat",
    tagline: "Bankdrukker zonder vangijzer. Sparring op de vloer.",
    exercises: ["Roestige bench press — 4 sets, geen spotter", "Sparring op het beton, open handen, vuile trucs"],
    strength: 3,
    condition: 1,
    fightSkill: 0,
    energyRefundPct: 15,
    energyCost: 20,
    cashCost: 90,
    cooldownMs: 2 * 60_000,
    gymExp: 14,
    unlockGymExp: 70,
    unlockCash: 600,
    image: "/game/gym/gym-l3.jpg",
  },
  {
    level: 4,
    slug: "bloedring",
    name: "Bloedring",
    tagline: "Kooi, tape, farmers walk met autobanden.",
    exercises: ["Farmers walk met twee autobanden tot de schouders branden", "Cage clinch / dirty boxing tegen de tralies"],
    strength: 4,
    condition: 2,
    fightSkill: 1,
    energyRefundPct: 20,
    energyCost: 24,
    cashCost: 180,
    cooldownMs: 3 * 60_000,
    gymExp: 18,
    unlockGymExp: 160,
    unlockCash: 1800,
    image: "/game/gym/gym-l4.jpg",
  },
  {
    level: 5,
    slug: "slachthuis",
    name: "Slachthuis",
    tagline: "CrossFit-MMA tot je maag leeg is. De trainer telt niet mee.",
    exercises: [
      "Circuit: burpees, sledgehammer, bandenslam",
      "MMA-rondes op de dummy — ground-and-pound tot de bel",
    ],
    strength: 5,
    condition: 3,
    fightSkill: 1,
    energyRefundPct: 30,
    energyCost: 28,
    cashCost: 350,
    cooldownMs: 4 * 60_000,
    gymExp: 24,
    unlockGymExp: 320,
    unlockCash: 5000,
    image: "/game/gym/gym-l5.jpg",
  },
];

export function gymLevelByNumber(level: number) {
  return GYM_LEVELS.find((row) => row.level === level) ?? null;
}

export function gymAttackBonus(strength: number, fightSkill: number) {
  return Math.floor(Math.max(0, strength) / 5) + Math.max(0, fightSkill);
}

export function gymDefenseBonus(condition: number, fightSkill: number) {
  return Math.floor(Math.max(0, condition) / 4) + Math.floor(Math.max(0, fightSkill) / 2);
}

export function energyRefundAmount(pct: number) {
  return Math.max(0, Math.round((MAX_ENERGY * pct) / 100));
}

export function canUnlockFloor(gymFloor: number, gymExp: number, target: GymLevel) {
  if (target.level <= gymFloor) return { ok: true as const };
  if (target.level !== gymFloor + 1) return { ok: false as const, reason: "Open eerst de verdieping eronder." };
  if (gymExp < target.unlockGymExp) {
    return { ok: false as const, reason: `Nog ${target.unlockGymExp - gymExp} gym-rep nodig.` };
  }
  return { ok: true as const };
}
