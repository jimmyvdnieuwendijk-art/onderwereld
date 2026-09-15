import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { CHAT_CHANNEL_FAMILY, CHAT_CHANNEL_WORLD } from "@/lib/constants";
import { listChatMessages } from "@/lib/game/chat";
import { ChatClient } from "./chat-client";

export const metadata = {
  title: "Chat",
};

export default async function ChatPage() {
  const userId = await requireUserIdOrRedirect();
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { familyId: true, family: { select: { name: true } } },
  });
  const familyId = me?.familyId ?? null;

  const [initialWorld, initialFamily] = await Promise.all([
    listChatMessages(CHAT_CHANNEL_WORLD, null),
    familyId ? listChatMessages(CHAT_CHANNEL_FAMILY, familyId) : Promise.resolve([]),
  ]);

  return (
    <ChatClient
      hasFamily={Boolean(familyId)}
      familyName={me?.family?.name ?? null}
      initialWorld={initialWorld}
      initialFamily={initialFamily}
    />
  );
}
