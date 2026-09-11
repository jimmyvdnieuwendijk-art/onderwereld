"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Pill, Crosshair } from "lucide-react";
import { smuggleTrade } from "@/lib/actions/economy";
import {
  AIRPORTS,
  SMUGGLE_GOODS,
  cityPriceRank,
  goodStock,
  smugglePrice,
  spreadPct,
  type SmuggleGood,
} from "@/lib/airports";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QtyShortcuts } from "@/components/game/qty-shortcuts";
import { useGameAction, useLivePlayer } from "@/hooks/use-player";
import type { PlayerSnapshot } from "@/types/game";
import { cn } from "@/lib/utils";

const ICONS: Record<SmuggleGood, typeof Pill> = {
  drugs: Pill,
  weapons: Package,
  bullets: Crosshair,
};

export function SmokkelClient({ initialPlayer }: { initialPlayer?: PlayerSnapshot }) {
  const p = useLivePlayer(initialPlayer)!;
  const { run, pending } = useGameAction();
  const router = useRouter();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState<Record<SmuggleGood, number>>({ drugs: 1, weapons: 1, bullets: 1 });
  const inAir = p.isTraveling;

  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl">Smokkelmarkt</h1>
        <p className="text-sm text-muted-foreground">
          Dealer in {p.currentCityName}. Prijzen zijn lokaal — vlieg voor arbitrage, handel hier.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{p.currentCityName}</Badge>
          <Badge variant="outline">{p.drugs} drugs</Badge>
          <Badge variant="outline">{p.weaponCrates} wapenkisten</Badge>
          <Badge variant="outline">{p.bullets} kogels</Badge>
        </div>
        {inAir && (
          <p className="mt-2 text-sm text-destructive">Je zit in de lucht. De toonbank is dicht tot je landt.</p>
        )}
      </div>

      <Tabs value={side} onValueChange={(value) => setSide(value as "buy" | "sell")}>
        <TabsList>
          <TabsTrigger value="buy">Kopen</TabsTrigger>
          <TabsTrigger value="sell">Verkopen</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-3 md:grid-cols-3">
        {SMUGGLE_GOODS.map((good) => {
          const Icon = ICONS[good.id];
          const buy = smugglePrice(p.currentCity, good.id, "buy");
          const sell = smugglePrice(p.currentCity, good.id, "sell");
          const unit = side === "buy" ? buy : sell;
          const have = goodStock(p, good.id);
          const maxBuy = Math.min(200, Math.floor(p.cash / Math.max(1, buy)));
          const maxSell = Math.min(200, have);
          const max = side === "buy" ? Math.max(1, maxBuy) : Math.max(1, maxSell);
          const n = Math.min(max, Math.max(1, qty[good.id] || 1));
          const total = n * unit;
          const { cheapest, dearest } = cityPriceRank(good.id, "buy");
          return (
            <Card key={good.id} className="border-border/60 bg-zinc-950/60">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Icon className="size-4 text-primary" />
                  {good.label}
                </CardTitle>
                <CardDescription>{good.hint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  Koop {formatMoney(buy)} · Verkoop {formatMoney(sell)}
                  <span className="ml-1 text-xs text-muted-foreground">({spreadPct(buy, sell)}% spread)</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={cheapest.id === p.currentCity ? "default" : "outline"} className="text-[10px]">
                    {cheapest.city} goedkoop
                  </Badge>
                  <Badge variant={dearest.id === p.currentCity ? "destructive" : "outline"} className="text-[10px]">
                    {dearest.city} duur
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Voorraad: {have}</p>
                <QtyShortcuts
                  max={max}
                  disabled={pending || inAir || (side === "sell" && have < 1) || (side === "buy" && maxBuy < 1)}
                  onPick={(value) => setQty((s) => ({ ...s, [good.id]: value }))}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={max}
                    value={n}
                    onChange={(e) => setQty((s) => ({ ...s, [good.id]: Number(e.target.value) || 1 }))}
                    className="w-24"
                  />
                  <p className="text-xs text-muted-foreground">
                    {n} × {formatMoney(unit)} ={" "}
                    <span className="font-medium text-foreground">{formatMoney(total)}</span>
                  </p>
                </div>
                <Button
                  disabled={pending || inAir || (side === "sell" && have < n) || (side === "buy" && p.cash < total)}
                  onClick={() => run(() => smuggleTrade(good.id, side, n), refresh)}
                >
                  {side === "buy" ? "Kopen" : "Verkopen"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CityBoard cityId={p.currentCity} />
    </div>
  );
}

function CityBoard({ cityId }: { cityId: string }) {
  const [good, setGood] = useState<SmuggleGood>("drugs");
  const rows = useMemo(
    () =>
      AIRPORTS.map((row) => ({
        ...row,
        buy: smugglePrice(row.id, good, "buy"),
        sell: smugglePrice(row.id, good, "sell"),
      })),
    [good],
  );
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="font-heading">Prijzen per stad</CardTitle>
        <CardDescription>Vergelijk voordat je vliegt. Handel blijft in je huidige stad.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={good} onValueChange={(value) => setGood(value as SmuggleGood)}>
          <TabsList>
            {SMUGGLE_GOODS.map((row) => (
              <TabsTrigger key={row.id} value={row.id}>
                {row.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Stad</th>
                <th className="py-2 pr-3 font-medium">Koop</th>
                <th className="py-2 font-medium">Verkoop</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn("border-b border-border/30", row.id === cityId && "bg-primary/10")}
                >
                  <td className="py-1.5 pr-3">
                    {row.city}
                    {row.id === cityId ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">hier</span>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums">{formatMoney(row.buy)}</td>
                  <td className="py-1.5 tabular-nums">{formatMoney(row.sell)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
