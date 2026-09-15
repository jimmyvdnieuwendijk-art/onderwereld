"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { AuthError, AuthShell } from "@/components/auth/auth-shell";
import { AuthMethodDivider, FacebookAuthButton } from "@/components/auth/facebook-button";
import { cn } from "@/lib/utils";

export function RegisterForm({ facebookEnabled }: { facebookEnabled: boolean }) {
  const [state, action, pending] = useActionState(registerAction, null);

  return (
    <AuthShell
      title="Maak een gebruikersnaam"
      description="Kies een straatnaam of kom binnen met Facebook. Je start als Scum in Amsterdam (Schiphol) met €500 cash."
      footer={
        <>
          Al een account?{" "}
          <Link href="/inloggen" className="text-primary hover:underline">
            Inloggen
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <FacebookAuthButton enabled={facebookEnabled} label="Registreren met Facebook" />
        <AuthMethodDivider />
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Gebruikersnaam</Label>
            <Input id="username" name="username" required minLength={3} maxLength={16} placeholder="DonDemo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Wachtwoord</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Bevestig wachtwoord</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <AuthError message={state && !state.ok ? state.message : undefined} />
          <button type="submit" className={cn(buttonVariants(), "w-full")} disabled={pending}>
            {pending ? "Naam wordt gezet…" : "Treed toe"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
