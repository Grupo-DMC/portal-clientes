import { NextResponse, type NextRequest } from "next/server";
import { decode, SESSION_COOKIE } from "@/lib/server/session";

/* Primera barrera: sin sesión firmada de la superficie correcta no se entra
   al panel ni al portal. Cada layout vuelve a verificar (defensa en capas). */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const surface = pathname.startsWith("/panel") ? "panel" : pathname.startsWith("/portal") ? "portal" : null;
  if (!surface || pathname === `/${surface}/login`) return NextResponse.next();
  const ses = decode(req.cookies.get(SESSION_COOKIE)?.value);
  if (ses?.k === surface) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/${surface}/login`;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/panel/:path*", "/portal/:path*"] };
