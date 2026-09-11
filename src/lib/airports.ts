/**
 * Vliegveld / reizen.
 *
 * Ticketprijs en vliegtijd lopen via Amsterdam als hub-referentie:
 *   ticketCost(A→B) = max(MIN_FLIGHT_COST, |base_cost_B - base_cost_A|)
 *   flightSeconds(A→B) = max(MIN_FLIGHT_TIME_SEC, |flight_time_sec_B - flight_time_sec_A|)
 *
 * base_cost / flight_time_sec zijn de metrics t.o.v. Schiphol (ams = 0).
 * Zelfde zone (verschil 0) valt terug op het minimum — bestemming = huidige stad is sowieso verboden.
 * Privéjet: 3× cash, 50% vliegtijd (naar boven afgerond).
 */

export const MIN_FLIGHT_COST = 50;
export const MIN_FLIGHT_TIME_SEC = 15;
export const PRIVATE_JET_COST_MULT = 3;
export const PRIVATE_JET_TIME_MULT = 0.5;
export const CUSTOMS_WANTED_THRESHOLD = 70;
export const CUSTOMS_ARREST_CHANCE = 35;
export const CUSTOMS_JAIL_MINUTES = 3;

export const AIRPORTS = [
  { id: "ams", city: "Amsterdam", airport: "Schiphol Airport", country: "Nederland", base_cost: 0, flight_time_sec: 0 },
  { id: "lon", city: "Londen", airport: "Heathrow Airport", country: "Engeland", base_cost: 250, flight_time_sec: 60 },
  { id: "rom", city: "Rome", airport: "Leonardo da Vinci–Fiumicino", country: "Italië", base_cost: 600, flight_time_sec: 120 },
  { id: "nyc", city: "New York", airport: "JFK International", country: "Verenigde Staten", base_cost: 2500, flight_time_sec: 300 },
  { id: "mia", city: "Miami", airport: "Miami International", country: "Verenigde Staten", base_cost: 3200, flight_time_sec: 360 },
  { id: "rio", city: "Rio de Janeiro", airport: "Galeão International", country: "Brazilië", base_cost: 4800, flight_time_sec: 480 },
  { id: "med", city: "Medellín", airport: "José María Córdova", country: "Colombia", base_cost: 5500, flight_time_sec: 540 },
  { id: "tok", city: "Tokyo", airport: "Haneda Airport", country: "Japan", base_cost: 7500, flight_time_sec: 720 },
  { id: "dub", city: "Dubai", airport: "Dubai International", country: "Verenigde Arabische Emiraten", base_cost: 4200, flight_time_sec: 420 },
  { id: "syd", city: "Sydney", airport: "Kingsford Smith Airport", country: "Australië", base_cost: 9500, flight_time_sec: 900 },
] as const;

export type AirportId = (typeof AIRPORTS)[number]["id"];
export type Airport = (typeof AIRPORTS)[number];

const BY_ID = Object.fromEntries(AIRPORTS.map((row) => [row.id, row])) as Record<AirportId, Airport>;

/** Oude Nederlandse steden zonder vliegveld → Schiphol. */
const LEGACY_CITY_TO_AIRPORT: Record<string, AirportId> = {
  Amsterdam: "ams",
  Rotterdam: "ams",
  "Den Haag": "ams",
  Utrecht: "ams",
  Eindhoven: "ams",
  Groningen: "ams",
  Maastricht: "ams",
};

export function isAirportId(value: string): value is AirportId {
  return value in BY_ID;
}

export function normalizeCityId(value: string | null | undefined): AirportId {
  if (!value) return "ams";
  if (isAirportId(value)) return value;
  return LEGACY_CITY_TO_AIRPORT[value] ?? "ams";
}

export function getAirport(id: string): Airport {
  return BY_ID[normalizeCityId(id)];
}

export function cityDisplayName(id: string): string {
  return getAirport(id).city;
}

export function flightQuote(fromId: string, toId: string, privateJet = false) {
  const from = getAirport(fromId);
  const to = getAirport(toId);
  const baseCost = Math.max(MIN_FLIGHT_COST, Math.abs(to.base_cost - from.base_cost));
  const baseSeconds = Math.max(MIN_FLIGHT_TIME_SEC, Math.abs(to.flight_time_sec - from.flight_time_sec));
  const cost = privateJet ? baseCost * PRIVATE_JET_COST_MULT : baseCost;
  const seconds = privateJet ? Math.max(MIN_FLIGHT_TIME_SEC, Math.ceil(baseSeconds * PRIVATE_JET_TIME_MULT)) : baseSeconds;
  return { from, to, cost, seconds, baseCost, baseSeconds };
}

