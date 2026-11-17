import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: { default: "DMC Clientes", template: "%s · DMC Clientes" },
  description: "Sistema de gestión de clientes, sucursales y equipos de Grupo DMC.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#762282" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
