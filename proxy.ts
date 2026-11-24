import { NextResponse, type NextRequest } from "next/server";
import { cabecerasCors } from "@/lib/cors";
import { RUTA_MANTENIMIENTO, mantenimientoDmc, respuestaMantenimiento } from "@/lib/mantenimiento";
import { decode, SESSION_COOKIE } from "@/lib/server/session";

/* Primera barrera: sin sesión firmada de la superficie correcta no se entra
   al panel ni al portal. Cada layout vuelve a verificar (defensa en capas).
   En /api/* se resuelve CORS (lib/cors.ts) y, en mantenimiento, se rechaza a
   las cuentas DMC; cada ruta hace además su propia autorización (sesión, o
   token en /api/salud).
   Mantenimiento (MAINTENANCE_DMC_USERS=true): una sesión del equipo DMC
   (k = "panel") solo puede ver /mantenimiento; la API le responde 503. */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ses = decode(req.cookies.get(SESSION_COOKIE)?.value);
  const dmcEnMantenimiento = ses?.k === "panel" && mantenimientoDmc();

  if (pathname.startsWith("/api/")) {
    const cors = cabecerasCors(req.headers.get("origin"));
    if (req.method === "OPTIONS") return new NextResponse(null, { status: cors ? 204 : 403, headers: cors ?? {} });
    // /api/salud usa su propio token, no la sesión.
    const r = dmcEnMantenimiento && !pathname.startsWith("/api/salud") ? respuestaMantenimiento() : NextResponse.next();
    if (cors) for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
    return r;
  }

  const irA = (ruta: string) => {
    const url = req.nextUrl.clone();
    url.pathname = ruta;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (pathname === RUTA_MANTENIMIENTO) {
    if (!ses) return irA("/login");
    return NextResponse.next();
  }

  const surface = pathname.startsWith("/panel") ? "panel" : pathname.startsWith("/portal") ? "portal" : null;
  if (!surface) return NextResponse.next();
  if (dmcEnMantenimiento) return irA(RUTA_MANTENIMIENTO);
  if (ses?.k === surface) return NextResponse.next();
  return irA("/login");
}

export const config = { matcher: ["/panel/:path*", "/portal/:path*", "/api/:path*", "/mantenimiento"] };
