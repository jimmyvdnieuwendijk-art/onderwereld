import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toPublicPlayer } from "@/lib/game/public-player";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const users = await prisma.user.findMany({
    where: q
      ? { username: { contains: q } }
      : { id: { not: session.user.id } },
    include: { rank: true, family: true },
    orderBy: { exp: "desc" },
    take: 30,
  });

  return NextResponse.json(users.map((user) => toPublicPlayer(user)));
}
