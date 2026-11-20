// Piezas puras del conversor de la home (`pages/index.vue`), aparte para poder testearlas.

/**
 * Un solo `Intl.NumberFormat` para todo el módulo. La página lo construía en CADA llamada, unas
 * quince por render, y cada toque del conversor re-renderiza la página entera. Los argumentos son
 * fijos, así que compartir la instancia (también entre pedidos del servidor) no cambia nada de lo
 * que imprime. Se crea a la primera llamada y no al importar, para que un entorno sin la moneda
 * caiga en el respaldo de abajo en vez de romper la carga del módulo.
 */
let uyuFormatter: Intl.NumberFormat | null = null

/** `$ 1.234,50`: el símbolo siempre adelante, aunque el motor imprima "UYU". */
export function formatUyuCurrency(value: number): string {
  try {
    uyuFormatter ??= new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    let formatted = uyuFormatter.format(value)

    // Handle different mobile formats that might show UYU instead of $
    if (formatted.includes('UYU')) {
      formatted = formatted.replace(/UYU/g, '$')
      // If $ is at the end, move it to the front
      if (formatted.endsWith('$')) {
        formatted = '$ ' + formatted.replace(/\$$/, '').trim()
      }
      // Ensure there's always a space after $
      if (formatted.startsWith('$') && !formatted.startsWith('$ ')) {
        formatted = formatted.replace(/^\$/, '$ ')
      }
      formatted = formatted.replace(/\s+/g, ' ').trim()
    }

    return formatted
  } catch {
    return `$ ${value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

/**
 * La moneda que queda en un selector del conversor después de un cambio.
 *
 * Los dos selectores de moneda se pueden vaciar (la cruz de `clearable` emite `null`), y con una
 * moneda vacía el conversor quedaba en un estado que no convierte nada: "Encontrar mejor
 * cotización" copiaba el vacío y el resultado y las listas de casas desaparecían. Vaciar no es
 * elegir: vuelve la moneda anterior, y si tampoco había una, la de respaldo.
 */
export function keepCurrency(
  next: string | null | undefined,
  previous: string | null | undefined,
  fallback: string
): string {
  if (typeof next === 'string' && next.trim()) return next
  if (typeof previous === 'string' && previous.trim()) return previous
  return fallback
}
