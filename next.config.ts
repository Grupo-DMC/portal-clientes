import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// CSP: Next inyecta scripts inline para hidratar, por eso 'unsafe-inline' en
// scripts; en desarrollo además 'unsafe-eval' (React lo usa para depurar).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Como en sys_tecnicos: una instancia aparte (tests, verificación con otra
  // DATA_SOURCE) construye en otra carpeta (NEXT_DIST_DIR) para no pisar el
  // `.next` de quien esté corriendo `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["mssql", "tedious"],
  // El PDF del acta lee el logo y la tipografía Inter del disco.
  outputFileTracingIncludes: { "/api/visita/acta/[folio]": ["./public/DMC-logo.png", "./public/fonts/*.ttf"] },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "geolocation=(), camera=(self), microphone=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
