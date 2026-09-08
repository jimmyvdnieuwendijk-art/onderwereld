import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { HospitalClient } from "./hospital-client";

export default async function HospitalPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  return <HospitalClient initialPlayer={player} />;
}
