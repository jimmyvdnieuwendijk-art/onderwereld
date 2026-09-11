import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { migrateFamilyRoles, tickFamilyEconomy } from "@/lib/family";
import { ONLINE_WINDOW_MS } from "@/lib/constants";
import { publicDisplayName } from "@/lib/game/public-player";
import { redirect } from "next/navigation";
import { FamilyClient } from "./family-client";
import type { FamilyHq, FamilyInviteRow, FamilyRival } from "./hq-types";

export const metadata = { title: "Familie" };

export default async function FamilyPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");

  const inviteRows = await prisma.familyInvite.findMany({
    where: { toUserId: player.id },
    include: {
      family: { select: { name: true, memberLimit: true, _count: { select: { memberships: true } } } },
      fromUser: { select: { username: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const invites: FamilyInviteRow[] = inviteRows.map((row) => ({
    id: row.id,
    familyName: row.family.name,
    fromName: publicDisplayName(row.fromUser),
    seats: `${row.family._count.memberships}/${row.family.memberLimit}`,
  }));

  if (!player.family) {
    return <FamilyClient selfId={player.id} selfRole={null} hq={null} invites={invites} rivals={[]} />;
  }

  const staleRole = await prisma.familyMember.findFirst({
    where: { familyId: player.family.id, role: { in: ["LEADER", "OFFICER", "MEMBER"] } },
    select: { id: true },
  });
  if (staleRole) {
    await migrateFamilyRoles(player.family.id);
  }
  await tickFamilyEconomy(player.family.id);

  const family = await prisma.family.findUnique({
    where: { id: player.family.id },
    include: {
      leader: { select: { username: true, displayName: true } },
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              lastSeenAt: true,
              hideOnline: true,
              rank: { select: { name: true } },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      buildings: true,
      ledger: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { user: { select: { username: true } } },
      },
      heists: {
        where: { status: "OPEN" },
        include: {
          seats: {
            include: { user: { select: { username: true, displayName: true } } },
          },
        },
      },
    },
  });

  if (!family) {
    return <FamilyClient selfId={player.id} selfRole={null} hq={null} invites={invites} rivals={[]} />;
  }

  const rivalRows = await prisma.family.findMany({
    where: { id: { not: family.id } },
    select: {
      id: true,
      name: true,
      defenseLevel: true,
      _count: { select: { buildings: true, memberships: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const rivals: FamilyRival[] = rivalRows.map((row) => ({
    id: row.id,
    name: row.name,
    defenseLevel: row.defenseLevel,
    buildings: row._count.buildings,
    members: row._count.memberships,
  }));

  const hq: FamilyHq = {
    id: family.id,
    name: family.name,
    description: family.description,
    createdAt: family.createdAt.toISOString(),
    leaderName: publicDisplayName(family.leader),
    leaderUsername: family.leader.username,
    bankBalance: family.bankBalance,
    legalBank: family.legalBank,
    bulletsBank: family.bulletsBank,
    exp: family.exp,
    memberLimit: family.memberLimit,
    announcement: family.announcement,
    announcementAt: family.announcementAt?.toISOString() ?? null,
    launderLevel: family.launderLevel,
    doctorLevel: family.doctorLevel,
    defenseLevel: family.defenseLevel,
    members: family.memberships.map((m) => ({
      userId: m.userId,
      username: m.user.username,
      displayName: publicDisplayName(m.user),
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      rankName: m.user.rank.name,
      online: !m.user.hideOnline && !!m.user.lastSeenAt && Date.now() - m.user.lastSeenAt.getTime() <= ONLINE_WINDOW_MS,
      donatedCash: m.donatedCash,
      donatedLegal: m.donatedLegal,
      donatedBullets: m.donatedBullets,
    })),
    buildings: family.buildings.map((b) => ({ slug: b.slug, level: b.level })),
    ledger: family.ledger.map((row) => ({
      id: row.id,
      type: row.type,
      asset: row.asset,
      amount: row.amount,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      username: row.user?.username ?? null,
    })),
    openHeist: family.heists[0]
      ? {
          id: family.heists[0].id,
          slug: family.heists[0].slug,
          seats: family.heists[0].seats.map((seat) => ({
            roleKey: seat.roleKey,
            username: seat.user ? publicDisplayName(seat.user) : null,
          })),
        }
      : null,
  };

  return (
    <FamilyClient
      selfId={player.id}
      selfRole={player.family.role}
      hq={hq}
      invites={invites}
      rivals={rivals}
    />
  );
}
