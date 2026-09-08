import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = join(root, "public/game/hoeren");
mkdirSync(destDir, { recursive: true });
const names = ["dark-vip","dark-fetish","dark-duo","dark-casino","dark-suite","mission-drugs","handel"];
for (const name of names) {
  const dest = join(destDir, `${name}.jpg`);
  if (existsSync(dest) && readFileSync(dest).length > 1000) continue;
  const b64 = readFileSync(join(root, "scripts/hoeren-art", `${name}.b64`), "utf8").trim();
  writeFileSync(dest, Buffer.from(b64, "base64"));
}
