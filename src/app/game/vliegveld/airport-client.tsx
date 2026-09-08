"use client";

import { bookFlightForm, smuggleTradeForm } from "@/lib/actions/travel";
import { AIRPORTS, CUSTOMS_WANTED_THRESHOLD, SMUGGLE_GOODS, flightQuote, marketFor } from "@/lib/airports";
import { formatClock, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePlayer } from "@/hooks/use-player";
import { Countdown } from "@/components/game/countdown";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import type { PlayerSnapshot } from "@/types/game";
import { cn } from "@/lib/utils";

export function AirportClient({ initialPlayer }: { initialPlayer: PlayerSnapshot }) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const [flightState, flightAction, flying] = useFormAction(bookFlightForm);
  const [tradeState, tradeAction, trading] = useFormAction(smuggleTradeForm);
  const market = marketFor(p.currentCity);
  const inAir = p.isTraveling;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl">Vliegveld</h1>
        <p className="text-sm text-muted-foreground">
          Je staat op {p.currentAirport} in {p.currentCityName}.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">Gezocht {p.wantedLevel}/100</Badge>
          <Badge variant="outline">{p.drugs} drugs</Badge>
          <Badge variant="outline">{p.weaponCrates} wapenkisten</Badge>
          <Badge variant="outline">{p.bullets} kogels</Badge>
        </div>
        {p.wantedLevel > CUSTOMS_WANTED_THRESHOLD && (
          <p className="mt-2 text-sm text-destructive">
            Je staat op de douanelijst. 35% kans op arrestatie bij vertrek — ticketgeld kwijt, 3 minuten cel.
          </p>
        )}
        {inAir && p.travelEndAt && (
          <p className="mt-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
            Vlucht naar {p.travelDestinationName} bezig… Resterende tijd:{" "}
            <Countdown until={p.travelEndAt} clock />
          </p>
        )}
        <div className="mt-2">
          <ActionFeedback state={flightState} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {AIRPORTS.map((row) => {
          const here = row.id === p.currentCity;
          const quote = flightQuote(p.currentCity, row.id, false);
          const jetQuote = flightQuote(p.currentCity, row.id, true);
          return (
            <Card key={row.id} className={cn(here && "border-primary/50 bg-primary/5")}>
              <CardHeader>
                <CardTitle className="font-heading flex items-center justify-between gap-2">
                  {row.city}
                  {here && <Badge>Je bent hier</Badge>}
                </CardTitle>
                <CardDescription>
                  {row.airport} · {row.country}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {here ? (
                  <p className="text-muted-foreground">Dit is je huidige standplaats.</p>
                ) : (
                  <>
                    <p>
                      Lijnvlucht {formatMoney(quote.cost)} · {formatClock(quote.seconds * 1000)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Privéjet {formatMoney(jetQuote.cost)} · {formatClock(jetQuote.seconds * 1000)} (3× prijs, helft
                      tijd)
                    </p>
                    <form action={flightAction} method="post" className="space-y-2">
                      <input type="hidden" name="destinationId" value={row.id} />
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" name="privateJet" value="1" />
                        Privéjet
                      </label>
                      <Button type="submit" disabled={flying || inAir}>
                        {inAir ? "Al onderweg" : "Boek vlucht"}
                      </Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Smokkelmarkt — {p.currentCityName}</CardTitle>
          <CardDescription>
            Prijzen verschillen per stad. Medellín is goedkoop in drugs, Tokyo duur. Miami dumpt kogels. Handel in de
            lucht is verboden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ActionFeedback state={tradeState} />
          {SMUGGLE_GOODS.map((good) => {
            const buy =
              good.id === "drugs" ? market.drugsBuy : good.id === "weapons" ? market.weaponsBuy : market.bulletsBuy;
            const sell =
              good.id === "drugs" ? market.drugsSell : good.id === "weapons" ? market.weaponsSell : market.bulletsSell;
            const have = good.id === "drugs" ? p.drugs : good.id === "weapons" ? p.weaponCrates : p.bullets;
            return (
              <div key={good.id} className="rounded-lg border border-border/60 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{good.label}</p>
                  <p className="text-xs text-muted-foreground">Voorraad: {have}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{good.hint}</p>
                <p className="mt-1 text-sm">
                  Koop {formatMoney(buy)} · Verkoop {formatMoney(sell)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={tradeAction} method="post" className="flex gap-2">
                    <input type="hidden" name="good" value={good.id} />
                    <input type="hidden" name="side" value="buy" />
                    <Input type="number" name="quantity" min={1} max={200} defaultValue={1} className="w-20" />
                    <Button type="submit" size="sm" disabled={trading || inAir}>
                      Kopen
                    </Button>
                  </form>
                  <form action={tradeAction} method="post" className="flex gap-2">
                    <input type="hidden" name="good" value={good.id} />
                    <input type="hidden" name="side" value="sell" />
                    <Input type="number" name="quantity" min={1} max={200} defaultValue={1} className="w-20" />
                    <Button type="submit" size="sm" variant="outline" disabled={trading || inAir || have < 1}>
                      Verkopen
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
