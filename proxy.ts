import { NextResponse, type NextRequest } from "next/server";
import { cabecerasCors } from "@/lib/cors";
import { decode, SESSION_COOKIE } from "@/lib/server/session";

/* Primera barrera: sin sesión firmada de la superficie correcta no se entra
   al panel ni al portal. Cada layout vuelve a verificar (defensa en capas).
   En /api/* solo se resuelve CORS (lib/cors.ts): cada ruta hace su propia
   autorización (sesión, o token en /api/salud). */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const cors = cabecerasCors(req.headers.get("origin"));
    if (req.method === "OPTIONS") return new NextResponse(null, { status: cors ? 204 : 403, headers: cors ?? {} });
    const r = NextResponse.next();
    if (cors) for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
    return r;
  }

  const surface = pathname.startsWith("/panel") ? "panel" : pathname.startsWith("/portal") ? "portal" : null;
  if (!surface) return NextResponse.next();
  const ses = decode(req.cookies.get(SESSION_COOKIE)?.value);
  if (ses?.k === surface) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/panel/:path*", "/portal/:path*", "/api/:path*"] };
