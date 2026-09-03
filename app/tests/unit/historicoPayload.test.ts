// El peso del SSR de la familia con más impresiones del sitio.
//
// "Lazy" no quiere decir "no se pide en el servidor": `useLazyAsyncData` no bloquea la navegación,
// pero corre igual durante el SSR y se serializa entera en `__NUXT_DATA__`. Medido en producción
// el 2026-09-03 sobre /historico/brou/usd:
//
//   página completa                2.431.146 bytes
//   de eso, __NUXT_DATA__          2.107.202 bytes
//   de eso, historico-drivers-USD  1.128.560 bytes
//            historico-analysis-USD   51.328 bytes
//            evolution-brou-usd       25.114 bytes  ← lo único que la página muestra
//
// Los dos overlays alimentan sólo el gráfico (las marcas de los días de movimiento y el callback
// `afterBody` del tooltip de Chart.js), así que nada de eso llega al HTML. Este test existe para
// que nadie los vuelva a pedir en el servidor sin darse cuenta.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'historico', '[origin]', '[currency]', '[[type]].vue'),
  'utf8'
)

/** El bloque de `useLazyAsyncData` que arranca con esta clave, hasta el paréntesis de cierre. */
function lazyBlock(key: string): string {
  const start = SOURCE.indexOf(`\`${key}`)
  expect(start, `no encontré el useLazyAsyncData de ${key}`).toBeGreaterThan(-1)
  const end = SOURCE.indexOf('\n)', start)
  return SOURCE.slice(start, end)
}

describe('los overlays del gráfico no viajan en el SSR', () => {
  it.each(['historico-analysis-', 'historico-drivers-'])('%s se pide sólo en el cliente', key => {
    expect(lazyBlock(key)).toContain('server: false')
  })

  it('el dato que la página SÍ muestra sigue siendo bloqueante', () => {
    // El contrapeso: la evolución se renderiza en el HTML (nombre de la casa, precio, tabla). Con
    // un fetch lazy el servidor devolvía un spinner y el SERP no veía nada — ya pasó una vez.
    const start = SOURCE.indexOf('`evolution-${route.params.origin}')
    expect(start).toBeGreaterThan(-1)
    expect(SOURCE.slice(start - 200, start)).toContain('await useAsyncData')
  })
})
