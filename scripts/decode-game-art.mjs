import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadArtB64 } from "./load-art-b64.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artDir = join(root, "scripts/game-art");

const jobs = [
  ["vehicle", "corsa"],
  ["vehicle", "scooter", "corsa"],
  ["vehicle", "rs6"],
  ["vehicle", "rover"],
  ["vehicle", "roma"],
  ["vehicle", "chiron"],
  ["crime", "pinautomaat"],
  ["crime", "container"],
  ["crime", "afpersing"],
  ["crime", "museum"],
  ["crime", "arsenaal"],
];

for (const [kind, slug, sourceSlug] of jobs) {
  const destDir = join(root, "public/game", kind === "vehicle" ? "vehicles" : "crimes");
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `${slug}.jpg`);
  if (existsSync(dest) && readFileSync(dest).length > 1000) continue;
  const b64 = loadArtB64(artDir, `${kind}-${sourceSlug ?? slug}`);
  if (b64.length < 1000) continue;
  writeFileSync(dest, Buffer.from(b64, "base64"));
}
