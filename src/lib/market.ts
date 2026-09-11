import {
  AIRPORTS,
  cityPriceRank,
  smugglePrice,
  type SmuggleGood,
} from "@/lib/airports";
import { LISTING_BULLETS, LISTING_DRUGS, LISTING_ITEM, LISTING_VEHICLE, LISTING_WEAPONS } from "@/lib/constants";

export const CONTRABAND_TYPES = [LISTING_DRUGS, LISTING_WEAPONS, LISTING_BULLETS] as const;
export const PLAYER_MARKET_TYPES = [LISTING_VEHICLE, LISTING_ITEM, LISTING_BULLETS] as const;

export const MARKT_SUBNAV = [
  { href: "/game/markt", label: "Overzicht" },
  { href: "/game/markt/smokkelmarkt", label: "Smokkelmarkt" },
  { href: "/game/markt/zwarte-markt", label: "Zwarte Markt" },
  { href: "/game/markt/spelersmarkt", label: "Spelersmarkt" },
] as const;

export function listingTypeForGood(good: SmuggleGood) {
  if (good === "drugs") return LISTING_DRUGS;
  if (good === "weapons") return LISTING_WEAPONS;
  return LISTING_BULLETS;
}

export function goodForListingType(type: string): SmuggleGood | null {
  if (type === LISTING_DRUGS) return "drugs";
  if (type === LISTING_WEAPONS) return "weapons";
  if (type === LISTING_BULLETS) return "bullets";
  return null;
}

export function isContrabandType(type: string) {
  return type === LISTING_DRUGS || type === LISTING_WEAPONS || type === LISTING_BULLETS;
}

export function stockFieldForType(type: string): "drugs" | "weaponCrates" | "bullets" | null {
  if (type === LISTING_DRUGS) return "drugs";
  if (type === LISTING_WEAPONS) return "weaponCrates";
  if (type === LISTING_BULLETS) return "bullets";
  return null;
}

export function listingLabel(type: string, quantity: number, extra?: string | null) {
  if (type === LISTING_DRUGS) return `${quantity} drugs`;
  if (type === LISTING_WEAPONS) return `${quantity} wapenkisten`;
  if (type === LISTING_BULLETS) return `${quantity} kogels`;
  if (type === LISTING_VEHICLE) return extra ?? "Voertuig";
  return extra ?? "Item";
}

export function unitAsk(price: number, quantity: number) {
  if (quantity <= 0) return price;
  return Math.round(price / quantity);
}

export function cityTip(good: SmuggleGood, cityId: string) {
  const { cheapest, dearest } = cityPriceRank(good, "buy");
  const hereCheap = cheapest.id === cityId;
  const hereDear = dearest.id === cityId;
  return {
    cheapLabel: hereCheap ? `${cheapest.city} · goedkoop hier` : `${cheapest.city} goedkoop`,
    dearLabel: hereDear ? `${dearest.city} · duur hier` : `${dearest.city} duur`,
    hereCheap,
    hereDear,
    cheapest,
    dearest,
  };
}

export function allCityRows(good: SmuggleGood) {
  return AIRPORTS.map((row) => ({
    id: row.id,
    city: row.city,
    buy: smugglePrice(row.id, good, "buy"),
    sell: smugglePrice(row.id, good, "sell"),
  }));
}

export type ListingDTO = {
  id: string;
  type: string;
  quantity: number;
  price: number;
  sellerId: string;
  sellerName: string;
  buyerId: string | null;
  buyerName: string | null;
  active: boolean;
  createdAt: string;
  completedAt: string | null;
  vehicleName: string | null;
  itemName: string | null;
};

export type PriceAlertDTO = {
  id: string;
  good: string;
  side: string;
  threshold: number;
  cityId: string | null;
  lastFiredAt: string | null;
  lastFiredCity: string | null;
  createdAt: string;
};

export type TradeLogDTO = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
};
