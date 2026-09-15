import { ENERGY_TICK_MS, MAX_ENERGY } from "@/lib/constants";
import { remainingMs } from "@/lib/format";
import { RAID_LOCK_MS } from "@/lib/pimp";
import type { PlayerSnapshot } from "@/types/game";

/**
 * Wachttijden-register (Overzicht → Beschikbaarheid).
 *
 * Nieuwe timed content toevoegen:
 * 1. Zet de ISO-deadline op `PlayerSnapshot` (tickPlayer / toSnapshot), óf op
 *    `WaitQueueExtras` als het geen player-veld is (bv. familie-heist).
 * 2. Voeg één `WaitQueueDef` toe aan `WAIT_QUEUE_DEFS` hieronder.
 * 3. Het paneel op `/game` toont de rij automatisch (MM:SS + klaar/bezig).
 *
 * Status is altijd `remainingMs(...) > 0` → "bezig", anders "klaar".
 * Nooit `if (player.inJailUntil)` — een verlopen ISO-string is truthy terwijl
 * de speler al vrij is. Zelfde valkuil voor ziekenhuis, travel en cooldowns.
 */

export type WaitStatus = "klaar" | "bezig";

export type WaitKind = "lock" | "action" | "buff" | "resource";

export type WaitQueueItem = {
  id: string;
  label: string;
  href: string;
  status: WaitStatus;
  remainingMs: number;
  detail: string;
  kind: WaitKind;
};

export type WaitQueueExtras = {
  /** ISO tot de familie weer een heist mag starten. Laat weg zonder familie. */
  heistCooldownUntil?: string | null;
};

type WaitQueueCtx = {
  player: PlayerSnapshot;
  extras: WaitQueueExtras;
  now: number;
};

type WaitQueueDef = {
  id: string;
  label: string;
  href: string;
  kind: WaitKind;
  /** `null` verbergt de rij (bv. heist zonder familie). */
  remaining: (ctx: WaitQueueCtx) => number | null;
  detail: (ctx: WaitQueueCtx, remaining: number) => string;
};

function untilMs(until: string | null | undefined, now: number) {
  return remainingMs(until, now);
}

/** Milliseconds until energy is full. Uses lastEnergyAt when present. */
export function energyUntilFullMs(
  player: Pick<PlayerSnapshot, "energy"> & { lastEnergyAt?: string | null },
  now = Date.now(),
) {
  if (player.energy >= MAX_ENERGY) return 0;
  const missing = MAX_ENERGY - player.energy;
  if (!player.lastEnergyAt) return missing * ENERGY_TICK_MS;
  const elapsed = Math.max(0, now - new Date(player.lastEnergyAt).getTime());
  return Math.max(0, missing * ENERGY_TICK_MS - (elapsed % ENERGY_TICK_MS));
}

function readyOrWait(remaining: number, ready: string, busy: string) {
  return remaining > 0 ? busy : ready;
}

/**
 * Alle timers die Overzicht toont. Volgorde = weergavevolgorde binnen een statusgroep.
 * Locks eerst, daarna actie-cooldowns, resources en buffs.
 */
