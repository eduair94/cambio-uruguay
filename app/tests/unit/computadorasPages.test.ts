// Contrato de fuente de `/computadoras-usadas-uruguay`, su ficha de aviso y
// `/precios-componentes-pc-uruguay`: la misma clase de comprobación que `motosPages.test.ts`, sobre
// lo que ESTA familia no puede perder.
//
// Todo lo que se vigila acá se rompe en silencio: el precio que no se renderiza en el servidor, el
// slug imposible que no 404ea antes de setup, el estado «todavía no hay datos» (que el día del
// deploy es el único que existe) y, sobre todo, un total de piezas que se imprime sin estar entero.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', '..')
const read = (path: string) => readFileSync(join(APP, path), 'utf8')
const indexSrc = read('pages/computadoras-usadas-uruguay/index.vue')
const avisoSrc = read('pages/computadoras-usadas-uruguay/aviso/[slug].vue')
const componentsSrc = read('pages/precios-componentes-pc-uruguay.vue')
const cardSrc = read('components/computadoras/ListingCard.vue')
const filtersSrc = read('components/computadoras/Filters.vue')
const breakdownSrc = read('components/computadoras/PartsBreakdown.vue')

/** El primer tag del template, salteando comentarios y espacios. */
function rootTag(source: string): string | null {
  const template = source.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? ''
  const withoutComments = template.replace(/<!--[\s\S]*?-->/g, '').trim()
  return withoutComments.match(/^<([A-Z][A-Z0-9]*)/i)?.[1] ?? null
}

/** El template sin comentarios: un comentario que nombra un patrón prohibido no lo dispara. */
function templateOf(source: string): string {
  return (source.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? '').replace(
    /<!--[\s\S]*?-->/g,
    ''
  )
}

const pages: Array<[string, string]> = [
  ['index.vue', indexSrc],
  ['aviso/[slug].vue', avisoSrc],
  ['precios-componentes-pc-uruguay.vue', componentsSrc],
]

describe.each(pages)('%s: contrato compartido', (_file, src) => {
  it('arranca en un VContainer', () => {
    expect(rootTag(src)).toBe('VContainer')
  })

  it('dibuja un solo h1: la ficha tiene uno por rama (aviso o vencido), nunca los dos', () => {
    const count = (templateOf(src).match(/<h1[\s>]/g) ?? []).length
    if (src === avisoSrc) {
      expect(count).toBe(2)
      expect(templateOf(src)).toMatch(
        /v-if="!data \|\| !computer"[\s\S]*<h1[\s\S]*v-else[\s\S]*<h1/
      )
    } else expect(count).toBe(1)
  })

  it('declara título, descripción y canonical literal y absoluto', () => {
    expect(src).toContain('useSeoMeta(')
    expect(src).toMatch(/description/)
    expect(src).toMatch(/rel: 'canonical'/)
    expect(src).toContain('https://cambio-uruguay.com')
    expect(src).not.toMatch(/canonical[^\n]*localePath/)
  })

  it('renderiza en el servidor: el precio tiene que estar en el HTML que lee el buscador', () => {
    expect(src).toMatch(/await useAsyncData/)
    expect(src).not.toContain('server: false')
  })

  it('no mete un VChip dentro de un <p>: rompería la hidratación', () => {
    expect(templateOf(src)).not.toMatch(/<p[^>]*>[\s\S]{0,400}?<VChip/)
  })

  it('no repite el FAQPage: lo emite FaqSection', () => {
    expect(src).not.toContain("'@type': 'FAQPage'")
  })

  it('nunca imprime una suma parcial de piezas', () => {
    expect(src).not.toMatch(/PartialUsd/)
  })
})

