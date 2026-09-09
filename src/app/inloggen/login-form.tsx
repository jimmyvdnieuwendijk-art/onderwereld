"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { AuthError, AuthShell, DemoHint } from "@/components/auth/auth-shell";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/game";

  return (
    <AuthShell
      title="Inloggen"
      description="Betreed de straat. Kies je naam. Houd je mond."
      footer={
        <>
          Nog geen crimineel?{" "}
          <Link href="/registreren" className="text-primary hover:underline">
            Registreer
          </Link>
        </>
      }
    >
      <form action={action} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue="demo@onderwereld.nl"
            placeholder="jij@onderwereld.nl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Wachtwoord</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            defaultValue="demo1234"
          />
        </div>
        <AuthError message={state && !state.ok ? state.message : undefined} />
        <button type="submit" className={cn(buttonVariants(), "w-full")} disabled={pending}>
          {pending ? "Deur gaat open…" : "Naar binnen"}
        </button>
        <DemoHint />
      </form>
    </AuthShell>
  );
}
