import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/actions/helpers";
import { CHAT_CHANNEL_FAMILY, CHAT_CHANNEL_WORLD } from "@/lib/constants";
import { listChatMessages } from "@/lib/game/chat";
import { ChatClient } from "./chat-client";

export const metadata = {
  title: "Chat",
};

export default async function ChatPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const familyId = player.family?.id ?? null;

  const [initialWorld, initialFamily] = await Promise.all([
    listChatMessages(CHAT_CHANNEL_WORLD, null),
    familyId ? listChatMessages(CHAT_CHANNEL_FAMILY, familyId) : Promise.resolve([]),
  ]);

  return (
    <ChatClient
      initialPlayer={player}
      hasFamily={Boolean(familyId)}
      familyName={player.family?.name ?? null}
      initialWorld={initialWorld}
      initialFamily={initialFamily}
    />
  );
}
