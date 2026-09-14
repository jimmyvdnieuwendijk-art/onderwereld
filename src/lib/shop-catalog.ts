import { ITEM_AMMO, ITEM_ARMOR, ITEM_CONSUMABLE, ITEM_WEAPON } from "./constants";

export type AmmoKindId = "glock" | "uzi" | "ak" | "barrett";

export const AMMO_KINDS: Record<
  AmmoKindId,
  { id: AmmoKindId; weaponSlug: string; weaponName: string; caliber: string; ammoName: string }
> = {
  glock: {
    id: "glock",
    weaponSlug: "pistool",
    weaponName: "Glock 17",
    caliber: "9×19 mm",
    ammoName: "Glock 9×19",
  },
  uzi: {
    id: "uzi",
    weaponSlug: "uzi",
    weaponName: "Uzi",
    caliber: "9×19 mm",
    ammoName: "Uzi-magazijn",
  },
  ak: {
    id: "ak",
    weaponSlug: "ak",
    weaponName: "AK-47",
    caliber: "7,62×39 mm",
    ammoName: "AK 7,62",
  },
  barrett: {
    id: "barrett",
    weaponSlug: "sniper",
    weaponName: "Barrett M82",
    caliber: ".50 BMG",
    ammoName: "Barrett .50",
  },
};

export type ShopItemSeed = {
  slug: string;
  name: string;
  description: string;
  type: string;
  attack: number;
  defense: number;
  healAmount: number;
  energyAmount: number;
  bulletsAmount: number;
  ammoKind: string | null;
  price: number;
  minRankOrder: number;
};

