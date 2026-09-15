import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toPublicPlayer } from "@/lib/game/public-player";
import {
  LEADERBOARD_TAKE,
  parsePlayerSort,
  parseSortDir,
  playerLeaderboardOrder,
  PUBLIC_PLAYER_SELECT,
} from "@/lib/game/leaderboard";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const sort = parsePlayerSort(searchParams.get("sort"));
  const dir = parseSortDir(searchParams.get("dir"));
  const rank = (searchParams.get("rank") ?? "").trim();

  const users = await prisma.user.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { username: { contains: q, mode: "insensitive" } },
                { displayName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        rank && rank !== "all" ? { rank: { name: rank } } : {},
      ],
    },
    select: PUBLIC_PLAYER_SELECT,
    orderBy: playerLeaderboardOrder(sort, dir),
    take: q ? 50 : LEADERBOARD_TAKE,
  });

  return NextResponse.json(users.map((user) => toPublicPlayer(user)));
}
