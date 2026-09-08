import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  const now = Date.now();
  return NextResponse.json(
    users.map((user) => ({
      id: user.id,
      username: user.username,
      rankName: user.rank.name,
      rankOrder: user.rank.order,
      currentCity: user.currentCity,
      health: user.health,
      isDead: user.isDead,
      inJail: !!(user.inJailUntil && user.inJailUntil.getTime() > now),
      inHospital: !!(user.inHospitalUntil && user.inHospitalUntil.getTime() > now),
      killCount: user.killCount,
      familyName: user.family?.name ?? null,
    })),
  );
}
