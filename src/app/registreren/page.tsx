"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/actions/auth";
import { CITIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("Amsterdam");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await registerAction({ email, password, confirm, username, city });
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
          <CardTitle className="font-heading text-2xl">Nieuw in de stad</CardTitle>
          <CardDescription>
            Kies een naam, een stad en een wachtwoord. Je start als Schooier met €500 cash.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Gebruikersnaam</Label>
              <Input
                id="username"
                name="username"
                required
                minLength={3}
                maxLength={16}
                placeholder="DonDemo"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Startstad</Label>
              <select
                id="city"
                name="city"
                className="h-8 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              >
                {CITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Bezig…" : "Treed toe"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Al een account?{" "}
            <Link href="/inloggen" className="text-primary hover:underline">
              Inloggen
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
