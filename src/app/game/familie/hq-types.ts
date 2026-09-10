export type FamilyInviteRow = {
  id: string;
  familyName: string;
  fromName: string;
  seats: string;
};

export type FamilyRival = {
  id: string;
  name: string;
  defenseLevel: number;
  buildings: number;
  members: number;
};

export type FamilyHqMember = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  rankName: string;
  online: boolean;
  donatedCash: number;
  donatedLegal: number;
  donatedBullets: number;
};

export type FamilyHq = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  leaderName: string;
  leaderUsername: string;
  bankBalance: number;
  legalBank: number;
  bulletsBank: number;
  exp: number;
  memberLimit: number;
  announcement: string;
  announcementAt: string | null;
  launderLevel: number;
  doctorLevel: number;
  defenseLevel: number;
  members: FamilyHqMember[];
  buildings: { slug: string; level: number }[];
  ledger: {
    id: string;
    type: string;
    asset: string;
    amount: number;
    note: string;
    createdAt: string;
    username: string | null;
  }[];
  openHeist: {
    id: string;
    slug: string;
    seats: { roleKey: string; username: string | null }[];
  } | null;
};
