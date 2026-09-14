"use client";

import { consumeItem, equipItem } from "@/lib/actions/economy";
import { ITEM_AMMO, ITEM_ARMOR, ITEM_CONSUMABLE, ITEM_WEAPON } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { ammoKindMeta } from "@/lib/shop-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameAction } from "@/hooks/use-player";
import type { InventoryItemView, PlayerSnapshot } from "@/types/game";

const GROUPS = [
  { key: ITEM_WEAPON, label: "Wapens" },
  { key: ITEM_ARMOR, label: "Bescherming" },
  { key: ITEM_CONSUMABLE, label: "Verbruik" },
  { key: ITEM_AMMO, label: "Munitie" },
] as const;

function qtyLabel(row: InventoryItemView) {
  if (row.item.type === ITEM_AMMO) return `${row.quantity} patronen`;
  return `×${row.quantity}`;
}

export function InventoryPanel({ player }: { player: PlayerSnapshot }) {
  const { run, pending } = useGameAction();
  const inventory = player.inventory ?? [];
  const grouped = GROUPS.map((group) => ({
    ...group,
    rows: inventory.filter((row) => row.item.type === group.key),
  }));
  const other = inventory.filter((row) => !GROUPS.some((group) => group.key === row.item.type));
  const smuggle = [
    { key: "drugs", label: "Drugs", qty: player.drugs },
    { key: "crates", label: "Wapenkisten", qty: player.weaponCrates },
    { key: "smuggle-ammo", label: "Smokkelkogels", qty: player.bullets },
  ].filter((row) => row.qty > 0);

  const emptyShop = inventory.length === 0;
  const emptySmuggle = smuggle.length === 0;

  return (
    <Card size="sm" className="border-border/50">
      <CardHeader className="border-b border-border/40">
        <CardTitle>Inventaris</CardTitle>
        <CardDescription>
          Alles wat je bij je draagt: winkelwaar en zwarte handel. Uitrusten en gebruiken kan hier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-3">
        {emptyShop ? (
          <p className="text-sm text-muted-foreground">Nog geen winkelspullen. Koop iets in de winkel.</p>
        ) : (
          grouped.map((group) =>
            group.rows.length === 0 ? null : (
              <section key={group.key} className="space-y-2">
                <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </h3>
                <ul className="space-y-2">
                  {group.rows.map((row) => {
                    const ammo = ammoKindMeta(row.item.ammoKind);
                    const equippedWeapon = player.equippedWeapon?.id === row.itemId;
                    const equippedArmor = player.equippedArmor?.id === row.itemId;
                    return (
                      <li
                        key={row.itemId}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {row.item.name}{" "}
                            <span className="font-normal text-muted-foreground">{qtyLabel(row)}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {row.item.type === ITEM_WEAPON && ammo
                              ? `Munitie: ${ammo.ammoName}`
                              : row.item.type === ITEM_WEAPON
                                ? "Geen munitie nodig"
                                : row.item.type === ITEM_AMMO && ammo
                                  ? `Past bij ${ammo.weaponName}`
                                  : row.item.type === ITEM_ARMOR
                                    ? `DEF ${row.item.defense}`
                                    : row.item.healAmount > 0
                                      ? `+${row.item.healAmount} HP`
                                      : row.item.energyAmount > 0
                                        ? `+${row.item.energyAmount} energie`
                                        : formatMoney(row.item.price)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {equippedWeapon && <Badge variant="secondary">wapen</Badge>}
                          {equippedArmor && <Badge variant="secondary">vest</Badge>}
                          {(row.item.type === ITEM_WEAPON || row.item.type === ITEM_ARMOR) && (
                            <Button
                              size="sm"
                              disabled={pending || equippedWeapon || equippedArmor}
                              onClick={() => run(() => equipItem(row.itemId))}
                            >
                              Uitrusten
                            </Button>
                          )}
                          {row.item.type === ITEM_CONSUMABLE && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={() => run(() => consumeItem(row.itemId))}
                            >
                              Gebruiken
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ),
          )
        )}

        {other.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Overig</h3>
            <ul className="space-y-1 text-sm">
              {other.map((row) => (
                <li key={row.itemId}>
                  {row.item.name} ×{row.quantity}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Zwarte handel
          </h3>
          {emptySmuggle ? (
            <p className="text-sm text-muted-foreground">
              Geen smokkelwaar op zak. Koop op de smokkel- of zwarte markt.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {smuggle.map((row) => (
                <Badge key={row.key} variant="outline">
                  {row.label} ×{row.qty}
                </Badge>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground">
            Bij een PvP-nederlaag raak je deze voorraad kwijt.
          </p>
        </section>
      </CardContent>
    </Card>
  );
}