export const SHOP_ITEMS: ShopItemSeed[] = [
  {
    slug: "knuppel",
    name: "Honkbalknuppel",
    description: "Hout en intentie. Meer niet.",
    type: ITEM_WEAPON,
    attack: 8,
    defense: 0,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: null,
    price: 250,
    minRankOrder: 1,
  },
  {
    slug: "mes",
    name: "Stiletto",
    description: "Klein, stil, en altijd binnen handbereik.",
    type: ITEM_WEAPON,
    attack: 15,
    defense: 0,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: null,
    price: 750,
    minRankOrder: 1,
  },
  {
    slug: "pistool",
    name: "Glock 17",
    description: "Standaard straatvuur. Schiet alleen Glock 9×19.",
    type: ITEM_WEAPON,
    attack: 28,
    defense: 0,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: "glock",
    price: 2800,
    minRankOrder: 2,
  },
  {
    slug: "uzi",
    name: "Uzi",
    description: "Spray and pray, Rotterdam-stijl. Alleen Uzi-magazijnen.",
    type: ITEM_WEAPON,
    attack: 46,
    defense: 0,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: "uzi",
    price: 8500,
    minRankOrder: 4,
  },
  {
    slug: "ak",
    name: "AK-47",
    description: "Als onderhandelen klaar is. Alleen AK 7,62.",
    type: ITEM_WEAPON,
    attack: 70,
    defense: 0,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: "ak",
    price: 22000,
    minRankOrder: 6,
  },
  {
    slug: "sniper",
    name: "Barrett M82",
    description: "Eén schot. Eén rekening. Alleen Barrett .50.",
    type: ITEM_WEAPON,
    attack: 95,
    defense: 0,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: "barrett",
    price: 55000,
    minRankOrder: 8,
  },
  {
    slug: "jas",
    name: "Leren jas",
    description: "Houdt messen tegen. Kogels minder.",
    type: ITEM_ARMOR,
    attack: 0,
    defense: 8,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: null,
    price: 400,
    minRankOrder: 1,
  },
  {
    slug: "kevlar-inleg",
    name: "Kevlar-inleg",
    description: "Dunne platen onder je jas. Meer dan leer, lichter dan een vest.",
    type: ITEM_ARMOR,
    attack: 0,
    defense: 14,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: null,
    price: 1400,
    minRankOrder: 2,
  },
  {
    slug: "vest",
    name: "Kogelvrij vest",
    description: "Standaard bescherming voor wie vijanden maakt.",
    type: ITEM_ARMOR,
    attack: 0,
    defense: 22,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: null,
    price: 3200,
    minRankOrder: 3,
  },
  {
    slug: "harnas",
    name: "Tactisch harnas",
    description: "Zwaar, warm, en het verschil tussen leven en ziekenhuis.",
    type: ITEM_ARMOR,
    attack: 0,
    defense: 40,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: null,
    price: 14000,
    minRankOrder: 5,
  },
  {
    slug: "keramiek",
    name: "Keramische platen",
    description: "Harde platen die kogels opvangen. Warm, lomp, levensreddend.",
    type: ITEM_ARMOR,
    attack: 0,
    defense: 52,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: null,
    price: 24000,
    minRankOrder: 6,
  },
  {
    slug: "titanium",
    name: "Titaniumvest",
    description: "Bijna oneerlijk. Precies zoals het hoort.",
    type: ITEM_ARMOR,
    attack: 0,
    defense: 65,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: null,
    price: 38000,
    minRankOrder: 7,
  },
  {
    slug: "verband",
    name: "EHBO-verband",
    description: "Heelt 30 gezondheid. Geen wonderen.",
    type: ITEM_CONSUMABLE,
    attack: 0,
    defense: 0,
    healAmount: 30,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: null,
    price: 180,
    minRankOrder: 1,
  },
  {
    slug: "energiedrank",
    name: "Energiedrank",
    description: "Twijfelachtige smaak, +40 energie.",
    type: ITEM_CONSUMABLE,
    attack: 0,
    defense: 0,
    healAmount: 0,
    energyAmount: 40,
    bulletsAmount: 0,
    ammoKind: null,
    price: 220,
    minRankOrder: 1,
  },
  {
    slug: "morfine",
    name: "Morfine-ampul",
    description: "Ziekenhuisvoorraad van de achterdeur. Heelt 55 gezondheid.",
    type: ITEM_CONSUMABLE,
    attack: 0,
    defense: 0,
    healAmount: 55,
    energyAmount: 0,
    bulletsAmount: 0,
    ammoKind: null,
    price: 420,
    minRankOrder: 3,
  },
  {
    slug: "adrenaline",
    name: "Adrenalineshot",
    description: "Een steek in de dij. +70 energie, daarna de trillingen.",
    type: ITEM_CONSUMABLE,
    attack: 0,
    defense: 0,
    healAmount: 0,
    energyAmount: 70,
    bulletsAmount: 0,
    ammoKind: null,
    price: 480,
    minRankOrder: 3,
  },
  {
    slug: "kogels50",
    name: "Glock 9×19 (50)",
    description: "Vijftig patronen, alleen bruikbaar in de Glock 17.",
    type: ITEM_AMMO,
    attack: 0,
    defense: 0,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 50,
    ammoKind: "glock",
    price: 600,
    minRankOrder: 2,
  },
  {
    slug: "kogels-uzi",
    name: "Uzi-magazijn (40)",
    description: "Veertig patronen 9×19, alleen bruikbaar in de Uzi.",
    type: ITEM_AMMO,
    attack: 0,
    defense: 0,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 40,
    ammoKind: "uzi",
    price: 720,
    minRankOrder: 4,
  },
  {
    slug: "kogels200",
    name: "AK 7,62 (30)",
    description: "Dertig patronen, alleen bruikbaar in de AK-47.",
    type: ITEM_AMMO,
    attack: 0,
    defense: 0,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 30,
    ammoKind: "ak",
    price: 900,
    minRankOrder: 6,
  },
  {
    slug: "kogels-barrett",
    name: "Barrett .50 (10)",
    description: "Tien zware patronen, alleen bruikbaar in de Barrett M82.",
    type: ITEM_AMMO,
    attack: 0,
    defense: 0,
    healAmount: 0,
    energyAmount: 0,
    bulletsAmount: 10,
    ammoKind: "barrett",
    price: 1800,
    minRankOrder: 8,
  },
];

export function isAmmoKind(value: string | null | undefined): value is AmmoKindId {
  return value === "glock" || value === "uzi" || value === "ak" || value === "barrett";
}

export function ammoKindMeta(kind: string | null | undefined) {
  if (!isAmmoKind(kind)) return null;
  return AMMO_KINDS[kind];
}

export function ammoKindForWeapon(weapon: {
  ammoKind?: string | null;
  slug?: string | null;
  name?: string | null;
} | null | undefined) {
  if (!weapon) return null;
  if (isAmmoKind(weapon.ammoKind)) return weapon.ammoKind;
  const match = SHOP_ITEMS.find(
    (item) =>
      item.type === ITEM_WEAPON &&
      ((weapon.slug && item.slug === weapon.slug) || (weapon.name && item.name === weapon.name)),
  );
  return match?.ammoKind ?? null;
}

export function ammoQtyForKind(
  inventory: { quantity: number; item: { type: string; ammoKind?: string | null } }[],
  kind: string | null | undefined,
) {
  if (!kind) return 0;
  return inventory.reduce((sum, row) => {
    if (row.item.type === ITEM_AMMO && row.item.ammoKind === kind) return sum + row.quantity;
    return sum;
  }, 0);
}
