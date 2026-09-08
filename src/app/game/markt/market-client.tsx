"use client";

import { useState } from "react";
import { buyListing, cancelListing, createListing } from "@/lib/actions/economy";
import { LISTING_BULLETS } from "@/lib/constants";
import { SMUGGLE_GOODS, marketFor } from "@/lib/airports";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameAction } from "@/hooks/use-player";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Listing = {
  id: string;
  type: string;
  quantity: number;
  price: number;
  sellerId: string;
  seller: { username: string };
  vehicle: { vehicleType: { name: string } } | null;
  item: { name: string } | null;
};

export function MarketClient({
  listings,
  mine,
  userId,
  traveling,
  cityName,
  cityId,
}: {
  listings: Listing[];
  mine: Listing[];
  userId: string;
  traveling: boolean;
  cityName: string;
  cityId: string;
}) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const [qty, setQty] = useState("20");
  const [price, setPrice] = useState("400");
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };

  function label(row: Listing) {
    if (row.type === "BULLETS") return `${row.quantity} kogels`;
    if (row.vehicle) return row.vehicle.vehicleType.name;
    return row.item?.name ?? "Item";
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl">Zwarte markt</h1>
      <p className="text-sm text-muted-foreground">
        Prijzen voor drugs, wapenkisten en kogels hangen af van je stad ({cityName}). Handel op het{" "}
        <Link href="/game/vliegveld" className="text-primary underline">
          vliegveld
        </Link>
        . {traveling ? "Je zit in het vliegtuig — kopen en verkopen zijn gesloten." : ""}
      </p>
      <CityPrices cityId={cityId} cityName={cityName} />
      <Card>
        <CardHeader>
          <CardTitle>Kogels verkopen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="w-28" />
          <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className="w-32" />
          <Button
            disabled={pending || traveling}
            onClick={() =>
              run(
                () =>
                  createListing({
                    type: LISTING_BULLETS,
                    quantity: Number(qty),
                    price: Number(price),
                  }),
                refresh,
              )
            }
          >
            Plaatsen
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {listings.length === 0 && <p className="text-muted-foreground">Geen actieve advertenties.</p>}
        {listings.map((row) => (
          <Card key={row.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <div>
                <p className="font-medium">{label(row)}</p>
                <p className="text-sm text-muted-foreground">
                  {row.seller.username} · {formatMoney(row.price)}
                </p>
              </div>
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

      {mine.length > 0 && (
        <p className="text-xs text-muted-foreground">{mine.length} van jouw advertenties staan live.</p>
      )}
    </div>
  );
}

function CityPrices({ cityId, cityName }: { cityId: string; cityName: string }) {
  const market = marketFor(cityId);
  const rows = SMUGGLE_GOODS.map((good) => {
    const buy = good.id === "drugs" ? market.drugsBuy : good.id === "weapons" ? market.weaponsBuy : market.bulletsBuy;
    const sell = good.id === "drugs" ? market.drugsSell : good.id === "weapons" ? market.weaponsSell : market.bulletsSell;
    return { ...good, buy, sell };
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Straatprijzen in {cityName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.map((row) => (
          <p key={row.id}>
            <span className="font-medium">{row.label}:</span> koop {formatMoney(row.buy)} · verkoop {formatMoney(row.sell)}
            <span className="block text-xs text-muted-foreground">{row.hint}</span>
          </p>
        ))}
        <p className="text-xs text-muted-foreground">Kopen en verkopen doe je op het vliegveld.</p>
      </CardContent>
    </Card>
  );
}
