import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CHAT_CHANNEL_FAMILY } from "@/lib/constants";
import { createChatMessage, listChatMessages, parseChatChannel } from "@/lib/game/chat";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const channel = parseChatChannel(new URL(request.url).searchParams.get("channel"));
  if (!channel) {
    return NextResponse.json({ error: "Onbekend kanaal" }, { status: 400 });
  }

  let familyId: string | null = null;
  if (channel === CHAT_CHANNEL_FAMILY) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { familyId: true },
    });
    if (!me?.familyId) {
      return NextResponse.json({ messages: [], family: false });
    }
    familyId = me.familyId;
  }

  const messages = await listChatMessages(channel, familyId);
  return NextResponse.json({ messages, family: channel === CHAT_CHANNEL_FAMILY });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Niet ingelogd" }, { status: 401 });
  }

  const form = await request.formData();
  const result = await createChatMessage(
    session.user.id,
    String(form.get("channel") ?? ""),
    String(form.get("body") ?? ""),
    form.get("image") instanceof File ? (form.get("image") as File) : null,
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.message, variant: result.variant ?? "error" },
      { status: result.variant === "warning" ? 429 : 400 },
    );
  }

  return NextResponse.json({ ok: true, message: result.message, line: result.data });
}
