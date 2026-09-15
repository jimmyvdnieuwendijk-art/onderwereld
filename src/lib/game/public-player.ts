import type { PublicPlayer } from "@/types/game";
import { ONLINE_WINDOW_MS } from "@/lib/constants";
import { isActiveUntil } from "@/lib/format";

/** Public dossier for other players — never include city or travel destination. */
export function publicDisplayName(user: { displayName?: string | null; username: string }) {
  const name = user.displayName?.trim();
  return name || user.username;
}

export function toPublicPlayer(user: {
  id: string;
  username: string;
  health: number;
  isDead: boolean;
  killCount: number;
  exp: number;
  cash: number;
  inJailUntil: Date | null;
  inHospitalUntil: Date | null;
  travelEndAt?: Date | null;
  bio?: string | null;
  bioHidden?: boolean | null;
  hideOnline?: boolean | null;
  lastSeenAt?: Date | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  rank: { name: string; order: number };
  family: { name: string } | null;
}): PublicPlayer {
  const now = Date.now();
  const hidden = !!user.bioHidden;
  const bio = user.bio?.trim() ? user.bio : null;
  const seen = user.lastSeenAt?.getTime() ?? 0;
  const isOnline = !user.hideOnline && seen > 0 && now - seen <= ONLINE_WINDOW_MS;
  const inJail = isActiveUntil(user.inJailUntil, now);
  const inHospital = isActiveUntil(user.inHospitalUntil, now);
  const isDead = !!user.isDead && inHospital;
  return {
    id: user.id,
    username: user.username,
    displayName: publicDisplayName(user),
    rankName: user.rank.name,
    rankOrder: user.rank.order,
    exp: user.exp,
    cash: user.cash,
    health: isDead || inHospital ? user.health : user.isDead ? 25 : user.health,
    isDead,
    inJail,
    inHospital,
    isTraveling: isActiveUntil(user.travelEndAt, now),
    killCount: user.killCount,
    familyName: user.family?.name ?? null,
    bio: hidden ? null : bio,
    avatarUrl: user.avatarUrl ?? null,
    isOnline,
  };
}
