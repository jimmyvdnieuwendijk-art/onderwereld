"use server";

import { prisma } from "@/lib/prisma";
import { readAvatarFile } from "@/lib/avatar";
import {
  CHAT_BODY_MAX,
  CHAT_BURST_MAX,
  CHAT_BURST_WINDOW_MS,
  CHAT_CHANNEL_FAMILY,
  CHAT_CHANNEL_WORLD,
  CHAT_IMAGE_MAX_BYTES,
  CHAT_RATE_MS,
} from "@/lib/constants";
import { fail, ok, requireUserId } from "@/lib/actions/helpers";
import { parseChatChannel, pruneChat, publicChatImageUrl } from "@/lib/game/chat";
import type { ActionResult } from "@/types/game";

function cleanBody(raw: string) {
  return raw.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim().slice(0, CHAT_BODY_MAX);
}

export async function postChat(
  channelRaw: string,
  bodyRaw: string,
  file?: File | null,
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");

  const channel = parseChatChannel(channelRaw);
  if (!channel) return fail("Onbekend chatkanaal.");

  const body = cleanBody(bodyRaw);
  const hasFile = Boolean(file && file.size > 0);
  if (!hasFile && body.length < 1) return fail("Typ een bericht of stuur een screenshot.");
  if (hasFile && file && file.size > CHAT_IMAGE_MAX_BYTES) {
    return fail("De afbeelding is te groot (max. 1 MB).");
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, familyId: true },
  });
  if (!me) return fail("Speler niet gevonden.");

  const familyId = channel === CHAT_CHANNEL_FAMILY ? me.familyId : null;
  if (channel === CHAT_CHANNEL_FAMILY && !familyId) {
    return fail("Familiechat is alleen voor leden. Join eerst een familie.");
  }

  const [last, burst] = await Promise.all([
    prisma.chatMessage.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.chatMessage.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - CHAT_BURST_WINDOW_MS) } },
    }),
  ]);
  if (last && Date.now() - last.createdAt.getTime() < CHAT_RATE_MS) {
    return fail("Te snel. Wacht een paar seconden.", "warning");
  }
  if (burst >= CHAT_BURST_MAX) {
    return fail("Te veel berichten achter elkaar. Adem in.", "warning");
  }

  let image:
    | { bytes: Uint8Array; mimeType: string }
    | null = null;
  if (hasFile && file) {
    const parsed = await readAvatarFile(file);
    if (!parsed.ok) return fail(parsed.message);
    image = { bytes: parsed.bytes, mimeType: parsed.mimeType };
  }

  const created = await prisma.$transaction(async (tx) => {
    const message = await tx.chatMessage.create({
      data: {
        channel,
        familyId,
        userId,
        body,
      },
      select: { id: true, createdAt: true },
    });
    if (!image) return message;

    const stored = await tx.chatImage.create({
      data: {
        messageId: message.id,
        userId,
        mimeType: image.mimeType,
        bytes: Buffer.from(image.bytes),
      },
      select: { id: true },
    });
    const imageUrl = publicChatImageUrl(stored.id, message.createdAt);
    await tx.chatMessage.update({
      where: { id: message.id },
      data: { imageUrl },
    });
    return message;
  });

  void pruneChat(channel, familyId).catch(() => undefined);
  return ok(channel === CHAT_CHANNEL_WORLD ? "De straat hoort je." : "De family hoort je.", "success", {
    id: created.id,
  });
}

export async function postChatForm(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const file = formData.get("image");
  return postChat(
    String(formData.get("channel") ?? CHAT_CHANNEL_WORLD),
    String(formData.get("body") ?? ""),
    file instanceof File ? file : null,
  );
}
