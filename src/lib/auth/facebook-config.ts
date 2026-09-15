export function facebookCredentials() {
  const id =
    process.env.AUTH_FACEBOOK_ID?.trim() ||
    process.env.AUTH_FACEBOOK_CLIENT_ID?.trim() ||
    process.env.FACEBOOK_CLIENT_ID?.trim();
  const secret =
    process.env.AUTH_FACEBOOK_SECRET?.trim() ||
    process.env.AUTH_FACEBOOK_CLIENT_SECRET?.trim() ||
    process.env.FACEBOOK_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  return { id, secret };
}

export function isFacebookConfigured() {
  return facebookCredentials() !== null;
}