export type SmuggleGood = "drugs" | "weapons" | "bullets";

export const SMUGGLE_GOODS: {
  id: SmuggleGood;
  label: string;
  unit: string;
  hint: string;
}[] = [
  { id: "drugs", label: "Drugs", unit: "pakket", hint: "Goedkoop in Medellín, duur in Tokyo." },
  { id: "weapons", label: "Wapenkisten", unit: "kist", hint: "Londen en Rome duwen staal over de toonbank." },
  { id: "bullets", label: "Kogels", unit: "kogel", hint: "Miami is een munitiehaven." },
];

export type CityMarket = {
  drugsBuy: number;
  drugsSell: number;
  weaponsBuy: number;
  weaponsSell: number;
  bulletsBuy: number;
  bulletsSell: number;
};

/** Unieke in-/verkoopprijzen per stad. Verkoop in dezelfde stad is altijd lager dan aankoop. */
export const CITY_MARKETS: Record<AirportId, CityMarket> = {
  ams: { drugsBuy: 900, drugsSell: 650, weaponsBuy: 2200, weaponsSell: 1600, bulletsBuy: 14, bulletsSell: 9 },
  lon: { drugsBuy: 1100, drugsSell: 800, weaponsBuy: 1800, weaponsSell: 1300, bulletsBuy: 16, bulletsSell: 10 },
  rom: { drugsBuy: 850, drugsSell: 620, weaponsBuy: 1400, weaponsSell: 1000, bulletsBuy: 13, bulletsSell: 8 },
  nyc: { drugsBuy: 1600, drugsSell: 1200, weaponsBuy: 2800, weaponsSell: 2100, bulletsBuy: 22, bulletsSell: 15 },
  mia: { drugsBuy: 1300, drugsSell: 950, weaponsBuy: 2400, weaponsSell: 1800, bulletsBuy: 6, bulletsSell: 4 },
  rio: { drugsBuy: 500, drugsSell: 360, weaponsBuy: 1700, weaponsSell: 1200, bulletsBuy: 10, bulletsSell: 6 },
  med: { drugsBuy: 180, drugsSell: 120, weaponsBuy: 1500, weaponsSell: 1100, bulletsBuy: 11, bulletsSell: 7 },
  tok: { drugsBuy: 2600, drugsSell: 2100, weaponsBuy: 3200, weaponsSell: 2400, bulletsBuy: 20, bulletsSell: 14 },
  dub: { drugsBuy: 1900, drugsSell: 1400, weaponsBuy: 3600, weaponsSell: 2700, bulletsBuy: 18, bulletsSell: 12 },
  syd: { drugsBuy: 2100, drugsSell: 1600, weaponsBuy: 3400, weaponsSell: 2500, bulletsBuy: 19, bulletsSell: 13 },
};

export function marketFor(cityId: string): CityMarket {
  return CITY_MARKETS[normalizeCityId(cityId)];
}

export function smugglePrice(cityId: string, good: SmuggleGood, side: "buy" | "sell"): number {
  const market = marketFor(cityId);
  if (good === "drugs") return side === "buy" ? market.drugsBuy : market.drugsSell;
  if (good === "weapons") return side === "buy" ? market.weaponsBuy : market.weaponsSell;
  return side === "buy" ? market.bulletsBuy : market.bulletsSell;
}

export function goodStock(
  player: { drugs: number; weaponCrates: number; bullets: number },
  good: SmuggleGood,
) {
  if (good === "drugs") return player.drugs;
  if (good === "weapons") return player.weaponCrates;
  return player.bullets;
}

export function cityPriceRank(good: SmuggleGood, side: "buy" | "sell" = "buy") {
  const ranked = AIRPORTS.map((row) => ({
    ...row,
    price: smugglePrice(row.id, good, side),
  })).sort((a, b) => a.price - b.price);
  return {
    cheapest: ranked[0],
    dearest: ranked[ranked.length - 1],
    ranked,
  };
}

export function spreadPct(buy: number, sell: number) {
  if (buy <= 0) return 0;
  return Math.round(((sell - buy) / buy) * 100);
}

export function vsAmsterdamPct(cityId: string, good: SmuggleGood, side: "buy" | "sell" = "buy") {
  const here = smugglePrice(cityId, good, side);
  const ams = smugglePrice("ams", good, side);
  if (ams <= 0) return 0;
  return Math.round(((here - ams) / ams) * 100);
}
