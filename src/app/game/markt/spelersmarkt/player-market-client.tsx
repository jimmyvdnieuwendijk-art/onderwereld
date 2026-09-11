"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buyListing, cancelListing } from "@/lib/actions/economy";
import { formatMoney } from "@/lib/format";
import { listingLabel, unitAsk, type ListingDTO } from "@/lib/market";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameAction, useLivePlayer } from "@/hooks/use-player";

export function PlayerMarketClient({
  listings,
  userId,
}: {
  listings: ListingDTO[];
  userId: string;
}) {
  const player = useLivePlayer();
  const traveling = !!player?.isTraveling;
  const { run, pending } = useGameAction();
  const router = useRouter();
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl">Spelersmarkt</h1>
        <p className="text-sm text-muted-foreground">
          Voertuigen en winkelitems van andere spelers. Auto’s plaats je via je{" "}
          <Link href="/game/garage" className="text-primary underline">
            garage
          </Link>
          . Drugs, kisten en kogels staan op de{" "}
          <Link href="/game/markt/zwarte-markt" className="text-primary underline">
            Zwarte Markt
          </Link>
          .
        </p>
        {traveling && <p className="mt-2 text-sm text-destructive">Je zit in de lucht — kopen is gesloten.</p>}
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-heading text-xl">Geen P2P-aanbod</p>
          <p className="mt-2 text-sm text-muted-foreground">Zet een auto te koop in de garage of wacht op andere spelers.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {listings.map((row) => (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {listingLabel(row.type, row.quantity, row.vehicleName ?? row.itemName)}
                </CardTitle>
                <CardDescription>
                  {row.sellerName} · {formatMoney(row.price)}
                  {row.quantity > 1 ? ` · ${formatMoney(unitAsk(row.price, row.quantity))} per stuk` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {row.sellerId === userId ? (
                  <Button variant="outline" disabled={pending} onClick={() => run(() => cancelListing(row.id), refresh)}>
                    Intrekken
                  </Button>
                ) : (
                  <Button disabled={pending || traveling} onClick={() => run(() => buyListing(row.id), refresh)}>
                    {traveling ? "In de lucht" : "Kopen"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
