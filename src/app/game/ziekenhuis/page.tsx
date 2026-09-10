import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { hospitalOccupantWhere } from "@/lib/hospital";
import { redirect } from "next/navigation";
import { HospitalClient } from "./hospital-client";

export default async function HospitalPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const occupantCount = await prisma.user.count({ where: hospitalOccupantWhere() });
  return <HospitalClient initialPlayer={player} occupantCount={occupantCount} />;
}
