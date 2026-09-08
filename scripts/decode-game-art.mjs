import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artDir = join(root, "scripts/game-art");

const jobs = [
  ["vehicle", "corsa"],
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

for (const [kind, slug] of jobs) {
  const destDir = join(root, "public/game", kind === "vehicle" ? "vehicles" : "crimes");
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `${slug}.jpg`);
  if (existsSync(dest) && readFileSync(dest).length > 1000) continue;
  const src = join(artDir, `${kind}-${slug}.b64`);
  if (!existsSync(src)) continue;
  const b64 = readFileSync(src, "utf8").trim();
  if (b64.length < 1000) continue;
  writeFileSync(dest, Buffer.from(b64, "base64"));
}
