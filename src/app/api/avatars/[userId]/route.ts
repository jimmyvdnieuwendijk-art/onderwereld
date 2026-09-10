import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  const avatar = await prisma.userAvatar.findUnique({
    where: { userId },
    select: { bytes: true, mimeType: true, updatedAt: true },
  });
  if (!avatar) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(avatar.bytes), {
    headers: {
      "Content-Type": avatar.mimeType,
      "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
      ETag: `"${avatar.updatedAt.getTime()}"`,
    },
  });
}
