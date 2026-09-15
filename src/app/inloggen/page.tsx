import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { isFacebookConfigured } from "@/lib/auth/facebook-config";

export const metadata = {
  title: "Inloggen",
  description: "Log in op Onderwereld, de gratis browser MMORPG en Nederlandse maffia game.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm facebookEnabled={isFacebookConfigured()} />
    </Suspense>
  );
}
