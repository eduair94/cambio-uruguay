// La página por categoría de /equipar-casa-uruguay/<categoria> y el índice que la enlaza.
//
// Como los demás tests de página del repo, lee el TEXTO del archivo: lo que hay que garantizar es
// que la plantilla y el setup declaren el contrato (404 real, datos recortados en `transform`, un
// solo H1, canonical absoluto sin prefijo de idioma, JSON-LD con migas), no reproducir un render.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES = join(__dirname, '..', '..', 'pages')
const DIR = join(PAGES, 'equipar-casa-uruguay')
const CATEGORY_FILE = join(DIR, '[categoria].vue')
const INDEX_FILE = join(DIR, 'index.vue')

const read = (file: string): string => (existsSync(file) ? readFileSync(file, 'utf8') : '')

/** El bloque `definePageMeta({...})` completo. */
function pageMeta(src: string): string {
  const at = src.indexOf('definePageMeta(')
  if (at < 0) return ''
  return src.slice(at, src.indexOf('\n})', at))
}

/** Lo que va entre el primer `<template>` y su cierre de nivel superior, sin comentarios. */
function template(src: string): string {
  const start = src.indexOf('<template>')
  const end = src.indexOf('\n</template>', start)
  if (start < 0 || end < 0) return ''
  return src.slice(start + '<template>'.length, end).replace(/<!--[\s\S]*?-->/g, '')
}

describe('la familia vive en un directorio', () => {
  it('el índice se movió a equipar-casa-uruguay/index.vue', () => {
    // Si quedaran `equipar-casa-uruguay.vue` Y el directorio, Nuxt los anida como padre/hijo y la
    // página por categoría sólo se vería adentro de un <NuxtPage> que el índice no tiene.
    expect(existsSync(join(PAGES, 'equipar-casa-uruguay.vue'))).toBe(false)
    expect(existsSync(INDEX_FILE)).toBe(true)
    expect(existsSync(CATEGORY_FILE)).toBe(true)
  })
})

