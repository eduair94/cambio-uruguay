import { describe, expect, it } from 'vitest'

import { getGuide, type Guide, type GuideTable } from '../../utils/guides'

// La guía de crédito hipotecario se reescribió el 2026-09-16: antes tenía 716 palabras, ninguna
// tabla, ninguna FAQ, ninguna fuente y no nombraba las condiciones de un solo prestamista. Estas
// reglas son las del relevamiento con el que se redactó, y están acá para que la próxima edición
// no vuelva a publicar una guía de dinero a 25 años sin decir quién publica cada cifra.
//
// La regla más importante es la última: NO se publica una cuota de ejemplo. Una cuota calculada
// acá se lee como una cotización, y no lo es — la da el banco, con tu perfil y por escrito.

const SLUG = 'credito-hipotecario-uruguay'

function guia(): Guide {
  const g = getGuide(SLUG)
  expect(g, `falta la guía ${SLUG}`).toBeDefined()
  return g!
}

/** Todo el texto visible: título, bajada, secciones, celdas de tabla y FAQ. */
function textoVisible(g: Guide): string {
  const partes: string[] = [g.title, g.description]
  for (const s of g.sections) {
    partes.push(s.heading, s.body)
    for (const fila of s.table?.rows ?? []) partes.push(...fila)
    for (const h of s.table?.headers ?? []) partes.push(h)
  }
  for (const f of g.faqs ?? []) partes.push(f.q, f.a)
  return partes.join('\n')
}

const palabras = (texto: string) => texto.trim().split(/\s+/).filter(Boolean).length

function tablaComparativa(g: Guide): GuideTable {
  const conTabla = g.sections.filter(s => s.table)
  expect(conTabla.length, 'la guía tiene que traer exactamente una tabla comparativa').toBe(1)
  return conTabla[0]!.table!
}

