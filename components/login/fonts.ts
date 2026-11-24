import { Figtree, Outfit } from "next/font/google";

/* Tipografías del login (autoalojadas por next/font: la CSP no permite Google Fonts en runtime). */
export const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-outfit", display: "swap" });
export const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-figtree", display: "swap" });
