import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadArtB64 } from "./load-art-b64.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = join(root, "public/game/hoeren");
const artDir = join(root, "scripts/hoeren-art");
mkdirSync(destDir, { recursive: true });
const names = ["dark-vip","dark-fetish","dark-duo","dark-casino","dark-suite","mission-drugs","handel","venue-high","venue-strip","venue-cam","venue-bdsm","empire-kompromat"];

const aliases = {
  header: "dark-vip",
  window: "venue-high",
  "escort-1": "dark-vip",
  "escort-2": "dark-fetish",
  "escort-3": "dark-duo",
  "escort-4": "dark-casino",
  "escort-5": "dark-suite",
  "escort-6": "venue-strip",
};

function writeJpg(name, sourceName = name) {
  const dest = join(destDir, `${name}.jpg`);
  if (existsSync(dest) && readFileSync(dest).length > 1000) return;
  const b64 = loadArtB64(artDir, sourceName);
  if (b64.length < 1000) return;
  writeFileSync(dest, Buffer.from(b64, "base64"));
}

for (const name of names) writeJpg(name);
for (const [name, source] of Object.entries(aliases)) writeJpg(name, source);
