import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UsernameForm } from "./username-form";

export const metadata = {
  title: "Gebruikersnaam",
  description: "Kies je straatnaam in Onderwereld.",
};

export default async function UsernamePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/inloggen");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, usernameChosen: true },
  });
  if (!user) redirect("/registreren");
  if (user.usernameChosen) redirect("/game");

  return <UsernameForm suggested={user.username} />;
}
