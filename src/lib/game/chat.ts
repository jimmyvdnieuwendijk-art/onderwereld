import { prisma } from "@/lib/prisma";
import { chatImagePath, readAvatarFile } from "@/lib/avatar";
import {
  CHAT_BODY_MAX,
  CHAT_BURST_MAX,
  CHAT_BURST_WINDOW_MS,
  CHAT_CHANNEL_FAMILY,
  CHAT_CHANNEL_WORLD,
  CHAT_IMAGE_MAX_BYTES,
  CHAT_KEEP,
  CHAT_PAGE_SIZE,
  CHAT_RATE_MS,
  ONLINE_WINDOW_MS,
} from "@/lib/constants";
import { publicDisplayName } from "@/lib/game/public-player";
import { normalizeNameColor } from "@/lib/player-name";
import { fail, ok } from "@/lib/actions/helpers";
import type { ActionResult } from "@/types/game";

export type ChatChannel = typeof CHAT_CHANNEL_WORLD | typeof CHAT_CHANNEL_FAMILY;

export type ChatLine = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  username: string;
  displayName: string;
  selectedTitle: string | null;
  selectedNameColor: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
};

const chatUserSelect = {
  username: true,
  displayName: true,
  avatarUrl: true,
  hideOnline: true,
  lastSeenAt: true,
  selectedTitle: true,
  selectedNameColor: true,
} as const;

type ChatUser = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  hideOnline: boolean;
  lastSeenAt: Date | null;
  selectedTitle: string | null;
  selectedNameColor: string | null;
};

export function parseChatChannel(raw: string | null | undefined): ChatChannel | null {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === CHAT_CHANNEL_WORLD || value === "WERELD") return CHAT_CHANNEL_WORLD;
  if (value === CHAT_CHANNEL_FAMILY || value === "FAMILIE") return CHAT_CHANNEL_FAMILY;
  return null;
}

export function cleanChatBody(raw: string) {
  return raw.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim().slice(0, CHAT_BODY_MAX);
}

function toChatLine(
  row: { id: string; body: string; imageUrl: string | null; createdAt: Date },
  user: ChatUser,
  now = Date.now(),
): ChatLine {
  const seen = user.lastSeenAt?.getTime() ?? 0;
  return {
    id: row.id,
    body: row.body,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
    username: user.username,
    displayName: publicDisplayName(user),
    selectedTitle: user.selectedTitle?.trim() || null,
    selectedNameColor: normalizeNameColor(user.selectedNameColor),
    avatarUrl: user.avatarUrl,
    isOnline: !user.hideOnline && seen > 0 && now - seen <= ONLINE_WINDOW_MS,
  };
}

export async function listChatMessages(channel: ChatChannel, familyId: string | null): Promise<ChatLine[]> {
  const where =
    channel === CHAT_CHANNEL_FAMILY
      ? { channel: CHAT_CHANNEL_FAMILY, familyId: familyId ?? "__none__" }
      : { channel: CHAT_CHANNEL_WORLD };

  const rows = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: CHAT_PAGE_SIZE,
    select: {
      id: true,
      body: true,
      imageUrl: true,
      createdAt: true,
      user: { select: chatUserSelect },
    },
  });

  const now = Date.now();
  return rows.reverse().map((row) => toChatLine(row, row.user, now));
}

export async function pruneChat(channel: ChatChannel, familyId: string | null) {
  const where =
    channel === CHAT_CHANNEL_FAMILY
      ? { channel: CHAT_CHANNEL_FAMILY, familyId: familyId ?? undefined }
      : { channel: CHAT_CHANNEL_WORLD };
  const extra = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: CHAT_KEEP,
    select: { id: true },
  });
  if (extra.length === 0) return;
  await prisma.chatMessage.deleteMany({ where: { id: { in: extra.map((row) => row.id) } } });
}

export function publicChatImageUrl(imageId: string, createdAt: Date) {
  return chatImagePath(imageId, createdAt);
}

export async function createChatMessage(
  userId: string,
  channelRaw: string,
  bodyRaw: string,
  file?: File | null,
): Promise<ActionResult<ChatLine>> {
  const channel = parseChatChannel(channelRaw);
  if (!channel) return fail("Onbekend chatkanaal.");

  const body = cleanChatBody(bodyRaw);
  const hasFile = Boolean(file && file.size > 0);
  if (!hasFile && body.length < 1) return fail("Typ een bericht of stuur een screenshot.");
  if (hasFile && file && file.size > CHAT_IMAGE_MAX_BYTES) {
    return fail("De afbeelding is te groot (max. 1 MB).");
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      familyId: true,
      lastChatAt: true,
      chatBurstCount: true,
      chatBurstAt: true,
      ...chatUserSelect,
    },
  });
  if (!me) return fail("Speler niet gevonden.");

  const familyId = channel === CHAT_CHANNEL_FAMILY ? me.familyId : null;
  if (channel === CHAT_CHANNEL_FAMILY && !familyId) {
    return fail("Familiechat is alleen voor leden. Join eerst een familie.");
  }

  const now = Date.now();
  if (me.lastChatAt && now - me.lastChatAt.getTime() < CHAT_RATE_MS) {
    return fail("Te snel. Wacht even.", "warning");
  }
  const burstFresh =
    !me.chatBurstAt || now - me.chatBurstAt.getTime() > CHAT_BURST_WINDOW_MS;
  const burstCount = burstFresh ? 0 : me.chatBurstCount;
  if (burstCount >= CHAT_BURST_MAX) {
    return fail("Te veel berichten achter elkaar. Adem in.", "warning");
  }

  let image: { bytes: Uint8Array; mimeType: string } | null = null;
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
      select: { id: true, body: true, imageUrl: true, createdAt: true },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        lastChatAt: new Date(now),
        chatBurstCount: burstCount + 1,
        chatBurstAt: burstFresh ? new Date(now) : me.chatBurstAt,
      },
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
    return tx.chatMessage.update({
      where: { id: message.id },
      data: { imageUrl },
      select: { id: true, body: true, imageUrl: true, createdAt: true },
    });
  });

  void pruneChat(channel, familyId).catch(() => undefined);
  const line = toChatLine(created, me, now);
  return ok(
    channel === CHAT_CHANNEL_WORLD ? "De straat hoort je." : "De family hoort je.",
    "success",
    line,
  );
}
