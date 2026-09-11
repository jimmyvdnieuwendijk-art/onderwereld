"use client";

import { bookFlightForm } from "@/lib/actions/travel";
import { AIRPORTS, CUSTOMS_WANTED_THRESHOLD, flightQuote } from "@/lib/airports";
import { formatClock, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLivePlayer } from "@/hooks/use-player";
import { Countdown } from "@/components/game/countdown";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import { airportArt } from "@/lib/game-art";
import { CardArt } from "@/components/game/card-art";
import type { PlayerSnapshot } from "@/types/game";
import { cn } from "@/lib/utils";

export function AirportClient({ initialPlayer }: { initialPlayer?: PlayerSnapshot }) {
  const p = useLivePlayer(initialPlayer)!;
  const [flightState, flightAction, flying] = useFormAction(bookFlightForm);
  const inAir = p.isTraveling;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl">Vliegveld</h1>
        <p className="text-sm text-muted-foreground">
          Je staat op {p.currentAirport} in {p.currentCityName}. Boek een lijnvlucht of privéjet — verder niets.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">Gezocht {p.wantedLevel}/100</Badge>
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
            <Card key={row.id} className={cn("overflow-hidden", here && "border-primary/50 bg-primary/5")}>
              <CardHeader className="space-y-3">
                <CardArt src={airportArt(row.id)} alt="" />
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
                    <form action={flightAction} className="space-y-2">
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
    </div>
  );
}
