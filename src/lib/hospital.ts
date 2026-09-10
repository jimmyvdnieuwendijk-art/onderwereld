import { clamp } from "@/lib/format";

/** Hospital stay from remaining HP. Short, never hours. Optional family doctor factor. */
export function hospitalMsForHealth(health: number, killed: boolean, factor = 1) {
  if (killed) return Math.round(90_000 * factor);
  const missing = Math.max(1, 100 - Math.max(0, health));
  return Math.round(clamp(missing * 1_200, 15_000, 120_000) * factor);
}

export function hospitalOccupantWhere(now = new Date()) {
  return {
    OR: [{ isDead: true }, { inHospitalUntil: { gt: now } }],
  };
}

export function jailOccupantWhere(now = new Date()) {
  return { inJailUntil: { gt: now } };
}