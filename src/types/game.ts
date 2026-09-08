export type ActionResult<T = unknown> = {
  ok: boolean;
  message: string;
  variant?: "success" | "error" | "warning" | "info";
  data?: T;
};

export type RankInfo = {
  id: string;
  slug: string;
  name: string;
  minExp: number;
  order: number;
};

export type EquippedItem = {
  id: string;
  name: string;
  attack: number;
  defense: number;
} | null;

export type PlayerSnapshot = {
  id: string;
  email: string;
  username: string;
  cash: number;
  bankBalance: number;
  health: number;
  energy: number;
  exp: number;
  bullets: number;
  defense: number;
  attackPower: number;
  killCount: number;
  currentCity: string;
  isDead: boolean;
  inJailUntil: string | null;
  inHospitalUntil: string | null;
  crimeCooldownUntil: string | null;
  carTheftCooldownUntil: string | null;
  rank: RankInfo;
  nextRank: RankInfo | null;
  family: { id: string; name: string; role: string | null } | null;
  unreadMessages: number;
  equippedWeapon: EquippedItem;
  equippedArmor: EquippedItem;
  vehicleCount: number;
};

export type PublicPlayer = {
  id: string;
  username: string;
  rankName: string;
  rankOrder: number;
  currentCity: string;
  health: number;
  isDead: boolean;
  inJail: boolean;
  inHospital: boolean;
  killCount: number;
  familyName: string | null;
};
