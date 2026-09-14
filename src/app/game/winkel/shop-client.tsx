"use client";

import { buyItemForm } from "@/lib/actions/economy";
import { ITEM_AMMO, ITEM_ARMOR, ITEM_CONSUMABLE, ITEM_WEAPON } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { ammoKindForWeapon, ammoKindMeta } from "@/lib/shop-catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLivePlayer } from "@/hooks/use-player";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import { shopArt } from "@/lib/game-art";
import { CardArt } from "@/components/game/card-art";
import type { PlayerSnapshot } from "@/types/game";

type Item = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  attack: number;
  defense: number;
  healAmount: number;
  energyAmount: number;
  bulletsAmount: number;
  ammoKind?: string | null;
  price: number;
  minRankOrder: number;
};

export function ShopClient({
  initialPlayer,
  items,
}: {
  initialPlayer?: PlayerSnapshot;
  items: Item[];
}) {
  const p = useLivePlayer(initialPlayer)!;
  const [buyState, buyAction, buying] = useFormAction(buyItemForm);

  const groups = [
    { key: ITEM_WEAPON, label: "Wapens" },
    { key: ITEM_ARMOR, label: "Bescherming" },
    { key: ITEM_CONSUMABLE, label: "Verbruik" },
    { key: ITEM_AMMO, label: "Munitie" },
  ];

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary/80">Straatwinkel</p>
        <h1 className="font-heading text-3xl">Winkel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wapens, vesten, verbruik en bijpassende munitie. Alles landt in je inventaris op Overzicht.
        </p>
        <div className="mt-2">
          <ActionFeedback state={buyState} />
        </div>
      </header>

      <Tabs defaultValue={ITEM_WEAPON}>
        <TabsList>
          {groups.map((g) => (
            <TabsTrigger key={g.key} value={g.key}>
              {g.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {groups.map((g) => (
          <TabsContent key={g.key} value={g.key} className="grid gap-3 md:grid-cols-2">
            {items
              .filter((item) => item.type === g.key)
              .map((item) => {
                const locked = p.rank.order < item.minRankOrder;
                const ammo = ammoKindMeta(ammoKindForWeapon(item));
                return (
                  <Card key={item.id} className="overflow-hidden">
                    <CardHeader className="space-y-3">
                      <CardArt src={shopArt(item.slug)} alt="" aspect="square" />
                      <CardTitle className="font-heading">{item.name}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge>{formatMoney(item.price)}</Badge>
                        {item.attack > 0 && <Badge variant="secondary">ATK {item.attack}</Badge>}
                        {item.defense > 0 && <Badge variant="secondary">DEF {item.defense}</Badge>}
                        {item.healAmount > 0 && <Badge variant="outline">+{item.healAmount} HP</Badge>}
                        {item.energyAmount > 0 && (
                          <Badge variant="outline">+{item.energyAmount} energie</Badge>
                        )}
                        {item.type === ITEM_AMMO && ammo && (
                          <Badge variant="outline">
                            {item.bulletsAmount}× {ammo.weaponName}
                          </Badge>
                        )}
                        {item.type === ITEM_WEAPON && ammo && (
                          <Badge variant="outline">Mun. {ammo.ammoName}</Badge>
                        )}
                        {item.type === ITEM_WEAPON && !ammo && (
                          <Badge variant="outline">Geen munitie</Badge>
                        )}
                      </div>
                      <form action={buyAction}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <Button type="submit" disabled={buying || locked || p.isTraveling}>
                          {p.isTraveling ? "In de lucht" : locked ? "Rang te laag" : "Kopen"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                );
              })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