describe('guía de crédito hipotecario › forma', () => {
  it('conserva el slug y está fechada en la reescritura', () => {
    const g = guia()
    expect(g.slug).toBe(SLUG)
    expect(g.updatedAt).toBe('2026-09-16')
  })

  it('tiene título corto y bajada del largo que usa el buscador', () => {
    const g = guia()
    expect(g.title.length, g.title).toBeLessThanOrEqual(60)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(190)
  })

  it('escribe prosa plana: nada de markdown ni HTML en los cuerpos', () => {
    for (const s of guia().sections) {
      expect(s.body, s.heading).not.toMatch(/\*\*|^#|\n\s*[-*]\s|<[a-z/]/i)
    }
  })

  it('escribe "setiembre" a la uruguaya', () => {
    expect(textoVisible(guia()).toLowerCase()).not.toContain('septiembre')
  })

  it('mantiene las secciones en el rango de lectura del sitio', () => {
    const g = guia()
    expect(g.sections.length).toBeGreaterThanOrEqual(8)
    expect(g.sections.length).toBeLessThanOrEqual(9)
    for (const s of g.sections) {
      const n = palabras(s.body)
      expect(n, `${s.heading}: ${n} palabras`).toBeGreaterThanOrEqual(90)
      expect(n, `${s.heading}: ${n} palabras`).toBeLessThanOrEqual(180)
    }
  })
})

describe('guía de crédito hipotecario › nombra a todos los prestamistas', () => {
  const ESPERADOS: Array<[string, RegExp]> = [
    ['BHU', /\bBHU\b/],
    ['ANV o Fondo de Garantía', /\bANV\b|Fondo de Garantía/],
    ['BROU', /\bBROU\b/],
    ['Itaú', /Itaú/],
    ['Santander', /Santander/],
    ['BBVA', /BBVA/],
    ['Scotiabank', /Scotiabank/],
    ['BTG', /BTG/],
  ]

  it.each(ESPERADOS)('nombra a %s', (_quien, patron) => {
    expect(patron.test(textoVisible(guia()))).toBe(true)
  })
})

describe('guía de crédito hipotecario › la tabla', () => {
  it('trae los seis encabezados del relevamiento, en orden', () => {
    expect(tablaComparativa(guia()).headers).toEqual([
      'Prestamista',
      'Moneda',
      'Tasa (TEA)',
      'Plazo máximo',
      'Financia hasta',
      'Cuota máxima sobre el ingreso',
    ])
  })

  it('tiene al menos siete filas y todas con seis celdas llenas', () => {
    const t = tablaComparativa(guia())
    expect(t.rows.length).toBeGreaterThanOrEqual(7)
    for (const fila of t.rows) {
      expect(fila.length, fila[0]).toBe(6)
      for (const celda of fila) expect(celda.trim().length, fila[0]).toBeGreaterThan(0)
    }
  })

  it('nunca deja la tasa en blanco: si no hay cifra, dice que no la publica', () => {
    const t = tablaComparativa(guia())
    const col = t.headers.indexOf('Tasa (TEA)')
    for (const fila of t.rows) {
      const tasa = fila[col]!
      expect(tasa.trim().length, fila[0]).toBeGreaterThan(0)
      if (!/\d/.test(tasa)) expect(tasa, fila[0]).toMatch(/no publica|no aplica/i)
    }
  })

  // Una TEA en UI y una TEA en dólares no son el mismo número: la columna de tasa se lee en
  // vertical, así que cada celda tiene que traer su moneda encima aunque la columna "Moneda" ya
  // la diga. Sin esto, el 3,75 % de BTG (que es en UI, con bandas expresadas en dólares) se
  // compara contra el 6,50 % en dólares de BBVA como si midieran lo mismo.
  it('cada celda de tasa con porcentaje nombra su moneda', () => {
    const t = tablaComparativa(guia())
    const col = t.headers.indexOf('Tasa (TEA)')
    for (const fila of t.rows) {
      const tasa = fila[col]!
      if (!tasa.includes('%')) continue
      expect(tasa, `${fila[0]}: tasa sin moneda`).toMatch(/\bUI\b|\bUSD\b|pesos/)
    }
  })

  // La columna de cuota mezclaba dos cosas distintas: una relación cuota-ingreso para casi todos
  // y un piso de ingreso para Scotiabank y BTG. Si el banco no publica la relación, la celda lo
  // dice; no se rellena con el dato de al lado.
  it('la columna de cuota trae una relación o dice que no la publica', () => {
    const t = tablaComparativa(guia())
    const col = t.headers.indexOf('Cuota máxima sobre el ingreso')
    for (const fila of t.rows) {
      expect(fila[col]!, `${fila[0]}: cuota sin relación ni aclaración`).toMatch(/%|no publica/i)
    }
  })

  it('publica el hallazgo del BROU: no da hipotecario de compra', () => {
    const t = tablaComparativa(guia())
    const fila = t.rows.find(r => r[0]!.startsWith('BROU'))
    expect(fila, 'falta la fila del BROU').toBeDefined()
    expect(fila!.join(' ')).toMatch(/no da (?:crédito )?hipotecario/i)
  })

  it('publica la cartilla de Scotiabank, no el titular comercial', () => {
    const t = tablaComparativa(guia())
    const fila = t.rows.find(r => /Scotiabank/.test(r[0]!))
    expect(fila, 'falta la fila de Scotiabank').toBeDefined()
    const tasa = fila![t.headers.indexOf('Tasa (TEA)')]!
    expect(tasa).toContain('4,50')
    expect(tasa).toContain('4,65')
    expect(tasa, 'la tabla no debe traer el "desde 3,80 %" de la landing').not.toContain('3,80')
    // La discrepancia se explica en la sección del banco, no en la tabla.
    const seccion = guia().sections.find(s => /Scotiabank/.test(s.heading))
    expect(seccion, 'falta la sección de Scotiabank').toBeDefined()
    expect(seccion!.body).toContain('3,80')
  })
})

describe('guía de crédito hipotecario › FAQ, fuentes y enlaces', () => {
  it('trae al menos seis preguntas con respuestas del largo que se lee', () => {
    const faqs = guia().faqs ?? []
    expect(faqs.length).toBeGreaterThanOrEqual(6)
    for (const f of faqs) {
      expect(f.q.trim().length).toBeGreaterThan(0)
      const n = palabras(f.a)
      expect(n, `${f.q}: ${n} palabras`).toBeGreaterThanOrEqual(30)
      expect(n, `${f.q}: ${n} palabras`).toBeLessThanOrEqual(80)
    }
  })

  it('contesta las preguntas que motivaron la reescritura', () => {
    const preguntas = (guia().faqs ?? []).map(f => f.q).join('\n')
    for (const patron of [
      /ganar/i,
      /UI o (?:en )?dólares/i,
      /financian/i,
      /gastos/i,
      /BROU/,
      /Fondo de Garantía/,
      /clearing/i,
    ]) {
      expect(patron.test(preguntas), `${patron} sin FAQ`).toBe(true)
    }
  })

  it('respalda cada cifra con al menos seis fuentes https', () => {
    const fuentes = guia().sources ?? []
    expect(fuentes.length).toBeGreaterThanOrEqual(6)
    for (const s of fuentes) {
      expect(s.label.trim().length).toBeGreaterThan(0)
      expect(s.url, s.label).toMatch(/^https:\/\//)
    }
  })

  it('cita a los organismos y bancos de los que salen los números', () => {
    const urls = (guia().sources ?? []).map(s => s.url).join('\n')
    for (const dominio of [
      'bhu.com.uy',
      'anv.gub.uy',
      'brou.com.uy',
      'itau.com.uy',
      'santander.com.uy',
      'bbva.com.uy',
      'scotiabank.com.uy',
      'btgpactual',
      'gub.uy/direccion-general-impositiva',
    ]) {
      expect(urls, dominio).toContain(dominio)
    }
  })

  it('enlaza lo que el brief pide desde el pie de la guía', () => {
    const destinos = (guia().related ?? []).map(l => l.to)
    expect(destinos).toContain('/comprar-o-alquilar-uruguay')
    expect(destinos).toContain('/herramientas/conversor-unidad-indexada')
  })

  it('enlaza el conversor en la sección donde lo nombra', () => {
    const g = guia()
    const delPie = new Set((g.related ?? []).map(l => l.to))
    for (const s of g.sections) {
      if (!/conversor de Unidad Indexada/i.test(`${s.heading} ${s.body}`)) continue
      const alcance = new Set([...delPie, ...(s.links ?? []).map(l => l.to)])
      expect(alcance.has('/herramientas/conversor-unidad-indexada'), s.heading).toBe(true)
    }
  })

  it('no repite destinos en related', () => {
    const destinos = (guia().related ?? []).map(l => l.to)
    expect(new Set(destinos).size).toBe(destinos.length)
  })
})

describe('guía de crédito hipotecario › lo que no se publica', () => {
  // Dinero a 25 años: una cuota de ejemplo calculada acá se leería como una cotización nuestra.
  it('no hornea ninguna cuota de ejemplo', () => {
    const texto = textoVisible(guia())
    expect(texto).not.toMatch(/cuota de \$/i)
    expect(texto).not.toMatch(
      /cuota (?:mensual )?(?:de|sería|quedaría|te queda) (?:\$|USD|UI|UYU)\s?[\d.]/i
    )
  })

  // Las cifras secundarias del relevamiento (escrituración) se escriben como aproximación.
  it('escribe la escrituración como aproximación, no como dato', () => {
    const bloques = [
      ...guia().sections.map(s => s.body),
      ...(guia().faqs ?? []).map(f => f.a),
    ].filter(t => /escrituración/i.test(t))
    expect(bloques.length, 'ninguna sección habla de escrituración').toBeGreaterThan(0)
    for (const t of bloques) {
      if (!/3 % a 5 %/.test(t)) continue
      expect(t, 'la cifra de escrituración es secundaria: va como aproximación').toMatch(
        /en torno al 3 % a 5 %|se cita en torno/i
      )
    }
  })

  // El relevamiento no pudo reconciliar la adhesión de BTG Pactual al FGCH: se dice, no se rellena.
  it('dice que la lista de la ANV todavía nombra a HSBC', () => {
    const texto = textoVisible(guia())
    expect(texto).toMatch(/HSBC/)
  })
})
