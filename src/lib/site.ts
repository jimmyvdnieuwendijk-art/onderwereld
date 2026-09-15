/** Canonical public origin for metadata, OG, and Auth.js docs. */
export function siteOrigin() {
  const fromAuth = process.env.AUTH_URL?.trim().replace(/\/$/, "");
  if (fromAuth) return fromAuth;
  return "https://onderwereld-nine.vercel.app";
}

export const SITE_NAME = "Onderwereld";
export const SITE_TITLE =
  "Onderwereld | Gratis browser MMORPG — Nederlandse maffia game";
export const SITE_DESCRIPTION =
  "Speel Onderwereld, de gratis online maffia game in je browser. Browser MMORPG en crime game NL: misdaden, families, handel en PvP. Geen download.";

export const SITE_KEYWORDS = [
  "gratis online maffia game",
  "browser MMORPG",
  "crime game NL",
  "maffia spel",
  "online crime game",
  "tekst MMORPG",
  "onderwereld game",
  "Nederlandse maffia game",
  "browser game",
  "gratis MMORPG",
];
