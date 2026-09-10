import { AVATAR_MAX_BYTES } from "@/lib/constants";

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

export function avatarPublicPath(userId: string, version: number | Date) {
  const v = typeof version === "number" ? version : version.getTime();
  return `/api/avatars/${userId}?v=${v}`;
}

export function sniffImageMime(bytes: Uint8Array): ImageMime | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function readAvatarFile(file: File) {
  if (file.size <= 0) {
    return { ok: false as const, message: "Kies een afbeelding." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false as const, message: "De afbeelding is te groot (max. 1 MB)." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffImageMime(bytes);
  if (!mimeType) {
    return { ok: false as const, message: "Alleen JPG, PNG of WebP is toegestaan." };
  }
  return { ok: true as const, bytes, mimeType };
}
