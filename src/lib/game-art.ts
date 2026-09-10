/** Illustration paths for game cards. Missing files fall back to a CSS plate. */

export function crimeArt(slug: string) {
  return `/game/crimes/${slug}.jpg`;
}

export function shopArt(slug: string) {
  return `/game/shop/${slug}.jpg`;
}

export function airportArt(id: string) {
  return `/game/airports/${id}.jpg`;
}

/** Catalog slugs that share a generated JPEG (Vespa is stored as scooter). */
const VEHICLE_ART_FILE: Record<string, string> = {
  scooter: "scooter",
  vespa: "scooter",
  fiets: "corsa",
  golf: "corsa",
  bmw: "rs6",
  mercedes: "rover",
  porsche: "roma",
  lambo: "chiron",
};

export function vehicleArt(slug: string) {
  const file = VEHICLE_ART_FILE[slug] ?? slug;
  return `/game/vehicles/${file}.jpg`;
}

export function casinoArt(kind: "header" | "roulette" | "poker" | "street" | "pit") {
  return kind === "header" ? "/game/casino/casino-header.jpg" : `/game/casino/casino-${kind}.jpg`;
}

export function gymArt(kind: "header" | `l${number}`) {
  if (kind === "header") return "/game/gym/gym-header.jpg";
  return `/game/gym/gym-${kind}.jpg`;
}

export function hoerenArt(kind: "header" | "window" | "drugs" | "handel" | `dark-${string}` | `escort-${number}`) {
  if (kind === "header") return "/game/hoeren/header.jpg";
  if (kind === "window") return "/game/hoeren/window.jpg";
  if (kind === "drugs") return "/game/hoeren/mission-drugs.jpg";
  if (kind === "handel") return "/game/hoeren/handel.jpg";
  return `/game/hoeren/${kind}.jpg`;
}
