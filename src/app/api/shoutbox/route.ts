import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const messages = await prisma.shoutboxMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { user: { select: { username: true } } },
  });

  return NextResponse.json(
    messages.reverse().map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      username: row.user.username,
    })),
  );
}
