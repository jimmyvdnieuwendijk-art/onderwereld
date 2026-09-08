import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (pathname.startsWith("/game") && !hasSession) {
    const url = new URL("/inloggen", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Do not bounce /inloggen → /game on cookie presence alone. A stale
  // authjs cookie plus layout auth() failure is an infinite redirect.

  return NextResponse.next();
}

export const config = {
  matcher: ["/game/:path*", "/inloggen", "/registreren"],
};
