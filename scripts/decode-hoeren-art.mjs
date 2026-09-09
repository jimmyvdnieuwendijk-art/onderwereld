import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadArtB64 } from "./load-art-b64.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = join(root, "public/game/hoeren");
const artDir = join(root, "scripts/hoeren-art");
mkdirSync(destDir, { recursive: true });
const names = ["dark-vip","dark-fetish","dark-duo","dark-casino","dark-suite","mission-drugs","handel","venue-high","venue-strip","venue-cam","venue-bdsm","empire-kompromat"];

for (const name of names) {
  const dest = join(destDir, `${name}.jpg`);
  if (existsSync(dest) && readFileSync(dest).length > 1000) continue;
  const b64 = loadArtB64(artDir, name);
  if (b64.length < 1000) continue;
  writeFileSync(dest, Buffer.from(b64, "base64"));
}
