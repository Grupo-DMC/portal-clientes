/* Imágenes de PRUEBA dibujadas en SVG. En producción, las fotos y videos llegan como URLs desde el sistema. */

export function testImage(tema, n, w = 400, h = 300) {
  const seed = (n * 37) % 11;
  if (tema === 'modulo') {
    const rot = (seed % 5) - 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
      <rect width="${w}" height="${h}" fill="#1E2A22"/>
      <g transform="rotate(${rot} ${w / 2} ${h / 2})">
        <rect x="-20" y="-20" width="${w + 40}" height="${h + 40}" fill="#1F5A3A"/>
        ${Array.from({ length: 9 }, (_, i) => `<rect x="${20 + i * 42}" y="${18 + (i % 3) * 6}" width="10" height="26" rx="2" fill="#B8C2B0"/>`).join('')}
        <rect x="${60 + seed * 6}" y="78" width="190" height="130" rx="6" fill="#EDEEE8"/>
        <rect x="${78 + seed * 6}" y="96" width="120" height="10" rx="2" fill="#3A3A3A"/>
        <rect x="${78 + seed * 6}" y="114" width="90" height="8" rx="2" fill="#6A6A6A"/>
        <rect x="${78 + seed * 6}" y="132" width="52" height="52" fill="#2B2B2B"/>
        <rect x="${86 + seed * 6}" y="140" width="14" height="14" fill="#EDEEE8"/><rect x="${108 + seed * 6}" y="160" width="14" height="14" fill="#EDEEE8"/>
        <rect x="${150 + seed * 6}" y="140" width="80" height="8" rx="2" fill="#6A6A6A"/>
        <rect x="290" y="120" width="70" height="46" rx="4" fill="#2E2E2E"/>
        <circle cx="${300 - seed * 4}" cy="235" r="6" fill="#FF4D3D"/><circle cx="${322 - seed * 4}" cy="235" r="6" fill="#4DFF7A"/>
        ${Array.from({ length: 6 }, (_, i) => `<circle cx="${40 + i * 22}" cy="258" r="5" fill="#C9A227"/>`).join('')}
      </g>
    </svg>`;
  }
  const pal = tema === 'acceso' ? ['#CFC6BC', '#E9E3DB'] : ['#2A2430', '#EDE6EF'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
    <rect width="${w}" height="${h}" fill="${pal[0]}"/>
    <rect y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="${pal[1]}"/>
    <rect x="${w * 0.12}" y="${h * 0.12}" width="${w * 0.76}" height="${h * 0.5}" fill="#3B3340"/>
    <rect x="${w * 0.12}" y="${h * 0.12}" width="${w * 0.76}" height="${h * 0.07}" fill="#D8263A"/>
    ${Array.from({ length: 7 }, (_, i) => `<rect x="${w * 0.16 + i * w * 0.1}" y="${h * 0.26}" width="${w * 0.06}" height="${h * 0.3}" fill="${['#E84C8B', '#F2F2F2', '#9A9A9A', '#E84C8B'][i % 4]}" opacity=".85"/>`).join('')}
    ${[0.3, 0.5, 0.7].map((x) => `<rect x="${w * x - 5}" y="${h * 0.38}" width="10" height="${h * 0.34}" rx="3" fill="#E8E8EE" stroke="#8C8C9A"/>`).join('')}
  </svg>`;
}

export const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
