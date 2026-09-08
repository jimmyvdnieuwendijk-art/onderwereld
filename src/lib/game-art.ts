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

export function vehicleArt(slug: string) {
  return `/game/vehicles/${slug}.jpg`;
}

export function hoerenArt(kind: "header" | "window" | "drugs" | "handel" | `dark-${string}` | `escort-${number}`) {
  if (kind === "header") return "/game/hoeren/header.jpg";
  if (kind === "window") return "/game/hoeren/window.jpg";
  if (kind === "drugs") return "/game/hoeren/mission-drugs.jpg";
  if (kind === "handel") return "/game/hoeren/handel.jpg";
  return `/game/hoeren/${kind}.jpg`;
}
