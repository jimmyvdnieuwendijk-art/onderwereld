import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ familyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { familyId } = await params;
  if (!familyId) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  const banner = await prisma.familyBanner.findUnique({
    where: { familyId },
    select: { bytes: true, mimeType: true, updatedAt: true },
  });
  if (!banner) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(banner.bytes), {
    headers: {
      "Content-Type": banner.mimeType,
      "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
      ETag: `"${banner.updatedAt.getTime()}"`,
    },
  });
}
