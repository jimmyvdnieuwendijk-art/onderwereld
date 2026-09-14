import { prisma } from "@/lib/prisma";
import { PLAYER_RANKS } from "@/lib/ranks";

function ranksMatchLadder(
  rows: { slug: string; name: string; minExp: number; order: number }[],
) {
  if (rows.length !== PLAYER_RANKS.length) return false;
  return PLAYER_RANKS.every((want, i) => {
    const row = rows[i];
    return (
      row.slug === want.slug &&
      row.name === want.name &&
      row.minExp === want.minExp &&
      row.order === want.order
    );
  });
}

async function rematchPlayersToRanks() {
  const ranks = await prisma.rank.findMany({ orderBy: { order: "asc" } });
  if (ranks.length === 0) return;
  const users = await prisma.user.findMany({ select: { id: true, exp: true, rankId: true } });
  for (const user of users) {
    const matching = [...ranks].reverse().find((rank) => user.exp >= rank.minExp) ?? ranks[0];
    if (matching.id !== user.rankId) {
      await prisma.user.update({ where: { id: user.id }, data: { rankId: matching.id } });
    }
  }
}

let rankSync: Promise<void> | null = null;

/**
 * Idempotent live migration: rewrite the rank table to the 12-title ladder
 * and snap every player to the nearest rank by exp.
 */
export async function ensureRankLadder() {
  if (!rankSync) {
    rankSync = (async () => {
      const existing = await prisma.rank.findMany({ orderBy: { order: "asc" } });
      if (ranksMatchLadder(existing)) {
        return;
      }

      if (existing.length === 0) {
        await prisma.rank.createMany({ data: [...PLAYER_RANKS] });
        return;
      }

      for (const rank of existing) {
        await prisma.rank.update({
          where: { id: rank.id },
          data: { slug: `legacy-${rank.id}`, order: rank.order + 1000 },
        });
      }

      const leftover = await prisma.rank.findMany({ orderBy: { order: "asc" } });
      for (let i = 0; i < PLAYER_RANKS.length; i++) {
        const want = PLAYER_RANKS[i];
        const reuse = leftover[i];
        if (reuse) {
          await prisma.rank.update({
            where: { id: reuse.id },
            data: { slug: want.slug, name: want.name, minExp: want.minExp, order: want.order },
          });
        } else {
          await prisma.rank.create({ data: { ...want } });
        }
      }

      await rematchPlayersToRanks();

      if (leftover.length > PLAYER_RANKS.length) {
        const extraIds = leftover.slice(PLAYER_RANKS.length).map((row) => row.id);
        await prisma.rank.deleteMany({ where: { id: { in: extraIds } } });
      }
    })().catch((error) => {
      rankSync = null;
      throw error;
    });
  }
  await rankSync;
}
