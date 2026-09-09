"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { AuthError, AuthShell, DemoHint } from "@/components/auth/auth-shell";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, null);

  return (
    <AuthShell
      title="Nieuw in de stad"
      description="Kies een naam en een wachtwoord. Je start als Schooier in Amsterdam (Schiphol) met €500 cash."
      footer={
        <>
          Al een account?{" "}
          <Link href="/inloggen" className="text-primary hover:underline">
            Inloggen
          </Link>
        </>
      }
    >
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
        <DemoHint />
      </form>
    </AuthShell>
  );
}
