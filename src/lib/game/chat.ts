import { prisma } from "@/lib/prisma";
import { chatImagePath } from "@/lib/avatar";
import {
  CHAT_CHANNEL_FAMILY,
  CHAT_CHANNEL_WORLD,
  CHAT_KEEP,
  CHAT_PAGE_SIZE,
  ONLINE_WINDOW_MS,
} from "@/lib/constants";
import { publicDisplayName } from "@/lib/game/public-player";

export type ChatChannel = typeof CHAT_CHANNEL_WORLD | typeof CHAT_CHANNEL_FAMILY;

export type ChatLine = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
};

export function parseChatChannel(raw: string | null | undefined): ChatChannel | null {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === CHAT_CHANNEL_WORLD || value === "WERELD") return CHAT_CHANNEL_WORLD;
  if (value === CHAT_CHANNEL_FAMILY || value === "FAMILIE") return CHAT_CHANNEL_FAMILY;
  return null;
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
      user: {
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
          hideOnline: true,
          lastSeenAt: true,
        },
      },
    },
  });

  const now = Date.now();
  return rows.reverse().map((row) => {
    const seen = row.user.lastSeenAt?.getTime() ?? 0;
    return {
      id: row.id,
      body: row.body,
      imageUrl: row.imageUrl,
      createdAt: row.createdAt.toISOString(),
      username: row.user.username,
      displayName: publicDisplayName(row.user),
      avatarUrl: row.user.avatarUrl,
      isOnline: !row.user.hideOnline && seen > 0 && now - seen <= ONLINE_WINDOW_MS,
    };
  });
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
