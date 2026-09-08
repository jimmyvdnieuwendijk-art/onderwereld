"use client";

import { buyItemForm, equipItem, consumeItem } from "@/lib/actions/economy";
import { ITEM_AMMO, ITEM_ARMOR, ITEM_CONSUMABLE, ITEM_WEAPON } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGameAction, usePlayer } from "@/hooks/use-player";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import { useRouter } from "next/navigation";
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
  price: number;
  minRankOrder: number;
};

type Inv = { itemId: string; quantity: number; item: Item };

export function ShopClient({
  initialPlayer,
  items,
  inventory,
}: {
  initialPlayer: PlayerSnapshot;
  items: Item[];
  inventory: Inv[];
}) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const { run, pending } = useGameAction();
  const [buyState, buyAction, buying] = useFormAction(buyItemForm);
  const router = useRouter();
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };

  const groups = [
    { key: ITEM_WEAPON, label: "Wapens" },
    { key: ITEM_ARMOR, label: "Bescherming" },
    { key: ITEM_CONSUMABLE, label: "Verbruik" },
    { key: ITEM_AMMO, label: "Kogels" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl">Winkel</h1>
        <p className="text-sm text-muted-foreground">
          Koop wapens en vesten, rust ze uit, gebruik verband. Kogels gaan direct naar je voorraad.
        </p>
        <div className="mt-2">
          <ActionFeedback state={buyState} />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inventaris</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {inventory.length === 0 && <p className="text-sm text-muted-foreground">Lege jaszakken.</p>}
          {inventory.map((row) => (
            <div key={row.itemId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {row.item.name} ×{row.quantity}
                {p.equippedWeapon?.id === row.itemId && (
                  <Badge className="ml-2" variant="secondary">
                    wapen
                  </Badge>
                )}
                {p.equippedArmor?.id === row.itemId && (
                  <Badge className="ml-2" variant="secondary">
                    vest
                  </Badge>
                )}
              </span>
              <div className="flex gap-2">
                {(row.item.type === ITEM_WEAPON || row.item.type === ITEM_ARMOR) && (
                  <Button size="sm" disabled={pending} onClick={() => run(() => equipItem(row.itemId), refresh)}>
                    Uitrusten
                  </Button>
                )}
                {row.item.type === ITEM_CONSUMABLE && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(() => consumeItem(row.itemId), refresh)}
                  >
                    Gebruiken
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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
                        {item.energyAmount > 0 && <Badge variant="outline">+{item.energyAmount} energie</Badge>}
                        {item.bulletsAmount > 0 && <Badge variant="outline">+{item.bulletsAmount} kogels</Badge>}
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