describe('index.vue: el directorio', () => {
  it('tiene un estado para «el job todavía no corrió» y otro para «no pudimos leer»', () => {
    expect(indexSrc).toContain("payload.status === 'preparing'")
    expect(indexSrc).toContain('El relevamiento está arrancando')
    expect(indexSrc).toContain("payload.status === 'unavailable'")
    expect(indexSrc).toContain('No es que no haya computadoras')
  })

  it('nunca deja `data` en null: la plantilla se dibuja igual', () => {
    expect(indexSrc).toContain('computerEmptyList(query.value')
  })

  it('no indexa las combinaciones de filtros', () => {
    expect(indexSrc).toContain('computerFiltered(query.value)')
    expect(indexSrc).toContain("'noindex, follow'")
  })

  it('dice que los precios son pedidos y que el filtro de precio va en dólares', () => {
    expect(indexSrc).toContain('no precios de venta cerrados')
    expect(indexSrc).toContain('única escala')
    expect(filtersSrc).toContain('US$ máx.')
  })

  it('tiene la forma del directorio de motos: columna, cajón, barra, chips, grilla', () => {
    const template = templateOf(indexSrc)
    expect(template).toContain('<CarsSidebarLayout')
    expect(template).toContain('<ComputadorasFilters')
    expect(template).toContain('<CarsToolbar')
    expect(template).toContain('<CarsActiveFilters')
    expect(template).toContain('<FeedEdge')
    expect(template).toContain('<FeedAd')
    expect(template).toContain('<ComputadorasListingCard')
    expect(indexSrc).toContain('definePageMeta({ wide: true })')
  })

  it('el cajón del celular vive FUERA de la grilla y nunca hay dos paneles', () => {
    const template = templateOf(indexSrc)
    expect(template.indexOf('<ComputadorasFilters')).toBeLessThan(
      template.indexOf('<CarsSidebarLayout')
    )
    expect(template).toMatch(/v-if="payload\.status === 'ok' && smAndDown"/)
    expect(template).toMatch(/v-if="!smAndDown"/)
  })

  it('el FAQ no suma otra unidad de anuncio: el directorio ya lleva la suya en la grilla', () => {
    expect(indexSrc).toMatch(/<FaqSection[\s\S]*?:ad="false"/)
  })

  it('enlaza la tabla de componentes', () => {
    expect(indexSrc).toContain('COMPUTER_COMPONENTS_PATH')
  })
})

describe('components/computadoras: la tarjeta, los filtros y el desglose', () => {
  it('la tarjeta lleva a la ficha del aviso e imprime el precio en su moneda', () => {
    expect(cardSrc).toContain('computerAvisoPath(computer.slug)')
    expect(cardSrc).toContain('computerPriceLine(props.computer)')
    expect(cardSrc).toContain('price.inferred')
  })

  it('la tarjeta resume la valuación por el único camino que no inventa totales', () => {
    expect(cardSrc).toContain('computerValuationSummary(valuation)')
  })

  it('una API vieja sin los campos nuevos no rompe la tarjeta ni el panel', () => {
    expect(cardSrc).toContain('props.computer.faults ?? []')
    expect(filtersSrc).toContain('(rows ?? [])')
    expect(filtersSrc).toContain('props.facets.cpuBrands?.length')
  })

  it('los filtros pedidos están en el panel', () => {
    for (const field of [
      'draft.q',
      'draft.tipo',
      'draft.marca',
      'draft.familia',
      'draft.placa',
      'draft.dedicada',
      'draft.ramMin',
      'draft.ssd',
      'draft.precioMinUsd',
      'draft.precioMaxUsd',
      'draft.departamento',
      'draft.fuente',
      'draft.sinFallas',
      'draft.debajo',
      'draft.dias',
    ])
      expect(filtersSrc).toContain(`v-model="${field}"`)
  })

  it('el desglose sólo escribe un total si el job lo publicó entero', () => {
    expect(breakdownSrc).toContain('valuation.newTotalUsd != null')
    expect(breakdownSrc).toContain('valuation.usedTotalUsd != null')
    expect(breakdownSrc).toContain('computerMissingLine(')
  })

  it('el desglose marca las piezas supuestas y las que entran a precio nuevo', () => {
    expect(breakdownSrc).toContain('supuesta: el aviso no la dice')
    expect(breakdownSrc).toContain('part.usedFromNew')
    expect(breakdownSrc).toContain('COMPUTER_USED_FROM_NEW_NOTE')
  })

  it('cada pieza enlaza a su fila de la tabla de componentes con el mismo ancla', () => {
    expect(breakdownSrc).toContain('computerPartLink(part.slug)')
    expect(componentsSrc).toContain(':id="computerPartAnchor(part.slug)"')
  })

  it('las tablas anchas scrollean dentro de su propio contenedor', () => {
    expect(breakdownSrc).toMatch(/\.pc-parts__scroll\s*\{[^}]*overflow-x:\s*auto/)
    expect(componentsSrc).toMatch(/\.pc-scroll\s*\{[^}]*overflow-x:\s*auto/)
  })
})

