import Link from "next/link";
import { Scale, Skull, Store, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const HUB = [
  {
    href: "/game/markt/smokkelmarkt",
    title: "Smokkelmarkt",
    hint: "Straatprijzen per stad. Koop en verkoop drugs, wapenkisten en kogels bij de dealer in jouw stad.",
    icon: Skull,
  },
  {
    href: "/game/markt/zwarte-markt",
    title: "Zwarte Markt",
    hint: "Luxe ondergrondse balie: snelle handel, spelersadvertenties, geschiedenis en prijsalerts.",
    icon: Scale,
  },
  {
    href: "/game/markt/spelersmarkt",
    title: "Spelersmarkt",
    hint: "P2P voor voertuigen en winkelitems. Auto’s zet je te koop vanuit je garage.",
    icon: Users,
  },
] as const;

export default function MarktHubPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#d4a359]/80">Economie</p>
        <h1 className="font-heading text-3xl text-[#d4a359]">Markt</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Handel zit hier — niet op het vliegveld. Kies een vloer.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {HUB.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} prefetch>
              <Card className="h-full border-[#d4a359]/25 bg-[#1a1510] transition-colors hover:border-[#d4a359]/55">
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2 text-[#d4a359]">
                    <Icon className="size-4" />
                    {item.title}
                  </CardTitle>
                  <CardDescription>{item.hint}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-[#d4a359]/80">Openen →</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Store className="size-3.5" />
        Prijzen volgen je huidige stad (standaard Amsterdam).
      </p>
    </div>
  );
}