describe('[categoria].vue', () => {
  const src = read(CATEGORY_FILE)
  const script = src.slice(src.indexOf('<script setup'))

  it('valida el slug en definePageMeta con la función importada', () => {
    const meta = pageMeta(src)
    expect(meta).toContain('validate')
    expect(meta).toContain('isEquiparCategorySlug')
    // `definePageMeta` es una macro: sólo puede ver imports, no constantes del módulo.
    expect(script).toMatch(/import\s*\{[^}]*\bisEquiparCategorySlug\b[^}]*\}\s*from/)
  })

  it('pide los datos con useFetch, key por categoría y transform', () => {
    const at = src.indexOf('useFetch(')
    expect(at).toBeGreaterThan(-1)
    const block = src.slice(at, at + 900)
    expect(block).toMatch(/key:\s*`equipar-cat-\$\{/)
    expect(block).toContain('transform:')
  })

  it('tiene exactamente un H1', () => {
    expect(template(src).match(/<h1[\s>]/g) ?? []).toHaveLength(1)
  })

  it('la raíz de la plantilla es un VContainer', () => {
    expect(template(src).trimStart().startsWith('<VContainer')).toBe(true)
  })

  it('declara SEO propio con canonical absoluto sin prefijo de idioma', () => {
    expect(src).toMatch(/useSeoMeta\s*\(/)
    expect(src).toMatch(/rel:\s*'canonical'/)
    expect(src).toContain('https://cambio-uruguay.com/equipar-casa-uruguay/')
    expect(src).toContain("defineOgImageComponent('Cambio'")
  })

  it('emite BreadcrumbList e ItemList de Product con Offer, nunca AggregateRating', () => {
    expect(src).toContain('application/ld+json')
    expect(src).toContain('BreadcrumbList')
    expect(src).toContain("'@type': 'ItemList'")
    expect(src).toContain("'@type': 'Product'")
    expect(src).toContain("'@type': 'Offer'")
    expect(src).toContain("priceCurrency: 'UYU'")
    expect(src).not.toContain('AggregateRating')
  })

  it('usa FaqSection y el gráfico de líneas auto-importado', () => {
    expect(src).toContain('<FaqSection')
    expect(src).toContain('<ChartsLineChart')
  })

  it('los enlaces a tiendas salen en pestaña nueva y sin pasar autoridad', () => {
    const tpl = template(src)
    expect(tpl).toContain('target="_blank"')
    expect(tpl).toContain('rel="nofollow noopener"')
  })

  it('no vuelve a tipear lo que ya vive en equiparCategoryPages.ts', () => {
    // La ventana del Plan Redondo y la concordancia de género tenían dos copias: la del FAQ y la
    // de la página. Una se iba a actualizar sin la otra.
    expect(src).toContain('EQUIPAR_PLAN_REDONDO_WINDOW')
    expect(src).not.toMatch(/\b\d{1,2}\/\d{1,2}\/20\d\d\b/)
    expect(src).toContain('equiparGrammarFor(')
    expect(src).not.toContain('FEMININE_WATTS')
  })

  it('conserva la foto del producto y la declara en el Product', () => {
    const at = src.indexOf('transform:')
    expect(src.slice(at, at + 900)).not.toMatch(/products:[\s\S]*image:\s*null/)
    expect(src).toMatch(/image:\s*row\.product\.image/)
  })

  it('no anuncia usados donde el usado no se recomienda', () => {
    const at = src.indexOf('const usedCount')
    expect(at).toBeGreaterThan(-1)
    expect(src.slice(at, at + 300)).toContain('usedOk')
  })

  it('la tabla de modelos (y su JSON-LD) filtra productos por debajo de la banda', () => {
    // Documentos viejos traen productos armados con avisos que la banda descartaba; la página se
    // despliega antes que el backend que deja de escribirlos.
    const at = script.indexOf('const productRows')
    expect(at).toBeGreaterThan(-1)
    expect(script.slice(at, at + 400)).toContain('equiparPlausibleProducts(item)')
    expect(script).toMatch(
      /import\s*\{[^}]*\bequiparPlausibleProducts\b[^}]*\}\s*from '~\/utils\/equipar'/
    )
  })

  it('el aviso de sospechosos no promete sólo por una lista', () => {
    // Con los productos filtrados, lo sospechoso no encabeza ninguna lista de la página.
    expect(template(src)).not.toContain('no encabezan esta lista')
  })

  it('la ventana del Plan Redondo sólo se dice donde la categoría entra', () => {
    // "Los microondas están excluidos del plan. Rige para compras… el descuento se acredita…" se
    // leía como que sí entraban.
    expect(script).toContain('equiparPlanRedondoWindowApplies(page.value)')
    const tpl = template(src)
    const at = tpl.indexOf('Rige para compras')
    expect(at).toBeGreaterThan(-1)
    const opening = tpl.lastIndexOf('<p', at)
    expect(tpl.slice(opening, at)).toContain('v-if="planRedondoWindow"')
  })

  it('escribe las fechas con la grafía uruguaya', () => {
    expect(src).not.toMatch(/septiembre/i)
    expect(src).toContain('dateLocale(')
  })
})

describe('index.vue enlaza cada tarjeta de categoría', () => {
  it('arma el enlace con localePath a la página de la categoría', () => {
    expect(read(INDEX_FILE)).toContain('localePath(`/equipar-casa-uruguay/${')
  })

  it('el texto del enlace usa el plural de la categoría ("Ver precios de heladeras")', () => {
    expect(read(INDEX_FILE)).toContain("'{plural}'")
    expect(read(join(__dirname, '..', '..', 'utils', 'equiparEs.ts'))).toContain(
      "categoryLink: 'Ver precios de {plural}'"
    )
  })
})
