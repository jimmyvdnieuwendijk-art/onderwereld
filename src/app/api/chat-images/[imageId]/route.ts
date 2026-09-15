import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CHAT_CHANNEL_FAMILY } from "@/lib/constants";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { imageId } = await params;
  if (!imageId) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  const image = await prisma.chatImage.findUnique({
    where: { id: imageId },
    select: {
      bytes: true,
      mimeType: true,
      createdAt: true,
      message: { select: { channel: true, familyId: true } },
    },
  });
  if (!image) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  if (image.message.channel === CHAT_CHANNEL_FAMILY) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { familyId: true },
    });
    if (!me?.familyId || me.familyId !== image.message.familyId) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }
  }

  return new NextResponse(Buffer.from(image.bytes), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
      ETag: `"${image.createdAt.getTime()}"`,
    },
  });
}
