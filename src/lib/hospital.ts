import { clamp } from "@/lib/format";

/** Hospital stay from remaining HP. Short, never hours. */
export function hospitalMsForHealth(health: number, killed: boolean) {
  if (killed) return 90_000;
  const missing = Math.max(1, 100 - Math.max(0, health));
  return clamp(missing * 1_200, 15_000, 120_000);
}

export function hospitalOccupantWhere(now = new Date()) {
  return {
    OR: [{ isDead: true }, { inHospitalUntil: { gt: now } }],
  };
}

export function jailOccupantWhere(now = new Date()) {
  return { inJailUntil: { gt: now } };
}