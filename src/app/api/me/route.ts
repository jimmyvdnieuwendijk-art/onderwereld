import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/actions/helpers";
import { tickPlayer } from "@/lib/game/player";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const player = await tickPlayer(userId, { economy: true });
  if (!player) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  return NextResponse.json(player);
}