describe('aviso/[slug].vue: la ficha del aviso', () => {
  it('un slug imposible 404ea antes de entrar a setup', () => {
    expect(avisoSrc).toContain('definePageMeta(')
    expect(avisoSrc).toContain('computerAvisoSlugValid(')
  })

  it('no se indexa: un aviso vence en días', () => {
    expect(avisoSrc).toContain("robots: 'noindex, follow'")
  })

  it('un fallo de base no se sirve como 404', () => {
    expect(avisoSrc).toContain('failureCode')
    expect(avisoSrc).toContain('no-store')
  })

  it('sobrevive a un aviso vencido sin lecturas ansiosas', () => {
    expect(avisoSrc).toContain('data.value?.computer ?? null')
    expect(avisoSrc).not.toContain('data.value!.')
  })

  it('dice de dónde salió cada dato y que no está verificado', () => {
    expect(avisoSrc).toContain('COMPUTER_BASIS_LABEL[')
    expect(avisoSrc).toContain('no lo verificamos')
    expect(avisoSrc).toContain('computerSeriesYearText(')
  })

  it('enlaza el original sólo si es de una fuente conocida', () => {
    expect(avisoSrc).toContain('computerSafePermalink(')
    expect(avisoSrc).toContain('rel="nofollow noopener"')
  })

  it('contra piezas nuevas publica la cifra sin veredicto', () => {
    expect(avisoSrc).toContain('data-testid="pc-ratio-new"')
    expect(avisoSrc).toContain('Sin veredicto')
  })

  it('no compara lo que el job se negó a juzgar', () => {
    expect(avisoSrc).toContain('computer.currencyInferred')
    expect(avisoSrc).toContain('No lo comparamos')
  })

  it('explica de dónde salen los precios de las piezas y cuándo se leyeron', () => {
    expect(avisoSrc).toContain('data-testid="pc-method-note"')
    expect(avisoSrc).toContain('Mercado Libre Uruguay')
  })
})

describe('precios-componentes-pc-uruguay.vue: la tabla de componentes', () => {
  it('se indexa: no declara robots propio', () => {
    expect(componentsSrc).not.toMatch(/robots:/)
  })

  it('una PC tipo sin todas sus piezas no publica total, dice qué falta', () => {
    expect(componentsSrc).toContain('preset.totalUsd != null')
    expect(componentsSrc).toContain('preset.missing')
  })

  it('la oferta más barata sólo se enlaza con una URL https segura, y dice dónde está', () => {
    expect(componentsSrc).toContain('computerSafeOfferUrl(')
    expect(componentsSrc).toContain('computerOfferHost(')
    expect(componentsSrc).toContain('rel="nofollow noopener"')
  })

  it('tiene los dos estados de «sin datos»', () => {
    expect(componentsSrc).toContain("payload.status === 'preparing'")
    expect(componentsSrc).toContain("payload.status === 'unavailable'")
    expect(componentsSrc).toContain('computerEmptyComponents(')
  })
})

// ── Ronda 2 (24/11/2026): las dos páginas nuevas de la familia ─────────────

const dealsSrc = read('pages/oportunidades-computadoras-usadas-uruguay.vue')
const notebooksSrc = read('pages/precios-notebooks-usadas-uruguay.vue')
const reportTableSrc = read('components/computadoras/ReportTable.vue')

