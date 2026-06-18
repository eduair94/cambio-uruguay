/** Pure builder for the daily personalized Telegram summary. */
export function buildSummary(
  favorites: Array<{ type: string; key: string; label?: string }>,
  _rates: unknown[]
): string {
  if (!favorites.length) {
    return 'Buen día 👋 Todavía no marcaste favoritos. Guardá tus casas en cambio-uruguay.com/cuenta.'
  }
  const lines = favorites.map(f => `⭐ ${f.label || f.key}`).join('\n')
  return `Buen día 👋 Tus favoritos:\n${lines}\n\nVer cotizaciones: cambio-uruguay.com`
}
