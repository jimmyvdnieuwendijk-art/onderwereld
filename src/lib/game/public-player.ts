import { cityDisplayName, normalizeCityId } from "@/lib/airports";
import type { PublicPlayer } from "@/types/game";

export function toPublicPlayer(user: {
  id: string;
  username: string;
  health: number;
  isDead: boolean;
  killCount: number;
  currentCity: string;
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
    currentCity: normalizeCityId(user.currentCity),
    currentCityName: cityDisplayName(user.currentCity),
    health: user.health,
    isDead: user.isDead,
    inJail: !!(user.inJailUntil && user.inJailUntil.getTime() > now),
    inHospital: !!(user.inHospitalUntil && user.inHospitalUntil.getTime() > now),
    isTraveling: !!(user.travelEndAt && user.travelEndAt.getTime() > now),
    killCount: user.killCount,
    familyName: user.family?.name ?? null,
  };
}
