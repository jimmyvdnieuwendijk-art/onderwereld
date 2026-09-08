import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = join(root, "public/game/gym");
const artDir = join(root, "scripts/gym-art");
mkdirSync(destDir, { recursive: true });
const names = ["gym-header", "gym-l1", "gym-l2", "gym-l3", "gym-l4", "gym-l5"];

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

for (const name of names) {
  const dest = join(destDir, `${name}.jpg`);
  if (existsSync(dest) && readFileSync(dest).length > 1000) continue;
  const b64 = loadB64(name);
  if (b64.length < 1000) continue;
  writeFileSync(dest, Buffer.from(b64, "base64"));
}
