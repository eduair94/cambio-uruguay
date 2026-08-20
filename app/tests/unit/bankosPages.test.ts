// Las páginas individuales de descuentos son 26 URLs generadas de dos catálogos escritos a mano
// (`BANKOS_BANK_PAGES`, `BANKOS_CATEGORY_PAGES`) cruzados con datos vivos de Bankos. Tres cosas
// se pudren en silencio y estos casos son la alarma:
//
//  1. un emisor nuevo en Bankos sin página, o una página apuntando a un emisor que ya no existe;
//  2. un link interno del texto que apunta a una página borrada (SEO tirado a la basura, y el
//     lector cae en un 404 desde una página que sí rankea);
//  3. la reducción por marca: los `BrandOffer.credit/debit` son ÍNDICES dentro de `tiers`, así
//     que cualquier reordenamiento que no reescriba las referencias hace que la página muestre
//     el descuento de otro emisor. Ese bug existió durante la implementación y por eso se ata acá.
import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

import { BANKOS_BANKS } from '../../utils/bankos'
import { reduceBrands, type BrandsRawData } from '../../utils/bankosBrands'
import {
  BANKOS_BANK_PAGES,
  BANKOS_CATEGORY_PAGES,
  BANKOS_SHARED_FAQ,
  bankPageForBankId,
  bankPageSlugs,
  categoryPageForCategory,
  categoryPageSlugs,
  getBankPage,
  getCategoryPage,
} from '../../utils/bankosPages'

const PAGES_DIR = join(__dirname, '..', '..', 'pages')

function pageFiles(dir: string = PAGES_DIR): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return pageFiles(full)
    if (!name.endsWith('.vue')) return []
    return [relative(PAGES_DIR, full).split(sep).join('/')]
  })
}

const staticRoutes = new Set(
  pageFiles()
    .filter(f => !f.includes('['))
    .map(f => `/${f.replace(/\.vue$/, '').replace(/(^|\/)index$/, '')}`.replace(/\/$/, '') || '/')
)

/** Rutas dinámicas a las que el texto puede enlazar legítimamente. */
const DYNAMIC_PREFIXES = ['/importar/', '/guias/', '/temas/', '/glosario/', '/convertir/']

