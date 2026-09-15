import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listAchievementBoard } from "@/lib/achievements";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const board = await listAchievementBoard(session.user.id);
  if (!board) return NextResponse.json({ error: "Speler niet gevonden" }, { status: 404 });
  return NextResponse.json(board);
}
