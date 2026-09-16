import { describe, expect, it } from 'vitest'

import { getGuide } from '../../utils/guides'

// La guía vieja («Enviar y recibir dinero del exterior») tenía 380 palabras, ninguna tabla,
// ninguna FAQ, ninguna fuente y no nombraba un solo proveedor ni una sola comisión. Este test
// fija la reescritura: el caso que la gente busca es «me pagan de afuera, cómo lo cobro más
// barato», y lo que le da valor propio son tres hechos que ninguna otra página uruguaya junta:
// Wise sólo entrega PESOS a un banco de acá, Prex NO recibe una SWIFT directa, y el tipo de
// cambio pesa más que la comisión. Lo que un proveedor no publica se publica como «no publica».
const g = getGuide('enviar-recibir-dinero-exterior')!

const text = () =>
  [
    g.title,
    g.description,
    ...g.sections.map(s => `${s.heading} ${s.body}`),
    ...(g.faqs ?? []).map(f => `${f.q} ${f.a}`),
  ].join(' ')

const tableSection = () => g.sections.find(s => s.table)!

const words = (s: string) => s.trim().split(/\s+/).length

describe('guía de cobrar del exterior (reescritura 2026-09-16)', () => {
  it('conserva el slug y sube la fecha', () => {
    expect(g).toBeDefined()
    expect(g.slug).toBe('enviar-recibir-dinero-exterior')
    expect(g.updatedAt).toBe('2026-09-16')
    expect(g.title.length).toBeLessThanOrEqual(60)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(190)
  })

  it('nombra las vías reales y al menos dos bancos con tarifario', () => {
    const t = text()
    for (const name of ['Payoneer', 'Wise', 'Prex', 'SWIFT', 'PayPal', 'Deel'])
      expect(t, `falta ${name}`).toContain(name)
    const bancos = ['BROU', 'Itaú', 'Santander', 'BBVA'].filter(b => t.includes(b))
    expect(bancos.length).toBeGreaterThanOrEqual(2)
  })

  it('trae la comparativa con una fila por vía', () => {
    const table = tableSection().table!
    expect(table.headers).toEqual([
      'Vía',
      'Qué te cobran por recibir',
      'Qué te cobran por sacarlo',
      'En qué moneda te queda',
      'Cuánto demora',
    ])
    expect(table.rows.length).toBeGreaterThanOrEqual(5)
    for (const row of table.rows) expect(row).toHaveLength(5)
    const vias = table.rows.map(r => r[0]).join(' ')
    for (const via of ['Payoneer', 'Wise', 'Prex', 'SWIFT', 'PayPal'])
      expect(vias, `la tabla no tiene fila de ${via}`).toContain(via)
  })

  it('publica «no publica» donde el proveedor no publica el número', () => {
    expect(text()).toMatch(/no publica/i)
  })

  // El hecho que decide el caso de quien quiere DÓLARES: Wise opera acá, pero al banco
  // uruguayo sólo entrega pesos. Si esto se pierde, la guía manda a alguien por la vía errada.
  it('dice que Wise sólo entrega pesos a una cuenta uruguaya', () => {
    const wise = g.sections.find(s => /wise/i.test(s.heading))!
    expect(wise, 'falta la sección de Wise').toBeDefined()
    expect(wise.body).toMatch(/pesos/i)
    expect(wise.body).toMatch(/no\s+(?:existe|hay|te)[^.]*d[oó]lares|d[oó]lares[^.]*no/i)
    expect(text()).toMatch(/Uruguay figura|lista oficial|habilita a Uruguay/i)
  })

  it('dice que Prex no recibe una transferencia del exterior', () => {
    const prex = g.sections.find(s => /prex/i.test(s.heading))!
    expect(prex, 'falta la sección de Prex').toBeDefined()
    expect(prex.body).toMatch(/no recibe/i)
  })

  it('pone el tipo de cambio como costo propio, no como nota al pie', () => {
    const cambio = g.sections.find(s => /tipo de cambio/i.test(s.heading))!
    expect(cambio, 'falta la sección del tipo de cambio').toBeDefined()
    const tos = (cambio.links ?? []).map(l => l.to)
    expect(tos).toContain('/comparar-plataformas-dolar-uruguay')
    expect(tos).toContain('/casa/prex')
  })

  // Una cotización horneada en la prosa envejece en horas y sigue pareciendo creíble: es el modo
  // de falla que ya publicó una BPC de 2024 durante meses. El precio del día se enlaza, no se
  // escribe. El guard mira las dos secciones donde la tentación vive (Prex y el tipo de cambio)
  // y, de paso, cualquier «NN,NN pesos» suelto en toda la guía.
  it('no hornea ninguna cotización en la prosa', () => {
    for (const heading of [/prex/i, /tipo de cambio/i]) {
      const section = g.sections.find(s => heading.test(s.heading))!
      expect(section.body, `«${section.heading}» trae una cotización`).not.toMatch(/\d{2},\d{2}/)
    }
    const todo = [text(), ...tableSection().table!.rows.flat()].join(' ')
    expect(todo).not.toMatch(/\d+,\d{2}\s*(?:pesos|UYU|\$)/i)
    expect(todo).not.toMatch(/\$\s*\d+,\d{2}/)
  })

  // Canibalización: `guidesPagos.ts` › `recibir-transferencia-del-exterior-uruguay` es la guía de
  // los números banco por banco. Esta decide la VÍA y manda para allá; si vuelve a publicar una
  // comisión de acreditación, las dos compiten por la misma consulta.
  it('no reproduce las cifras banco por banco de la guía hermana', () => {
    const todo = [text(), ...tableSection().table!.rows.flat()].join(' ')
    const cifrasDeLaHermana = [
      /1,65\s*por mil/i,
      /0,4\s*%/,
      /USD\s*145/,
      /m[áa]ximo\s+de\s+USD\s*100/i,
      /m[íi]nimo\s+de\s+USD\s*(?:28|35)/i,
      /corresponsal[íi]a\s+(?:escalonad|de\s+USD)/i,
    ]
    const offenders = cifrasDeLaHermana.filter(re => re.test(todo)).map(String)
    expect(offenders).toEqual([])
  })

  // El corolario tributario del dossier es una inferencia razonada sobre el principio de la
  // fuente, NO una cita de DGI: se publica como criterio de la ley, y nunca como «tasa cero».
  it('publica la regla impositiva sin inventar una cita de DGI', () => {
    const t = text()
    expect(t).toMatch(/220\/998/)
    expect(t).toMatch(/d[oó]nde se presta el servicio/i)
    expect(t).toMatch(/monotributo/i)
    expect(t).not.toMatch(/tasa\s+(?:cero|0\s*%)/i)
    expect(t).not.toMatch(/la DGI dice que|seg[uú]n la DGI[^.]*d[oó]nde queda/i)
  })

  it('tiene secciones, FAQ y fuentes en los rangos editoriales', () => {
    expect(g.sections.length).toBeGreaterThanOrEqual(8)
    expect(g.sections.length).toBeLessThanOrEqual(9)
    for (const s of g.sections) {
      const n = words(s.body)
      expect(n, `sección «${s.heading}»: ${n} palabras`).toBeGreaterThanOrEqual(90)
      expect(n, `sección «${s.heading}»: ${n} palabras`).toBeLessThanOrEqual(180)
    }
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(6)
    for (const f of g.faqs ?? []) {
      const n = words(f.a)
      expect(n, `FAQ «${f.q}»: ${n} palabras`).toBeGreaterThanOrEqual(30)
      expect(n, `FAQ «${f.q}»: ${n} palabras`).toBeLessThanOrEqual(80)
    }
    expect(g.sources?.length ?? 0).toBeGreaterThanOrEqual(6)
    for (const s of g.sources ?? []) expect(s.url).toMatch(/^https:\/\//)
  })

  it('enlaza las páginas que continúan el caso', () => {
    const tos = (g.related ?? []).map(r => r.to)
    for (const to of [
      '/guias/recibir-transferencia-del-exterior-uruguay',
      '/contractor-en-uruguay',
      '/comisiones-de-transferencia-uruguay',
      '/comparar-plataformas-dolar-uruguay',
    ])
      expect(tos).toContain(to)
  })

  // El reparto de trabajo se enlaza donde el lector lo necesita, no sólo al pie: en la sección de
  // la tabla (donde está la fila del banco), en la del banco y en la de Wise.
  it('manda a la guía hermana desde las secciones que le ceden el tema', () => {
    const hermana = '/guias/recibir-transferencia-del-exterior-uruguay'
    for (const heading of [/tabla/i, /banco por SWIFT/i, /wise/i]) {
      const section = g.sections.find(s => heading.test(s.heading))!
      expect(section, `falta la sección ${heading}`).toBeDefined()
      const tos = (section.links ?? []).map(l => l.to)
      expect(tos, `«${section.heading}» no enlaza la guía hermana`).toContain(hermana)
    }
  })

  it('no trae markdown ni escribe «septiembre»', () => {
    const all = [text(), ...tableSection().table!.rows.flat()].join(' ')
    expect(all).not.toMatch(/\*\*|^#|\n- /m)
    expect(all).not.toMatch(/septiembre/)
    expect(all).toMatch(/setiembre/)
  })
})