describe('catálogo de páginas de descuentos', () => {
  it('tiene una página por emisor de Bankos, y ninguna de más', () => {
    const catalogIds = BANKOS_BANKS.map(b => b.id).sort()
    const pageIds = BANKOS_BANK_PAGES.map(p => p.bankId).sort()
    expect(pageIds).toEqual(catalogIds)
  })

  it('no repite slugs ni entre emisores ni entre rubros', () => {
    const bankSlugs = bankPageSlugs()
    expect(new Set(bankSlugs).size).toBe(bankSlugs.length)
    const catSlugs = categoryPageSlugs()
    expect(new Set(catSlugs).size).toBe(catSlugs.length)
    // Un rubro y un emisor con el mismo slug convivirían en rutas distintas, pero el lector no
    // los distinguiría y el hub enlazaría a la equivocada.
    expect(bankSlugs.filter(s => catSlugs.includes(s))).toEqual([])
  })

  it('usa slugs de URL, sin mayúsculas ni acentos ni espacios', () => {
    for (const slug of [...bankPageSlugs(), ...categoryPageSlugs()]) {
      expect(slug, slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('no repite la categoría de Bankos en dos rubros', () => {
    const cats = BANKOS_CATEGORY_PAGES.map(p => p.category)
    expect(new Set(cats).size).toBe(cats.length)
  })

  it('deja "Otros" deliberadamente afuera', () => {
    // Es el cajón de sastre del catálogo: una página titulada "Descuentos en Otros" no contesta
    // ninguna búsqueda. Si alguien la agrega, que sea a propósito y borrando este caso.
    expect(BANKOS_CATEGORY_PAGES.some(p => p.category === 'Otros')).toBe(false)
  })

  it('escribe el texto completo de cada página', () => {
    for (const page of BANKOS_BANK_PAGES) {
      expect(page.h1.length, page.slug).toBeGreaterThan(15)
      expect(page.seoTitle.length, page.slug).toBeGreaterThan(15)
      // Google recorta el title cerca de los 60 caracteres; el sufijo del sitio se suma después.
      expect(page.seoTitle.length, page.slug).toBeLessThanOrEqual(65)
      expect(page.seoDescription.length, page.slug).toBeGreaterThan(80)
      expect(page.intro.length, page.slug).toBeGreaterThan(120)
      expect(page.howItWorks.length, page.slug).toBeGreaterThan(120)
      expect(page.watchOut.length, page.slug).toBeGreaterThan(80)
      expect(page.keywords.length, page.slug).toBeGreaterThanOrEqual(4)
      expect(page.faq.length, page.slug).toBeGreaterThanOrEqual(1)
      expect(page.related.length, page.slug).toBeGreaterThanOrEqual(2)
    }
    for (const page of BANKOS_CATEGORY_PAGES) {
      expect(page.h1.length, page.slug).toBeGreaterThan(15)
      expect(page.seoTitle.length, page.slug).toBeLessThanOrEqual(65)
      expect(page.seoDescription.length, page.slug).toBeGreaterThan(80)
      expect(page.intro.length, page.slug).toBeGreaterThan(100)
      expect(page.icon, page.slug).toMatch(/^mdi-/)
      expect(page.keywords.length, page.slug).toBeGreaterThanOrEqual(3)
    }
  })

  it('no escribe cifras a mano: los números los pone la lectura viva', () => {
    // Un porcentaje o un conteo escrito en el copy queda viejo en la primera semana. Lo que sí
    // vale es un número que es parte del NOMBRE de un beneficio y no una medición: "2x1 en
    // entradas" describe la mecánica del descuento del BROU en cines y no cambia con la campaña.
    // Por eso el patrón exige que el número cierre el token (le sigue espacio o puntuación).
    const NUMERIC = /(?:^|\s)\d[\d.,]*\s*%?(?=[\s.,;:)]|$)/
    for (const page of BANKOS_BANK_PAGES) {
      for (const [field, text] of Object.entries({
        intro: page.intro,
        howItWorks: page.howItWorks,
        watchOut: page.watchOut,
        seoDescription: page.seoDescription,
      })) {
        expect(NUMERIC.test(text), `${page.slug}.${field}: "${text.slice(0, 80)}…"`).toBe(false)
      }
    }
  })

  it('enlaza sólo a páginas que existen', () => {
    const links = [
      ...BANKOS_BANK_PAGES.flatMap(p => p.related.map(r => ({ from: p.slug, to: r.to }))),
      ...BANKOS_CATEGORY_PAGES.flatMap(p => p.related.map(r => ({ from: p.slug, to: r.to }))),
    ]
    const dead = links.filter(
      link =>
        !staticRoutes.has(link.to) && !DYNAMIC_PREFIXES.some(prefix => link.to.startsWith(prefix))
    )
    expect(dead).toEqual([])
  })

  it('resuelve por slug y por id, en las dos direcciones', () => {
    expect(getBankPage('itau')?.bankId).toBe('itau')
    expect(getBankPage('club-el-pais')?.bankId).toBe('clubelpais')
    expect(bankPageForBankId('mercadopago')?.slug).toBe('mercado-pago')
    expect(getBankPage('no-existe')).toBeUndefined()
    expect(getCategoryPage('farmacias')?.category).toBe('Farmacias')
    expect(categoryPageForCategory('Mercados')?.slug).toBe('supermercados')
    expect(categoryPageForCategory('Otros')).toBeUndefined()
  })

  it('da a cada página de emisor un FAQ propio además del compartido', () => {
    const sharedIds = new Set(BANKOS_SHARED_FAQ.map(f => f.id))
    for (const page of BANKOS_BANK_PAGES) {
      // Ids repetidos entre el propio y el compartido romperían la key del render y el schema.
      for (const item of page.faq) expect(sharedIds.has(item.id), item.id).toBe(false)
      expect(new Set(page.faq.map(f => f.id)).size).toBe(page.faq.length)
    }
  })
})

// ── La reducción ────────────────────────────────────────────────────────────

/**
 * Catálogo mínimo pero realista: dos emisores, tres marcas, dos rubros.
 *
 * `cafe` es exclusiva de Itaú, `super` la tienen los dos y `farma` sólo BROU. Itaú repite el mismo
 * texto en dos marcas (para probar la deduplicación) y BROU trae días.
 */
const RAW: BrandsRawData = {
  brands: {
    cafe: { brandId: 'cafe', name: 'Café Uno', categories: ['Cafeterías'] },
    super: { brandId: 'super', name: 'Super Dos', categories: ['Mercados'] },
    farma: { brandId: 'farma', name: 'Farmacia Tres', categories: ['Farmacias'] },
  },
  brandLocations: {
    cafe: ['l1', 'l2'],
    super: ['l3', 'l4', 'l5'],
    farma: ['l6'],
  },
  bankBrands: {
    itau: {
      cafe: { creditDescription: '15% con crédito Itaú', debitDescription: null },
      super: {
        creditDescription: '15% con crédito Itaú',
        debitDescription: '15% con débito Itaú Volar',
      },
    },
    brou: {
      super: {
        creditDescription: '10% con crédito BROU',
        debitDescription: null,
        availableDays: [3, 6, 7],
      },
      farma: { creditDescription: '20% con crédito BROU', debitDescription: null },
    },
  },
}

describe('reduceBrands', () => {
  it('deduplica el texto repetido en un solo tramo, sumando marcas y locales', () => {
    const out = reduceBrands(RAW, { bankIds: ['itau'] })
    const credit = out.tiers.filter(t => t.kind === 'credit')
    expect(credit).toHaveLength(1)
    expect(credit[0]!.text).toBe('15% con crédito Itaú')
    expect(credit[0]!.brands).toBe(2)
    // 2 locales del café + 3 del súper.
    expect(credit[0]!.locations).toBe(5)
  })

  it('mantiene los índices de cada marca apuntando a SU tramo después de ordenar', () => {
    const out = reduceBrands(RAW, { bankIds: ['itau', 'brou'] })
    for (const brand of out.brands) {
      for (const offer of brand.offers) {
        if (offer.credit >= 0) {
          const tier = out.tiers[offer.credit]!
          expect(tier.kind).toBe('credit')
          // El tramo tiene que ser del MISMO emisor que la oferta: es exactamente lo que se rompe
          // si se reordena `tiers` sin reescribir las referencias.
          expect(tier.bankId, `${brand.name} / ${offer.bankId}`).toBe(offer.bankId)
        }
        if (offer.debit >= 0) {
          expect(out.tiers[offer.debit]!.kind).toBe('debit')
          expect(out.tiers[offer.debit]!.bankId).toBe(offer.bankId)
        }
      }
    }
  })

  it('ordena los tramos de mayor a menor cobertura', () => {
    const out = reduceBrands(RAW)
    const counts = out.tiers.map(t => t.brands)
    expect([...counts].sort((a, b) => b - a)).toEqual(counts)
  })

  it('acota por emisor sin arrastrar el beneficio de los otros', () => {
    const out = reduceBrands(RAW, { bankIds: ['brou'] })
    expect(out.brands.map(b => b.name).sort()).toEqual(['Farmacia Tres', 'Super Dos'])
    for (const brand of out.brands) {
      expect(brand.offers.every(o => o.bankId === 'brou')).toBe(true)
    }
  })

  it('no manda el nombre ni el color del emisor en cada oferta', () => {
    // Son datos de catálogo que la página ya tiene; repetirlos por oferta engordaba el payload de
    // un rubro grande sin agregar nada. La rebanada por emisor sí los trae (diez filas).
    const out = reduceBrands(RAW)
    for (const brand of out.brands) {
      for (const offer of brand.offers) {
        expect(Object.keys(offer).sort()).toEqual(['bankId', 'credit', 'days', 'debit'])
      }
    }
    expect(out.banks[0]).toHaveProperty('bankName')
    expect(out.banks[0]).toHaveProperty('color')
  })

  it('acota por rubro', () => {
    const out = reduceBrands(RAW, { category: 'Mercados' })
    expect(out.brands).toHaveLength(1)
    expect(out.brands[0]!.name).toBe('Super Dos')
    // Los dos emisores la descuentan, así que los dos aparecen en la rebanada del rubro.
    expect(out.banks.map(b => b.bankId).sort()).toEqual(['brou', 'itau'])
  })

  it('cuenta exclusivas contra TODO el catálogo, no contra el recorte', () => {
    // En la página de Itaú, `super` NO es exclusiva aunque el recorte sólo mire a Itaú: BROU
    // también la descuenta. `cafe` sí lo es.
    const out = reduceBrands(RAW, { bankIds: ['itau'] })
    expect(out.banks[0]!.exclusive).toBe(1)
  })

  it('cuenta el débito sólo donde el emisor publica texto de débito', () => {
    const out = reduceBrands(RAW, { bankIds: ['itau'] })
    expect(out.banks[0]!.debit).toBe(1)
    const brou = reduceBrands(RAW, { bankIds: ['brou'] })
    expect(brou.banks[0]!.debit).toBe(0)
  })

  it('ordena las marcas por locales y suma bien los totales', () => {
    const out = reduceBrands(RAW)
    expect(out.brands.map(b => b.name)).toEqual(['Super Dos', 'Café Uno', 'Farmacia Tres'])
    expect(out.totals).toEqual({ brands: 3, locations: 6 })
  })

  it('conserva los días declarados y descarta la basura', () => {
    const out = reduceBrands(RAW, { bankIds: ['brou'] })
    const superRow = out.brands.find(b => b.name === 'Super Dos')!
    expect(superRow.offers[0]!.days).toEqual([3, 6, 7])
    const dirty = reduceBrands(
      {
        ...RAW,
        bankBrands: {
          brou: {
            farma: {
              creditDescription: 'x',
              debitDescription: null,
              availableDays: [0, 9, 'lunes', 3],
            },
          },
        },
      },
      { bankIds: ['brou'] }
    )
    expect(dirty.brands[0]!.offers[0]!.days).toEqual([3])
  })

  it('cuenta los rubros del recorte, no los del catálogo entero', () => {
    const out = reduceBrands(RAW, { bankIds: ['itau'] })
    expect(out.categories.map(c => c.category).sort()).toEqual(['Cafeterías', 'Mercados'])
    expect(out.categories.find(c => c.category === 'Mercados')!.locations).toBe(3)
  })
})
