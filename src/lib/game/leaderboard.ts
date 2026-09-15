import type { Prisma } from "@prisma/client";

export const PLAYER_SORTS = ["rank", "kills", "cash", "exp", "health"] as const;
export type PlayerSort = (typeof PLAYER_SORTS)[number];
export type SortDir = "asc" | "desc";

export const PLAYER_SORT_LABELS: Record<PlayerSort, string> = {
  rank: "rang",
  kills: "kills",
  cash: "geld",
  exp: "exp",
  health: "HP",
};

export const LEADERBOARD_TAKE = 120;

export const PUBLIC_PLAYER_SELECT = {
  id: true,
  username: true,
  health: true,
  isDead: true,
  killCount: true,
  exp: true,
  cash: true,
  inJailUntil: true,
  inHospitalUntil: true,
  travelEndAt: true,
  bio: true,
  bioHidden: true,
  hideOnline: true,
  lastSeenAt: true,
  displayName: true,
  avatarUrl: true,
  selectedTitle: true,
  selectedNameColor: true,
  rank: { select: { name: true, order: true } },
  family: { select: { name: true } },
} as const satisfies Prisma.UserSelect;

export function parsePlayerSort(value: string | null | undefined): PlayerSort {
  if (value && (PLAYER_SORTS as readonly string[]).includes(value)) {
    return value as PlayerSort;
  }
  return "rank";
}

export function parseSortDir(value: string | null | undefined): SortDir {
  return value === "asc" ? "asc" : "desc";
}

/** Prisma order for the klassement. Kills/geld/HP/rang/exp each hit the real column. */
export function playerLeaderboardOrder(
  sort: PlayerSort,
  dir: SortDir,
): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    case "kills":
      return [{ killCount: dir }, { exp: "desc" }, { cash: "desc" }];
    case "cash":
      return [{ cash: dir }, { exp: "desc" }];
    case "health":
      return [{ health: dir }, { exp: "desc" }];
    case "rank":
      return [{ rank: { order: dir } }, { exp: dir }];
    case "exp":
      return [{ exp: dir }, { killCount: "desc" }, { cash: "desc" }];
  }
}
