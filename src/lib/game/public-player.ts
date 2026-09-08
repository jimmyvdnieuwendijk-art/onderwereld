import type { PublicPlayer } from "@/types/game";

/** Public dossier for other players — never include city or travel destination. */
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
  rank: { name: string; order: number };
  family: { name: string } | null;
}): PublicPlayer {
  const now = Date.now();
  return {
    id: user.id,
    username: user.username,
    rankName: user.rank.name,
    rankOrder: user.rank.order,
    exp: user.exp,
    cash: user.cash,
    health: user.health,
    isDead: user.isDead,
    inJail: !!(user.inJailUntil && user.inJailUntil.getTime() > now),
    inHospital: !!(user.inHospitalUntil && user.inHospitalUntil.getTime() > now),
    isTraveling: !!(user.travelEndAt && user.travelEndAt.getTime() > now),
    killCount: user.killCount,
    familyName: user.family?.name ?? null,
  };
}
