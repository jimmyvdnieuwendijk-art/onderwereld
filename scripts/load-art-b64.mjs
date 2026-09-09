import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function jpegB64(text) {
  const t = text.trim();
  if (t.length < 1000) return "";
  let buf;
  try {
    buf = Buffer.from(t, "base64");
  } catch {
    return "";
  }
  if (buf.length < 100 || buf[0] !== 0xff || buf[1] !== 0xd8) return "";
  if (buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) return "";
  return t;
}

export function loadArtB64(artDir, name) {
  for (const candidate of [join(artDir, `${name}.b64`), join(artDir, "web", `${name}.b64`)]) {
    if (!existsSync(candidate)) continue;
    const ok = jpegB64(readFileSync(candidate, "utf8"));
    if (ok) return ok;
  }
  for (const partsDir of [join(artDir, "web-parts", name), join(artDir, "parts", name)]) {
    if (!existsSync(partsDir)) continue;
    const files = readdirSync(partsDir).filter((f) => f.endsWith(".txt")).sort();
    if (!files.length) continue;
    const ok = jpegB64(files.map((f) => readFileSync(join(partsDir, f), "utf8").trim()).join(""));
    if (ok) return ok;
  }
  return "";
}
