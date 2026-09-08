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
