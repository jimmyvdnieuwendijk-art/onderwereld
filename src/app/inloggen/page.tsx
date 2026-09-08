"use client";

import { useState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await loginAction(formData);
    if (!result.ok) {
      setError(result.message);
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-primary/15 bg-card/85">
        <CardHeader>
          <p className="font-heading text-sm tracking-[0.25em] text-primary">ONDERWERELD</p>
          <CardTitle className="font-heading text-2xl">Inloggen</CardTitle>
          <CardDescription>Betreed de straat. Kies je naam. Houd je mond.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required placeholder="jij@onderwereld.nl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Bezig…" : "Naar binnen"}
            </Button>
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
