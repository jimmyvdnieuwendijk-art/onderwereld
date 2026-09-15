const euro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const integer = new Intl.NumberFormat("nl-NL");

export function formatMoney(amount: number) {
  return euro.format(amount);
}

export function formatNumber(amount: number) {
  return integer.format(amount);
}

export function formatDateTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Epoch ms for a detention/cooldown deadline. Invalid or missing → null. */
export function untilEpoch(until: Date | string | number | null | undefined): number | null {
  if (until == null || until === "") return null;
  if (until instanceof Date) {
    const ts = until.getTime();
    return Number.isFinite(ts) ? ts : null;
  }
  if (typeof until === "number") {
    if (!Number.isFinite(until) || until <= 0) return null;
    return until < 1e12 ? until * 1000 : until;
  }
  const ts = new Date(until).getTime();
  return Number.isFinite(ts) ? ts : null;
}

/**
 * Remaining time until `until`. Always a finite >= 0 number.
 * Never use `if (player.inJailUntil)` — expired ISO strings are truthy.
 */
export function remainingMs(until: Date | string | number | null | undefined, now = Date.now()) {
  const ts = untilEpoch(until);
  if (ts == null) return 0;
  return Math.max(0, ts - now);
}

export function isActiveUntil(until: Date | string | number | null | undefined, now = Date.now()) {
  return remainingMs(until, now) > 0;
}

/** Borg / privékliniek: remaining minutes (ceil, min 1) × rate. */
export function detentionBuyoutCost(remaining: number, perMinute: number) {
  if (remaining <= 0) return 0;
  return Math.max(1, Math.ceil(remaining / 60_000)) * perMinute;
}

export function formatDuration(ms: number) {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}u ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** MM:SS, or H:MM:SS when a wait crosses an hour (long jail). */
export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
