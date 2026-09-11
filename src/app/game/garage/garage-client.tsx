"use client";

import { repairVehicle, sellVehicle } from "@/lib/actions/garage";
import { createListing } from "@/lib/actions/economy";
import { LISTING_VEHICLE } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useGameAction } from "@/hooks/use-player";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { vehicleArt } from "@/lib/game-art";
import { CardArt } from "@/components/game/card-art";
import { useState } from "react";

type VehicleRow = {
  id: string;
  condition: number;
  vehicleType: { name: string; slug: string; baseValue: number };
};

export function GarageClient({ vehicles }: { vehicles: VehicleRow[] }) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const [prices, setPrices] = useState<Record<string, string>>({});

  function refresh(result: { ok: boolean }) {
    if (result.ok) router.refresh();
  }

  if (vehicles.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="font-heading text-3xl">Garage</h1>
        <p className="text-muted-foreground">Leeg. Steel eerst een auto.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl">Garage</h1>
        <p className="text-sm text-muted-foreground">
          Advertenties verschijnen op de{" "}
          <Link href="/game/markt/spelersmarkt" className="text-primary underline">
            Spelersmarkt
          </Link>
          .
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {vehicles.map((car) => {
          const sellValue = Math.max(
            10,
            Math.floor((car.condition / 100) * car.vehicleType.baseValue * 0.62),
          );
          const repair = Math.max(
            15,
            Math.floor(((100 - car.condition) / 100) * car.vehicleType.baseValue * 0.28),
          );
          return (
            <Card key={car.id} className="overflow-hidden">
              <CardHeader className="space-y-3">
                <CardArt src={vehicleArt(car.vehicleType.slug)} alt="" />
                <CardTitle className="font-heading">{car.vehicleType.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  Staat {car.condition}% · catalogus {formatMoney(car.vehicleType.baseValue)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={pending}
                    onClick={() => run(() => sellVehicle(car.id), refresh)}
                  >
                    Verkoop ({formatMoney(sellValue)})
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending || car.condition >= 100}
                    onClick={() => run(() => repairVehicle(car.id), refresh)}
                  >
                    Repareren ({formatMoney(repair)})
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Marktprijs"
                    value={prices[car.id] ?? ""}
                    onChange={(e) => setPrices((s) => ({ ...s, [car.id]: e.target.value }))}
                  />
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          createListing({
                            type: LISTING_VEHICLE,
                            price: Number(prices[car.id] || 0),
                            vehicleId: car.id,
                          }),
                        refresh,
                      )
                    }
                  >
                    Te koop
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
