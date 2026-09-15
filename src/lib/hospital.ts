import { clamp } from "@/lib/format";

/** Hospital stay from remaining HP. Death is a real pause; wounds stay under 10 min. */
export function hospitalMsForHealth(health: number, killed: boolean, factor = 1) {
  if (killed) return Math.round(480_000 * factor);
  const missing = Math.max(1, 100 - Math.max(0, health));
  return Math.round(clamp(missing * 3_600, 20_000, 360_000) * factor);
}

export function hospitalOccupantWhere(now = new Date()) {
  return { inHospitalUntil: { gt: now } };
}

export function jailOccupantWhere(now = new Date()) {
  return { inJailUntil: { gt: now } };
}