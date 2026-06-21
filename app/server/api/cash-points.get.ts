import { defineCachedEventHandler } from '#imports'
import { parseBcuCsv, type CashPoint } from '../utils/cashPoints'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
const SOURCES: { network: 'abitab' | 'redpagos'; url: string; encoding: BufferEncoding }[] = [
  { network: 'abitab', url: 'https://www.abitab.com.uy/datos-abiertos/sucursales-y-puntos-de-atencion.csv', encoding: 'utf-8' },
  { network: 'redpagos', url: 'https://redpagos.com.uy/datos-abiertos/sucursales-y-puntos-de-atencion.csv', encoding: 'utf-8' },
]

// Cached 1 day; the source CSVs change rarely. Each source fails independently.
export default defineCachedEventHandler(
  async () => {
    const all: CashPoint[] = []
    for (const s of SOURCES) {
      try {
        const buf = await $fetch<ArrayBuffer>(s.url, {
          responseType: 'arrayBuffer',
          headers: { 'user-agent': UA },
          timeout: 20000,
        })
        const text = Buffer.from(buf).toString(s.encoding)
        all.push(...parseBcuCsv(text, s.network))
      } catch (err) {
        console.error(`[/api/cash-points] ${s.network} fetch failed:`, err)
      }
    }
    return all
  },
  { maxAge: 86400, name: 'cash-points', getKey: () => 'all' }
)
