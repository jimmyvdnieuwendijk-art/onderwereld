"use server";

import { CHAT_CHANNEL_WORLD } from "@/lib/constants";
import { fail, requireUserId } from "@/lib/actions/helpers";
import { createChatMessage } from "@/lib/game/chat";
import type { ActionResult } from "@/types/game";
import type { ChatLine } from "@/lib/game/chat";

export async function postChat(
  channelRaw: string,
  bodyRaw: string,
  file?: File | null,
): Promise<ActionResult<ChatLine>> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  return createChatMessage(userId, channelRaw, bodyRaw, file);
}

export async function postChatForm(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<ChatLine>> {
  const file = formData.get("image");
  return postChat(
    String(formData.get("channel") ?? CHAT_CHANNEL_WORLD),
    String(formData.get("body") ?? ""),
    file instanceof File ? file : null,
  );
}
