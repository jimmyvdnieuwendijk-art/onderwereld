/** Illustration paths for game cards. Missing files fall back to a CSS plate. */

export function crimeArt(slug: string) {
  return `/game/crimes/${slug}.jpg`;
}

const SHOP_ART_FILE: Record<string, string> = {
  "kevlar-inleg": "jas",
  keramiek: "harnas",
  morfine: "verband",
  adrenaline: "energiedrank",
  "kogels-uzi": "kogels50",
  "kogels-ak": "kogels200",
  "kogels-barrett": "kogels200",
};

export function shopArt(slug: string) {
  const file = SHOP_ART_FILE[slug] ?? slug;
  return `/game/shop/${file}.jpg`;
}

export function airportArt(id: string) {
  return `/game/airports/${id}.jpg`;
}

/**
 * Vespa's catalog slug is `scooter` (file: scooter.jpg).
 * Extra cars (corsa, rs6, …) have their own decoded plates — do not alias
 * them onto Golf/BMW or those unique files never show.
 */
const VEHICLE_ART_FILE: Record<string, string> = {
  vespa: "scooter",
};

export function vehicleArt(slug: string) {
  const file = VEHICLE_ART_FILE[slug] ?? slug;
  return `/game/vehicles/${file}.jpg`;
}

const CASINO_ART_FILE: Record<string, string> = {
  header: "/game/crimes/casino.jpg",
  roulette: "/game/crimes/casino.jpg",
  poker: "/game/crimes/juwelier.jpg",
  street: "/game/crimes/winkel.jpg",
  pit: "/game/crimes/inbraak.jpg",
};

export function casinoArt(kind: "header" | "roulette" | "poker" | "street" | "pit") {
  return CASINO_ART_FILE[kind];
}

export function gymArt(kind: "header" | `l${number}`) {
  if (kind === "header") return "/game/hoeren/header.jpg";
  return "/game/shop/vest.jpg";
}

export function hoerenArt(kind: "header" | "window" | "drugs" | "handel" | `dark-${string}` | `escort-${number}`) {
  if (kind === "header") return "/game/hoeren/header.jpg";
  if (kind === "window") return "/game/hoeren/window.jpg";
  if (kind === "drugs") return "/game/crimes/koerier.jpg";
  if (kind === "handel") return "/game/crimes/winkel.jpg";
  if (kind.startsWith("dark-")) return "/game/hoeren/window.jpg";
  return `/game/hoeren/${kind}.jpg`;
}
