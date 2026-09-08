import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crosshair, Landmark, Skull, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-4 py-4 md:px-10">
        <p className="font-heading text-lg tracking-[0.2em] text-primary">ONDERWERELD</p>
        <div className="flex gap-2">
          <Link href="/inloggen" className={cn(buttonVariants({ variant: "ghost" }))}>
            Inloggen
          </Link>
          <Link href="/registreren" className={cn(buttonVariants())}>
            Spelen
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-primary/80">
            Misdaad · Macht · Verraad
          </p>
          <h1 className="font-heading text-4xl leading-tight text-balance md:text-6xl">
            De straten van de Lage Landen zijn van niemand.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Een browser-MMORPG in de geest van klassieke Nederlandse maffiaspellen.
            Steel, schiet, spaar en sticht een familie — of eindig in de cel.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/registreren" className={cn(buttonVariants({ size: "lg" }))}>
              Maak een crimineel
            </Link>
            <Link href="/inloggen" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
              Ik heb al een naam
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Demo: <span className="text-foreground">demo@onderwereld.nl</span> /{" "}
            <span className="text-foreground">demo1234</span>
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Skull,
              title: "Misdaden",
              text: "Van zakkenroller tot ministerieel konvooi. Energie, kans en celrisico.",
            },
            {
              icon: Landmark,
              title: "Economie",
              text: "Bank je cash, koop wapens, handel kogels en auto's op de markt.",
            },
            {
              icon: Crosshair,
              title: "PvP",
              text: "Zoek rivalen, vuurkogels, stuur ze naar het ziekenhuis.",
            },
            {
              icon: Users,
              title: "Families",
              text: "Sticht een huis, doneer aan de kas, regeer je stad.",
            },
          ].map((item) => (
            <Card key={item.title} className="border-primary/10 bg-card/70">
              <CardHeader>
                <item.icon className="size-5 text-primary" />
                <CardTitle className="font-heading">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">{item.text}</CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/50 px-4 py-6 text-center text-xs text-muted-foreground">
        Onderwereld — tekststrategie, geen echt geweld. Speel verantwoord.
      </footer>
    </div>
  );
}
