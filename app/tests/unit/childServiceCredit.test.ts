import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CHILD_CREDIT_PATH,
  CHILD_CREDIT_SOURCES,
  CHILD_CREDIT_VERIFIED_AT,
  CREDIT_SCHEMES,
  EXTRA_YEARS_PER_SEVERE_DISABILITY,
  MAX_YEARS,
  MIN_SPLIT_MONTHS,
  YEARS_PER_CHILD,
  childServiceCredit,
} from '../../utils/childServiceCredit'

const PAGE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'computo-por-hijo-jubilacion-uruguay.vue'),
  'utf8'
)

describe('las constantes son las del artículo 43 de la Ley 20.130', () => {
  it('un año por hijo, con un máximo total de cinco', () => {
    expect(YEARS_PER_CHILD).toBe(1)
    expect(MAX_YEARS).toBe(5)
  })

  it('dos años adicionales por hijo con discapacidad severa, y seis meses el mínimo de división', () => {
    expect(EXTRA_YEARS_PER_SEVERE_DISABILITY).toBe(2)
    expect(MIN_SPLIT_MONTHS).toBe(6)
  })
})

describe('childServiceCredit', () => {
  it('suma un año por hijo mientras no llegue al tope', () => {
    expect(childServiceCredit({ children: 0, severeDisability: 0 })).toMatchObject({
      baseYears: 0,
      extraYears: 0,
      totalYears: 0,
      cappedBase: false,
    })
    expect(childServiceCredit({ children: 3, severeDisability: 0 })).toMatchObject({
      baseYears: 3,
      totalYears: 3,
      cappedBase: false,
    })
  })

  it('topea el numeral 1 en cinco años y lo dice', () => {
    expect(childServiceCredit({ children: 5, severeDisability: 0 })).toMatchObject({
      baseYears: 5,
      cappedBase: false,
    })
    expect(childServiceCredit({ children: 8, severeDisability: 0 })).toMatchObject({
      baseYears: 5,
      totalYears: 5,
      cappedBase: true,
    })
  })

  // El numeral 2 dice que el adicional «no se computará a efectos del máximo indicado
  // precedentemente»: es la parte que un tope único sobre la suma rompería en silencio.
  it('deja el adicional por discapacidad severa FUERA del tope de cinco', () => {
    expect(childServiceCredit({ children: 8, severeDisability: 2 })).toMatchObject({
      baseYears: 5,
      extraYears: 4,
      totalYears: 9,
    })
    expect(childServiceCredit({ children: 1, severeDisability: 1 })).toMatchObject({
      baseYears: 1,
      extraYears: 2,
      totalYears: 3,
    })
  })

  it('nunca cuenta más hijos con discapacidad severa que hijos declarados', () => {
    expect(childServiceCredit({ children: 2, severeDisability: 7 })).toMatchObject({
      baseYears: 2,
      extraYears: 4,
      totalYears: 6,
    })
  })

  it('trata lo que no es un número entero positivo como cero', () => {
    for (const bad of [Number.NaN, -3, Number.POSITIVE_INFINITY]) {
      expect(childServiceCredit({ children: bad, severeDisability: bad }).totalYears).toBe(0)
    }
    // Un campo de texto puede entregar «2.6»: se cuentan hijos enteros, no fracciones.
    expect(childServiceCredit({ children: 2.6, severeDisability: 0 }).baseYears).toBe(2)
  })
})

describe('el catálogo de cajas', () => {
  it('nombra las tres que el artículo comprende y las tres que pueden optar', () => {
    const comprendidas = CREDIT_SCHEMES.filter(s => s.status === 'comprendida').map(s => s.id)
    const puedenOptar = CREDIT_SCHEMES.filter(s => s.status === 'puede-optar').map(s => s.id)
    expect(comprendidas).toEqual(['bps', 'ffaa', 'policial'])
    expect(puedenOptar).toEqual(['bancaria', 'notarial', 'profesionales'])
  })

  it('no repite claves y cada una explica cómo la alcanza el artículo', () => {
    expect(new Set(CREDIT_SCHEMES.map(s => s.id)).size).toBe(CREDIT_SCHEMES.length)
    for (const scheme of CREDIT_SCHEMES) {
      expect(scheme.name.length, scheme.id).toBeGreaterThan(5)
      expect(scheme.detail.length, scheme.id).toBeGreaterThan(40)
    }
  })
})

describe('las fuentes', () => {
  // La página publica artículos y páginas de organismos; una fuente que no sea de IMPO o del BPS
  // sería una cita de segunda mano para afirmar una norma.
  it('son todas de impo.com.uy o bps.gub.uy, y están sobre HTTPS', () => {
    expect(CHILD_CREDIT_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const source of CHILD_CREDIT_SOURCES) {
      expect(source.url, source.label).toMatch(
        /^https:\/\/(www\.impo\.com\.uy|www\.bps\.gub\.uy)\//
      )
      expect(source.label.length, source.url).toBeGreaterThan(20)
    }
  })

  it('incluye el artículo que rige, el que quedó derogado y las dos páginas del BPS', () => {
    const urls = CHILD_CREDIT_SOURCES.map(s => s.url)
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/20130-2023/43')
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/18395-2008/14')
    expect(urls).toContain('https://www.bps.gub.uy/20889/computo-ficto-por-cuidados.html')
    expect(urls).toContain('https://www.bps.gub.uy/20575/que-es-el-computo-por-hijos.html')
  })

  it('declara el día en que se leyeron, en ISO y no en el futuro', () => {
    expect(CHILD_CREDIT_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(CHILD_CREDIT_VERIFIED_AT <= new Date().toISOString().slice(0, 10)).toBe(true)
  })
})

/**
 * El snippet está escrito como literal en la página para que los dos presupuestos de caracteres lo
 * puedan leer sin ejecutar la app. El precio de eso es que puede envejecer en silencio: si algún
 * día el tope del artículo deja de ser cinco, el título seguiría diciendo «hasta 5». Esto es lo que
 * lo impide.
 */
describe('el snippet de la página no se despega del artículo', () => {
  it('usa la misma ruta que el catálogo para la canónica', () => {
    expect(CHILD_CREDIT_PATH).toBe('/computo-por-hijo-jubilacion-uruguay')
    // La canónica se arma con la constante, no con la cadena escrita de nuevo: así una página y su
    // catálogo no pueden apuntar a dos URLs distintas.
    expect(PAGE).toContain('`https://cambio-uruguay.com${CHILD_CREDIT_PATH}`')
  })

  it('nombra el tope del catálogo en el título y la descripción', () => {
    const title = PAGE.match(/^const title = '(.+)'$/m)?.[1]
    const description = PAGE.match(/^const description =\n\s+'(.+)'$/m)?.[1]
    expect(title).toBeTruthy()
    expect(description).toBeTruthy()
    expect(title).toContain(String(MAX_YEARS))
    expect(description).toContain('cinco')
    // Y entran en el SERP: 60 con la marca puesta, 155 la descripción.
    expect(`${title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(description!.length).toBeLessThanOrEqual(155)
  })

  it('declara un solo h1 y la miga de su tema', () => {
    expect(PAGE.match(/<h1\b/g) ?? []).toHaveLength(1)
    expect(PAGE).toContain('BreadcrumbList')
    expect(PAGE).toContain('/temas/finanzas-personales-y-jubilacion-uruguay')
  })
})
