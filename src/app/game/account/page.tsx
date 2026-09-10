import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { AccountClient } from "./account-client";

export const metadata = {
  title: "Account",
};

export default async function AccountPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  return <AccountClient initialPlayer={player} />;
}