const WAIT_QUEUE_DEFS: WaitQueueDef[] = [
  {
    id: "jail",
    label: "Gevangenis",
    href: "/game/gevangenis",
    kind: "lock",
    remaining: ({ player, now }) => untilMs(player.inJailUntil, now),
    detail: (_ctx, remaining) =>
      remaining > 0 ? "Achter de tralies" : "Je bent vrij",
  },
  {
    id: "hospital",
    label: "Ziekenhuis",
    href: "/game/ziekenhuis",
    kind: "lock",
    remaining: ({ player, now }) => untilMs(player.inHospitalUntil, now),
    detail: ({ player }, remaining) => {
      if (remaining <= 0) return "Niet opgenomen";
      return player.isDead ? "Dood — wacht op ontslag" : "Opgenomen";
    },
  },
  {
    id: "travel",
    label: "Vlucht",
    href: "/game/vliegveld",
    kind: "lock",
    remaining: ({ player, now }) => untilMs(player.travelEndAt, now),
    detail: ({ player }, remaining) =>
      remaining > 0
        ? `Onderweg naar ${player.travelDestinationName ?? "bestemming"}`
        : `Op straat in ${player.currentCityName}`,
  },
  {
    id: "crime",
    label: "Misdaad",
    href: "/game/misdaden",
    kind: "action",
    remaining: ({ player, now }) => untilMs(player.crimeCooldownUntil, now),
    detail: (_ctx, remaining) => readyOrWait(remaining, "Klaar voor een klus", "Afkoelen"),
  },
  {
    id: "car-theft",
    label: "Auto stelen",
    href: "/game/auto-stelen",
    kind: "action",
    remaining: ({ player, now }) => untilMs(player.carTheftCooldownUntil, now),
    detail: (_ctx, remaining) => readyOrWait(remaining, "Klaar om te stelen", "Afkoelen"),
  },
  {
    id: "gym",
    label: "Gym",
    href: "/game/gym",
    kind: "action",
    remaining: ({ player, now }) => untilMs(player.gymCooldownUntil, now),
    detail: (_ctx, remaining) => readyOrWait(remaining, "Klaar om te trainen", "Dweilen"),
  },
  {
    id: "casino",
    label: "Casino",
    href: "/game/casino",
    kind: "action",
    remaining: ({ player, now }) => untilMs(player.casinoCooldownUntil, now),
    detail: (_ctx, remaining) => readyOrWait(remaining, "Klaar om in te zetten", "Croupier wacht"),
  },
  {
    id: "heist",
    label: "Familieheist",
    href: "/game/familie",
    kind: "action",
    remaining: ({ player, extras, now }) => {
      if (!player.family) return null;
      return untilMs(extras.heistCooldownUntil ?? null, now);
    },
    detail: (_ctx, remaining) =>
      readyOrWait(remaining, "Klaar voor een klus", "Crew ligt laag"),
  },
  {
    id: "energy",
    label: "Energie",
    href: "/game",
    kind: "resource",
    remaining: ({ player, now }) => energyUntilFullMs(player, now),
    detail: ({ player }, remaining) =>
      remaining > 0 ? `${player.energy}/${MAX_ENERGY} · aan het vullen` : `${player.energy}/${MAX_ENERGY} · vol`,
  },
  {
    id: "outbreak",
    label: "Uitbraak",
    href: "/game/hoeren",
    kind: "buff",
    remaining: ({ player, now }) => untilMs(player.outbreakUntil, now),
    detail: (_ctx, remaining) =>
      remaining > 0 ? "Besmet — ramen lijden" : "Geen uitbraak",
  },
  {
    id: "street-protect",
    label: "Straatdekking",
    href: "/game/hoeren",
    kind: "buff",
    remaining: ({ player, now }) => untilMs(player.streetProtectUntil, now),
    detail: (_ctx, remaining) =>
      remaining > 0 ? "Beschermd tegen razzia" : "Geen dekking",
  },
  {
    id: "raid",
    label: "Razzia",
    href: "/game/hoeren",
    kind: "buff",
    remaining: ({ player, now }) => {
      if (!player.lastRaidAt) return 0;
      const until = new Date(player.lastRaidAt).getTime() + RAID_LOCK_MS;
      if (!Number.isFinite(until)) return 0;
      return Math.max(0, until - now);
    },
    detail: (_ctx, remaining) =>
      remaining > 0 ? "Politie op de Wallen" : "Geen razzia",
  },
  {
    id: "casino-peek",
    label: "Casino peek",
    href: "/game/casino",
    kind: "buff",
    remaining: ({ player, now }) => {
      const ms = untilMs(player.casinoPeekUntil, now);
      return ms > 0 ? ms : null;
    },
    detail: (_ctx, remaining) =>
      remaining > 0 ? "Dealer bekeken" : "Peek beschikbaar",
  },
];

const STATUS_ORDER: Record<WaitStatus, number> = { bezig: 0, klaar: 1 };

export function listWaitQueue(
  player: PlayerSnapshot,
  extras: WaitQueueExtras = {},
  now = Date.now(),
): WaitQueueItem[] {
  const ctx: WaitQueueCtx = { player, extras, now };
  const items: WaitQueueItem[] = [];

  for (const def of WAIT_QUEUE_DEFS) {
    const ms = def.remaining(ctx);
    if (ms === null) continue;
    const remaining = Math.max(0, ms);
    items.push({
      id: def.id,
      label: def.label,
      href: def.href,
      status: remaining > 0 ? "bezig" : "klaar",
      remainingMs: remaining,
      detail: def.detail(ctx, remaining),
      kind: def.kind,
    });
  }

  return items.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}
