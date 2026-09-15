import { RegisterForm } from "./register-form";
import { isFacebookConfigured } from "@/lib/auth/facebook-config";

export const metadata = {
  title: "Registreren",
  description:
    "Maak een gebruikersnaam en start gratis in Onderwereld — browser MMORPG en online maffia game, geen download.",
};

export default function RegisterPage() {
  return <RegisterForm facebookEnabled={isFacebookConfigured()} />;
}
