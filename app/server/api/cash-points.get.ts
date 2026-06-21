import { defineCachedEventHandler } from '#imports'
import { parseBcuCsv, type CashPoint } from '../utils/cashPoints'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

// Every Uruguayan BCU "datos abiertos" outlet CSV (semicolon-delimited, UTF-8).
// Each source fails independently; the layer degrades gracefully.
const SOURCES: { network: string; label: string; url: string }[] = [
  { network: 'abitab', label: 'Abitab', url: 'https://www.abitab.com.uy/datos-abiertos/sucursales-y-puntos-de-atencion.csv' },
  { network: 'redpagos', label: 'Redpagos', url: 'https://redpagos.com.uy/datos-abiertos/sucursales-y-puntos-de-atencion.csv' },
  { network: 'correo', label: 'Correo Uruguayo', url: 'https://www.correo.com.uy/archivos/datos-abiertos/sucursales-y-puntos-de-atencion.csv' },
  { network: 'brou', label: 'BROU', url: 'https://www.brou.com.uy/documents/20182/262917/sucursales-y-puntos-de-atencion.csv/c04f2a40-9f9a-4e10-a5c0-3b0c4edadf8e' },
  { network: 'gales', label: 'Gales', url: 'https://www.gales.com.uy/datos-abiertos/sucursales-y-puntos-de-atencion.csv' },
  { network: 'santander', label: 'Santander', url: 'https://www.santander.com.uy/sites/default/files/uploads/sucursales-y-puntos-de-atencion.csv' },
  { network: 'scotiabank', label: 'Scotiabank', url: 'https://www.scotiabank.com.uy/datos-abiertos/sucursales-y-puntos-de-atencion.csv' },
  { network: 'bbva', label: 'BBVA', url: 'https://www.bbva.com.uy/content/dam/public-web/uruguay/documents/datos-abiertos/sucursales-y-puntos-de-atencion.csv' },
  { network: 'bhu', label: 'BHU', url: 'https://www.bhu.com.uy/sites/default/files/2023-04/sucursales-y-puntos-de-atencion.csv' },
  { network: 'bandes', label: 'BANDES', url: 'https://www.bandes.com.uy/datos-abiertos/sucursales-y-puntos-de-atencion.csv' },
  { network: 'heritage', label: 'Banque Heritage', url: 'https://www.heritage.com.uy/datos-abiertos/sucursales-y-puntos-de-atencion.csv' },
]

export default defineCachedEventHandler(
  async () => {
    const results = await Promise.allSettled(
      SOURCES.map(async (s) => {
        const buf = await $fetch<ArrayBuffer>(s.url, {
          responseType: 'arrayBuffer',
          headers: { 'user-agent': UA },
          timeout: 20000,
        })
        return parseBcuCsv(Buffer.from(buf).toString('utf-8'), s.network, s.label)
      })
    )
    const all: CashPoint[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') all.push(...r.value)
      else console.error(`[/api/cash-points] ${SOURCES[i].network} failed:`, (r as PromiseRejectedResult).reason)
    })
    return all
  },
  { maxAge: 86400, name: 'cash-points', getKey: () => 'all' }
)
