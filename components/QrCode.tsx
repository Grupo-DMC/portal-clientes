"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR real (escaneable) del acceso al portal del local. */
export function QrCode({ text, size = 200 }: { text: string; size?: number }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1f1c21", light: "#ffffff" } }).then((s) => { if (live) setSvg(s); });
    return () => { live = false; };
  }, [text]);
  return (
    <div className="bg-white p-[14px]" style={{ width: size + 28, height: size + 28 }}>
      <div role="img" aria-label={`Código QR que abre ${text}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", `<svg width="${size}" height="${size}" `) }} />
    </div>
  );
}

/** Descarga el QR como PNG listo para imprimir. */
export async function downloadQr(text: string, name: string) {
  const url = await QRCode.toDataURL(text, { margin: 2, width: 1024, errorCorrectionLevel: "M", color: { dark: "#1f1c21", light: "#ffffff" } });
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
}
