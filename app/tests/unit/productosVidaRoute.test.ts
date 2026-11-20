import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// La ruta se lee como texto: lo que importa acá es lo que Mongo devuelve, y un `.select()` que deja
// afuera un campo que el armado necesita no rompe nada visible (PR #288: una proyección sin el campo
// mató una guarda con los tests en verde). Sin `observedAt` todo ítem fallaría el corte de 48 h y la
// página saldría sin un precio.
const SOURCE = readFileSync(
  resolve(__dirname, '../../server/api/productos-vida/index.get.ts'),
  'utf8'
)

function itemsSelect(): string {
  const find = SOURCE.indexOf('ProductosVidaItemModel.find(')
  expect(find).toBeGreaterThan(-1)
  const select = SOURCE.indexOf('.select(', find)
  return SOURCE.slice(select, SOURCE.indexOf(')', select))
}

describe('GET /api/productos-vida', () => {
  it('la proyección de los ítems trae observedAt y todo lo que el armado lee', () => {
    const select = itemsSelect()
    for (const field of [
      'category',
      'variant',
      'variantLabel',
      'variantRank',
      'newBand',
      'offers',
      'lastSeen',
      'observedAt',
    ]) {
      expect(select, field).toMatch(new RegExp(`\\b${field}: 1`))
    }
  })

  it('nunca selecciona el historial, los modelos ni lo usado, y nunca lee los avisos', () => {
    const select = itemsSelect()
    for (const field of ['history', 'products', 'usedBand']) expect(select).not.toContain(field)
    expect(SOURCE).not.toContain('ProductosVidaListing')
  })

  it('prefiltra por categoría del catálogo y por lastSeen, y acota cada consulta', () => {
    expect(SOURCE).toContain('category: { $in: [...PRODUCTOS_VIDA_SLUGS] }')
    expect(SOURCE).toContain('lastSeen: { $gte: cutoffDay }')
    expect(SOURCE.match(/\.maxTimeMS\(5_000\)/g)).toHaveLength(2)
  })

  it('el éxito se cachea 15 min; el error sale no-store y unavailable', () => {
    expect(SOURCE).toContain("'public, max-age=900, s-maxage=900, stale-while-revalidate=86400'")
    const catchBlock = SOURCE.slice(SOURCE.indexOf('} catch'))
    expect(catchBlock).toContain("setResponseHeader(event, 'cache-control', 'no-store')")
    expect(catchBlock).toContain('{ ...PRODUCTOS_VIDA_EMPTY, unavailable: true }')
    expect(SOURCE).not.toMatch(/createError|statusCode/)
  })

  it('la vista previa de dev pasa por el mismo armado y sólo existe con import.meta.dev', () => {
    expect(SOURCE).toContain('if (import.meta.dev && process.env.PRODUCTOS_VIDA_PREVIEW_FILE)')
    const preview = SOURCE.slice(SOURCE.indexOf('if (import.meta.dev'), SOURCE.indexOf('try {'))
    expect(preview).toContain('productosVidaResponse(')
    expect(preview).not.toContain('connectDb')
    expect(preview).toContain("'no-store'")
  })
})
