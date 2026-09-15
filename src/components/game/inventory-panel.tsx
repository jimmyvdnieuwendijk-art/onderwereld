"use client";

import { consumeItem, equipItem } from "@/lib/actions/economy";
import { ITEM_AMMO, ITEM_ARMOR, ITEM_CONSUMABLE, ITEM_WEAPON } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { ammoKindForWeapon, ammoKindMeta } from "@/lib/shop-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameAction } from "@/hooks/use-player";
import type { InventoryItemView, PlayerSnapshot } from "@/types/game";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

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

function itemMeta(row: InventoryItemView) {
  const ammo = ammoKindMeta(row.item.ammoKind) ?? ammoKindMeta(ammoKindForWeapon(row.item));
  if (row.item.type === ITEM_WEAPON) return ammo ? ammo.ammoName : "Geen munitie";
  if (row.item.type === ITEM_AMMO) return ammo ? ammo.weaponName : "Munitie";
  if (row.item.type === ITEM_ARMOR) return `DEF ${row.item.defense}`;
  if (row.item.healAmount > 0) return `+${row.item.healAmount} HP`;
  if (row.item.energyAmount > 0) return `+${row.item.energyAmount} energie`;
  return formatMoney(row.item.price);
}

export function InventoryPanel({ player }: { player: PlayerSnapshot }) {
  const { run, pending } = useGameAction();
  const inventory = player.inventory ?? [];
  const grouped = GROUPS.map((group) => ({
    ...group,
    rows: inventory.filter((row) => row.item.type === group.key),
  })).filter((group) => group.rows.length > 0);
  const other = inventory.filter((row) => !GROUPS.some((group) => group.key === row.item.type));
  const smuggle = [
    { key: "drugs", label: "Drugs", qty: player.drugs },
    { key: "crates", label: "Wapenkisten", qty: player.weaponCrates },
    { key: "smuggle-ammo", label: "Smokkelkogels", qty: player.bullets },
  ].filter((row) => row.qty > 0);

  const empty = inventory.length === 0 && smuggle.length === 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#d4a359]/25 bg-[#120e0a]">
      <header className="flex items-start justify-between gap-3 border-b border-[#d4a359]/15 px-4 py-3.5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#d4a359]">Voorraad</p>
          <h2 className="font-heading text-xl text-foreground">Inventaris</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Winkelwaar en zwarte handel. Uitrusten en gebruiken kan hier.
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#d4a359]/30 bg-[#d4a359]/10 text-[#d4a359]">
          <Package className="size-4" />
        </span>
      </header>

      <div className="space-y-5 p-4">
        {empty ? (
          <p className="text-sm text-muted-foreground">Nog niets op zak. Koop in de winkel of op de markt.</p>
        ) : null}

        {grouped.map((group) => (
          <section key={group.key} className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-[#d4a359]/80">{group.label}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {group.rows.map((row) => {
                const equippedWeapon = player.equippedWeapon?.id === row.itemId;
                const equippedArmor = player.equippedArmor?.id === row.itemId;
                return (
                  <li
                    key={row.itemId}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5",
                      equippedWeapon || equippedArmor
                        ? "border-[#d4a359]/40 bg-[#d4a359]/10"
                        : "border-border/50 bg-black/25",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {row.item.name}{" "}
                        <span className="font-normal text-muted-foreground">{qtyLabel(row)}</span>
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{itemMeta(row)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
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
        ))}

        {other.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-[#d4a359]/80">Overig</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {other.map((row) => (
                <li
                  key={row.itemId}
                  className="rounded-xl border border-border/50 bg-black/25 px-3 py-2.5 text-sm"
                >
                  {row.item.name} ×{row.quantity}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-[#d4a359]/80">Zwarte handel</h3>
          {smuggle.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Geen smokkelwaar. Koop op de smokkel- of zwarte markt.
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
      </div>
    </section>
  );
}
