import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { jailOccupantWhere } from "@/lib/hospital";
import { redirect } from "next/navigation";
import { JailClient } from "./jail-client";

export default async function JailPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const occupantCount = await prisma.user.count({ where: jailOccupantWhere() });
  return <JailClient initialPlayer={player} occupantCount={occupantCount} />;
}
