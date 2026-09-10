import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";

const ISSUER = "Onderwereld";

export function newTotpSecret() {
  return new Secret({ size: 20 }).base32;
}

function totpFor(secret: string, label: string) {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

export function totpOtpauthUrl(secret: string, label: string) {
  return totpFor(secret, label).toString();
}

export async function totpQrDataUrl(secret: string, label: string) {
  return QRCode.toDataURL(totpOtpauthUrl(secret, label), {
    margin: 1,
    width: 220,
    color: { dark: "#111111", light: "#ffffff" },
  });
}

export function verifyTotp(secret: string, token: string) {
  const code = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  const delta = totpFor(secret, ISSUER).validate({ token: code, window: 1 });
  return delta !== null;
}