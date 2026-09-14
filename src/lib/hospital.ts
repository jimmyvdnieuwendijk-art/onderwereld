import { clamp } from "@/lib/format";

/** Hospital stay from remaining HP. Short, never hours. Optional family doctor factor. */
export function hospitalMsForHealth(health: number, killed: boolean, factor = 1) {
  if (killed) return Math.round(180_000 * factor);
  const missing = Math.max(1, 100 - Math.max(0, health));
  return Math.round(clamp(missing * 2_400, 15_000, 240_000) * factor);
}

export function hospitalOccupantWhere(now = new Date()) {
  return { inHospitalUntil: { gt: now } };
}

export function jailOccupantWhere(now = new Date()) {
  return { inJailUntil: { gt: now } };
}