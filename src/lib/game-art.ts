/** Illustration paths for game cards. Missing files fall back to a CSS plate. */

/** Extra catalog slugs that reuse an existing JPEG. */
const CRIME_ART_FILE: Record<string, string> = {
  pinautomaat: "winkel",
  container: "transport",
  afpersing: "koerier",
  museum: "juwelier",
  arsenaal: "bankauto",
};

export function crimeArt(slug: string) {
  const file = CRIME_ART_FILE[slug] ?? slug;
  return `/game/crimes/${file}.jpg`;
}

export function shopArt(slug: string) {
  return `/game/shop/${slug}.jpg`;
}

export function airportArt(id: string) {
  return `/game/airports/${id}.jpg`;
}

/**
 * Vespa is stored as scooter.jpg. Extra vehicles reuse a close existing plate —
 * do not alias the originals onto missing extra files (that blanked Golf/BMW).
 */
const VEHICLE_ART_FILE: Record<string, string> = {
  vespa: "scooter",
  corsa: "golf",
  rs6: "bmw",
  rover: "mercedes",
  roma: "porsche",
  chiron: "lambo",
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
