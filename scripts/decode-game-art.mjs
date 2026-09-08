import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
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

function loadB64(name) {
  for (const candidate of [join(artDir, `${name}.b64`), join(artDir, "web", `${name}.b64`)]) {
    if (existsSync(candidate)) {
      const text = readFileSync(candidate, "utf8").trim();
      if (text.length >= 1000) return text;
    }
  }
  const partsDir = join(artDir, "parts", name);
  if (!existsSync(partsDir)) return "";
  const files = readdirSync(partsDir).filter((f) => f.endsWith(".txt")).sort();
  if (!files.length) return "";
  return files.map((f) => readFileSync(join(partsDir, f), "utf8").trim()).join("");
}

for (const [kind, slug] of jobs) {
  const destDir = join(root, "public/game", kind === "vehicle" ? "vehicles" : "crimes");
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `${slug}.jpg`);
  if (existsSync(dest) && readFileSync(dest).length > 1000) continue;
  const b64 = loadB64(`${kind}-${slug}`);
  if (b64.length < 1000) continue;
  writeFileSync(dest, Buffer.from(b64, "base64"));
}
