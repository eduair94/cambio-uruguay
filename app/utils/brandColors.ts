// app/utils/brandColors.ts
// Brand colours + monograms for the entities we quote from Reddit, shared by
// /mejores-bancos-uruguay, /tarjetas-de-debito-uruguay and
// /tarjetas-de-credito-uruguay so the same issuer looks the same everywhere.
//
// Keyed by REDDIT_ENTITIES ids (see utils/redditSentiment.ts). Colours are
// decorative (monogram chips) — approximations of each brand, not a claim.
//
// PURE module (no Vue/Nuxt) so pages, components and tests share one source.

/** Approximate brand hue per entity id. */
export const BRAND_COLORS: Readonly<Record<string, string>> = Object.freeze({
  mercadopago: '#00a5e0',
  itau: '#ec7000',
  santander: '#ec0000',
  brou: '#0072bc',
  bbva: '#1464a5',
  takenos: '#6c5ce7',
  heritage: '#0f4c81',
  astropay: '#00b487',
  scotiabank: '#d5121a',
  prex: '#ff5a1f',
  btg: '#00274d',
  hsbc: '#db0011',
  // card issuers
  oca: '#d6001c',
  midinero: '#0ea5a4',
  creditel: '#e11d48',
  passcard: '#1d4ed8',
  cabal: '#00529b',
  tiendainglesa: '#00833e',
})

/** Brand hue for an entity id, with a neutral slate fallback for anything new. */
export function brandColor(id: string): string {
  return BRAND_COLORS[id] ?? '#64748b'
}

/**
 * Pick the text colour (near-black or white) with the better contrast against a
 * background hex. Brand colours span the whole lightness range, so hardcoding
 * white would fail WCAG on the light ones (Mercado Pago, Astropay). This keeps
 * every chip legible in both themes.
 */
export function readableOn(hex: string): string {
  const h = hex.replace('#', '')
  const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const r = toLin(parseInt(h.slice(0, 2), 16) / 255)
  const g = toLin(parseInt(h.slice(2, 4), 16) / 255)
  const b = toLin(parseInt(h.slice(4, 6), 16) / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const vsWhite = 1.05 / (lum + 0.05)
  const vsBlack = (lum + 0.05) / 0.05
  return vsBlack > vsWhite ? '#0b1220' : '#ffffff'
}

/** Monogram chip style: brand background + a text colour that contrasts with it. */
export function monoStyle(id: string): { background: string; color: string } {
  const bg = brandColor(id)
  return { background: bg, color: readableOn(bg) }
}

/** Short monogram for an entity name. Multi-word brands keep their initials. */
export function monogram(name: string): string {
  const special: Record<string, string> = {
    'Mercado Pago': 'MP',
    'Banco Heritage': 'H',
    'BTG Pactual': 'BTG',
    MiDinero: 'MD',
    'Tienda Inglesa': 'TI',
  }
  if (special[name]) return special[name] as string
  if (name.startsWith('HSBC')) return 'HSBC'
  return name.slice(0, 2).toUpperCase()
}
