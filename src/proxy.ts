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

  if ((pathname === "/inloggen" || pathname === "/registreren") && hasSession) {
    return NextResponse.redirect(new URL("/game", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/game/:path*", "/inloggen", "/registreren"],
};