describe.each([
  ['oportunidades-computadoras-usadas-uruguay.vue', dealsSrc],
  ['precios-notebooks-usadas-uruguay.vue', notebooksSrc],
])('%s: contrato compartido', (_file, src) => {
  it('arranca en un VContainer, con un solo h1', () => {
    expect(rootTag(src)).toBe('VContainer')
    expect(templateOf(src).match(/<h1[\s>]/g) ?? []).toHaveLength(1)
  })

  it('canonical literal, título y descripción dentro del presupuesto del SERP', () => {
    expect(src).toMatch(/rel: 'canonical'/)
    expect(src).toContain('https://cambio-uruguay.com')
    const title = src.match(/const TITLE = '([^']+)'/)?.[1] ?? ''
    expect(`${title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    const description = src.match(/const DESCRIPTION =\s*'([^']+)'/)?.[1] ?? ''
    expect(description.length).toBeGreaterThan(80)
    expect(description.length).toBeLessThanOrEqual(155)
  })

  it('renderiza en el servidor y tiene los estados de «sin datos»', () => {
    expect(src).toMatch(/await useAsyncData/)
    expect(src).not.toContain('server: false')
    expect(src).toContain("payload.status === 'preparing'")
    expect(src).toContain("payload.status === 'unavailable'")
  })

  it('dice que son precios pedidos y enlaza a las otras páginas de la familia', () => {
    expect(src).toMatch(/pedid/)
    expect(src).toContain('COMPUTADORAS_PATH')
    expect(src).toContain('COMPUTER_COMPONENTS_PATH')
  })

  it('no repite el FAQPage: lo emite FaqSection', () => {
    expect(src).toContain('<FaqSection')
    expect(src).not.toContain("'@type': 'FAQPage'")
  })
})

describe('oportunidades-computadoras-usadas-uruguay.vue', () => {
  it('tiene la forma de las oportunidades de autos: columna, cajón, barra, chips, grilla', () => {
    const template = templateOf(dealsSrc)
    expect(template).toContain('<CarsSidebarLayout')
    expect(template).toContain('<CarsFilterPanel')
    expect(template).toContain('<CarsToolbar')
    expect(template).toContain('<CarsActiveFilters')
    expect(template).toContain('<ComputadorasListingCard')
    expect(template).toContain('<FeedAd')
    expect(dealsSrc).toContain('definePageMeta({ wide: true })')
    expect(template.indexOf('v-if="payload.status === \'ok\' && smAndDown"')).toBeLessThan(
      template.indexOf('<CarsSidebarLayout')
    )
  })

  it('el resumen describe la lista entera y la URL filtrada no se indexa', () => {
    expect(dealsSrc).toContain('computerDealSummaryText(payload.summary)')
    expect(dealsSrc).toContain('computerDealFiltered(query.value)')
    expect(dealsSrc).toContain("'noindex, follow'")
  })

  it('explica qué es una oportunidad y advierte que no es una tasación', () => {
    expect(dealsSrc).toContain('entre el 15 % y el 55 % menos')
    expect(dealsSrc).toContain('No es una tasación ni una garantía')
    expect(dealsSrc).toContain('leímos su propia')
  })

  it('el FAQ no suma otra unidad: la grilla ya lleva la suya', () => {
    expect(dealsSrc).toMatch(/<FaqSection[\s\S]*?:ad="false"/)
  })
})

describe('precios-notebooks-usadas-uruguay.vue', () => {
  it('las frases de «lo que dicen los datos» salen del informe, no de números escritos', () => {
    expect(notebooksSrc).toContain('computerNotebookFindings(report.value)')
    expect(templateOf(notebooksSrc)).not.toMatch(/US\$ \d/)
  })

  it('cada tabla del informe enlaza al directorio con sus filtros', () => {
    for (const filter of ['marcaEquipo', 'familia', 'linea', 'ramMin', 'dedicada'])
      expect(notebooksSrc).toContain(filter)
    expect(notebooksSrc).toContain('computerNotebookLink(')
  })

  it('la usada contra la nueva se esconde con menos de dos filas', () => {
    expect(notebooksSrc).toContain('report.usedVsNew.length >= 2')
  })

  it('dice el método: muestra mínima, sin fallas, la mitad sin procesador', () => {
    expect(notebooksSrc).toContain('report.minSample')
    expect(notebooksSrc).toContain('report.ladderSample')
    expect(notebooksSrc).toContain('no dice el procesador')
  })

  it('las tablas scrollean dentro de su propio contenedor', () => {
    expect(reportTableSrc).toMatch(/\.nb-table-scroll\s*\{[^}]*overflow-x:\s*auto/)
    expect(notebooksSrc).toMatch(/\.pc-scroll\s*\{[^}]*overflow-x:\s*auto/)
  })
})

describe('el directorio después de la ronda 2', () => {
  it('lleva a las oportunidades y a los precios de notebooks', () => {
    expect(indexSrc).toContain('COMPUTER_OPPORTUNITIES_PATH')
    expect(indexSrc).toContain('COMPUTER_NOTEBOOKS_PATH')
  })

  it('los filtros nuevos están en el panel', () => {
    for (const field of [
      'draft.marcaEquipo',
      'draft.linea',
      'draft.cpuAnio',
      'draft.ramTipo',
      'draft.discoMin',
      'draft.pantalla',
      'draft.vramMin',
      'draft.estado',
      'draft.vendedor',
      'draft.conDatos',
      'draft.monitor',
      'draft.oportunidad',
      'draft.evidencia',
    ])
      expect(filtersSrc).toContain(`v-model="${field}"`)
  })

  it('la tarjeta muestra la oportunidad y la línea, con piso para una API vieja', () => {
    expect(cardSrc).toContain('props.computer.opportunity ?? null')
    expect(cardSrc).toContain('computerIdentityLine(props.computer)')
  })
})
