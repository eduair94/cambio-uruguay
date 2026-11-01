import { describe, expect, it } from 'vitest'

import { getGuide, guides } from '../../utils/guides'
import { patrimonioGuides } from '../../utils/guidesPatrimonio'

const SLUG = 'impuesto-al-patrimonio-uruguay'
const guia = () => getGuide(SLUG)!

/** Todo el texto publicado de la guía, para buscar una afirmación en cualquier parte. */
const texto = () => {
  const g = guia()
  return [
    g.title,
    g.description,
    ...g.sections.flatMap(s => [
      s.heading,
      s.body,
      ...(s.table?.headers ?? []),
      ...(s.table?.rows.flat() ?? []),
    ]),
    ...(g.faqs ?? []).flatMap(f => [f.q, f.a]),
  ].join('\n')
}

describe('la guía del Impuesto al Patrimonio está en el catálogo', () => {
  it('existe una sola vez y la expone el módulo propio', () => {
    expect(patrimonioGuides).toHaveLength(1)
    expect(guides.filter(g => g.slug === SLUG)).toHaveLength(1)
    expect(guia().slug).toBe(SLUG)
  })

  it('su snippet entra en el SERP', () => {
    // Mismo presupuesto que `guideSnippetBudget.test.ts`: 43 para el título porque la página le
    // agrega siempre ` | Cambio Uruguay`, y 155 para la descripción.
    expect(`${guia().title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(guia().description.length).toBeLessThanOrEqual(155)
  })

  it('la descripción trae las dos cifras que deciden, no el índice de la guía', () => {
    expect(guia().description).toContain('6.653.000')
    expect(guia().description).toContain('13.306.000')
  })
})

describe('ninguna cifra va sin su fuente oficial', () => {
  it('cita a la DGI y a IMPO, y nada más', () => {
    const hosts = (guia().sources ?? []).map(s => new URL(s.url).hostname)
    expect(hosts.length).toBeGreaterThanOrEqual(5)
    for (const host of hosts) expect(['www.gub.uy', 'www.impo.com.uy']).toContain(host)
  })

  it('las fuentes que sostienen los montos están nombradas por lo que dicen', () => {
    const labels = (guia().sources ?? []).map(s => s.label).join('\n')
    // El umbral, las reglas de avalúo, los vencimientos y la escala de la ley: cada bloque de
    // cifras de la guía tiene que poder rastrearse a una de estas cuatro fuentes.
    expect(labels).toContain('6.653.000')
    expect(labels).toContain('factor 25')
    expect(labels).toContain('15/05/2026')
    expect(labels).toContain('artículo 53')
  })

  it('toda URL es absoluta y https', () => {
    for (const source of guia().sources ?? []) expect(source.url).toMatch(/^https:\/\//)
  })
})

describe('las reglas de avalúo que deciden si alguien cruza el umbral', () => {
  it('publica el factor 25 del auto y las 15 veces del alquiler anual', () => {
    const body = texto()
    expect(body).toContain('factor 25')
    expect(body).toContain('15 veces el arrendamiento anual')
  })

  it('publica la deducción del 50 % de la casa-habitación CON su tope', () => {
    const body = texto()
    expect(body).toMatch(/50 por ciento|50 %/)
    // Sin el tope la deducción se lee como ilimitada, que es el error que esta guía evita.
    expect(body).toMatch(/máximo igual al mínimo no imponible|tope del mínimo/)
  })

  it('dice que el saldo de la AFAP no se computa', () => {
    expect(texto()).toMatch(/AFAP no se comput|AFAP.*no se computan/s)
  })
})

describe('la guía NO publica una tasa que ninguna fuente oficial imprime', () => {
  it('nunca afirma una tasa vigente ni un impuesto a pagar', () => {
    const body = texto()
    // La escala del art. 53 se publica como la escala ESCRITA en la ley, siempre junto a la
    // advertencia de las reducciones anuales. Lo que no puede aparecer es una tasa presentada como
    // la que se aplica hoy.
    expect(body).not.toMatch(/la tasa vigente es/i)
    expect(body).not.toMatch(/tasa efectiva del \d/i)
  })

  it('explica por qué no hay porcentaje y manda al simulador de la DGI', () => {
    const body = texto()
    expect(body).toMatch(/0,10 ?% anual|0,10 por ciento anual/)
    expect(body).toMatch(/simulador/i)
    expect((guia().sources ?? []).some(s => /simulador/i.test(s.label))).toBe(true)
  })

  it('no adelanta el mínimo no imponible del ejercicio 2026', () => {
    const body = texto()
    // El decreto que lo fija no estaba publicado el 2026-11-01. Los montos de la guía son los del
    // ejercicio 2025 y la guía lo dice; si alguien agrega una cifra "de 2026", este test la ve.
    expect(body).toMatch(/ejercicio 2026 (?:lo fija|todavía no)|todavía no salió/)
    expect(body).not.toMatch(/mínimo no imponible (?:de|del ejercicio) 2026 es/)
  })
})

describe('los enlaces internos', () => {
  it('apunta a las tres páginas que comparten el valor de Catastro', () => {
    const destinos = (guia().related ?? []).map(l => l.to)
    expect(destinos).toContain('/valor-catastral-uruguay')
    expect(destinos).toContain('/contribucion-inmobiliaria-uruguay')
    expect(destinos).toContain('/impuesto-de-primaria-uruguay')
  })

  it('la sección que nombra el valor real de Catastro lo enlaza ahí mismo', () => {
    const seccion = guia().sections.find(s => s.body.includes('Dirección Nacional de Catastro'))
    expect(seccion?.links?.map(l => l.to)).toContain('/valor-catastral-uruguay')
  })
})
