/**
 * Qué pizarras llevan días publicando el mismo precio.
 *
 * Existe para que la UI pueda advertirlo justo donde el defecto se ve: la portada ordena por "más
 * barato", y una pizarra congelada deriva al extremo de la distribución a medida que el mercado se
 * mueve, así que termina encabezando el ranking. Cuanto más vieja, más destacada.
 *
 * Comparte una sola petición entre todos los componentes de la página (`useFetch` con clave fija).
 * Si falla, devuelve un mapa vacío: la advertencia desaparece, la página sigue.
 */
import type { FrozenEntry, FrozenMap } from '~/server/api/frozen-quotes.get'

export function useFrozenQuotes() {
  const { data } = useFetch<FrozenMap>('/api/frozen-quotes', {
    key: 'frozen-quotes',
    default: () => ({ generatedAt: null, entries: {} }) as FrozenMap,
    // No bloquea el render: la cotización importa más que su advertencia, y llega en el mismo tick.
    lazy: true,
    server: true,
  })

  /**
   * Días que lleva quieta esa cotización, o `null` si se mueve.
   *
   * `type` vacío o ausente = mostrador, que es lo que la portada publica.
   */
  const frozenFor = (
    origin?: string | null,
    code?: string | null,
    type?: string | null
  ): FrozenEntry | null => {
    if (!origin || !code) return null
    return data.value?.entries?.[`${origin}|${code}|${type || ''}`] ?? null
  }

  return { frozenFor, frozenGeneratedAt: computed(() => data.value?.generatedAt ?? null) }
}
