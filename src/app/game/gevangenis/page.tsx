import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { JailClient } from "./jail-client";

export default async function JailPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  return <JailClient initialPlayer={player} />;
}
