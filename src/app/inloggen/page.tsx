"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-primary/15 bg-card/85">
        <CardHeader>
          <p className="font-heading text-sm tracking-[0.25em] text-primary">ONDERWERELD</p>
          <CardTitle className="font-heading text-2xl">Inloggen</CardTitle>
          <CardDescription>Betreed de straat. Kies je naam. Houd je mond.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
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
            {state && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
            <button type="submit" className={cn(buttonVariants(), "w-full")} disabled={pending}>
              {pending ? "Bezig…" : "Naar binnen"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Nog geen crimineel?{" "}
            <Link href="/registreren" className="text-primary hover:underline">
              Registreer
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
