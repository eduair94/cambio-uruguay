import { describe, expect, it } from 'vitest'
import {
  VOTING_BLOCKED_ACTS,
  VOTING_FILING_GRACE_DAYS,
  VOTING_FINE_PUBLISHED,
  VOTING_FINE_SOURCES,
  VOTING_FINE_TIERS,
  VOTING_FINE_VERIFIED_AT,
  VOTING_JUSTIFICATIONS,
  actoQueElPagoNoArregla,
  fuenteDe,
  montoDe,
  montosPublicados,
} from '../../utils/votingFine'

/**
 * El catálogo de `/multa-por-no-votar-uruguay`.
 *
 * Lo que estos tests cuidan no es la aritmética —no hay casi— sino las tres formas en que una
 * página así se vuelve mentira sin que nada se rompa: que un monto en pesos se mueva sin que se
 * mueva su fuente, que el duplicado del artículo 12 deje de ser el doble del artículo 8, y que el
 * único acto que pagar la multa NO desbloquea se pierda en una edición y la página pase a afirmar
 * lo contrario de lo que dice la ley.
 */
describe('el catálogo de la multa por no votar', () => {
  it('fija la multa del artículo 8 en 1 UR y 3 UR', () => {
    const primera = VOTING_FINE_TIERS.find(t => t.key === 'primera')
    const siguientes = VOTING_FINE_TIERS.find(t => t.key === 'siguientes')
    expect(primera?.ur).toBe(1)
    expect(siguientes?.ur).toBe(3)
  })

  // El artículo 12 dice «se duplicarán», así que el duplicado no es un segundo número que se
  // escribe a mano: es el del artículo 8 por dos. Una fila que no cierre es un dato inventado.
  it('el duplicado del artículo 12 es exactamente el doble', () => {
    for (const tier of VOTING_FINE_TIERS) expect(tier.urDuplicada, tier.key).toBe(tier.ur * 2)
  })

  it('cada tramo cita su artículo', () => {
    for (const tier of VOTING_FINE_TIERS) expect(tier.articulo).toMatch(/16\.017/)
  })

  // Los pesos los fija la Corte Electoral por elección: lo que acá se exige es que CADA fila
  // tenga una fuente que exista, porque una cifra sin fuente es la única que no se puede auditar.
  it('cada monto publicado apunta a una fuente registrada', () => {
    expect(VOTING_FINE_PUBLISHED.length).toBeGreaterThan(0)
    for (const fila of VOTING_FINE_PUBLISHED) {
      const fuente = fuenteDe(fila)
      expect(fuente, fila.eleccion).toBeTruthy()
      expect(fuente!.url).toMatch(/^https:\/\/(www\.)?(gub\.uy|impo\.com\.uy)\//)
      expect(fuente!.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  // La Corte Electoral publica el monto de la primera omisión y su duplicado; que el segundo sea
  // el doble del primero es la misma comprobación que hace honesto copiarlos.
  it('los pesos duplicados son el doble de los pesos de la primera omisión', () => {
    for (const fila of VOTING_FINE_PUBLISHED)
      expect(fila.pesosDuplicada, fila.eleccion).toBe(fila.pesos * 2)
  })

  it('los extras de una elección declaran UR y pesos coherentes entre sí', () => {
    const bps = montoDe('BPS')
    expect(bps).toBeTruthy()
    // 1 UR = los pesos de la primera omisión de esa misma elección, así que cada fila de empresa
    // tiene que valer sus propias UR a ese mismo precio. Sin esto, un cero de más pasa.
    for (const extra of bps!.extras ?? [])
      expect(extra.pesos, extra.label).toBe(extra.ur * bps!.pesos)
  })

  it('no inventa un monto para una elección que no declaró', () => {
    expect(montoDe('Elecciones Nacionales 2029')).toBeUndefined()
    expect(montoDe('')).toBeUndefined()
    expect(montosPublicados()).toHaveLength(VOTING_FINE_PUBLISHED.length)
  })

  // El literal D del artículo 11 es el dato que más cambia una decisión: pagar no lo desbloquea.
  // Si alguna edición lo pierde, la página queda afirmando que con la multa se arregla todo.
  it('conserva el único acto que pagar la multa no desbloquea', () => {
    const acto = actoQueElPagoNoArregla()
    expect(acto).toBeTruthy()
    expect(acto!.articulo).toBe('art. 11, D')
    expect(VOTING_BLOCKED_ACTS.filter(a => !a.curableConLaMulta)).toHaveLength(1)
  })

  it('cada acto trabado cita un artículo de la ley', () => {
    expect(VOTING_BLOCKED_ACTS.length).toBe(8)
    for (const acto of VOTING_BLOCKED_ACTS) {
      expect(acto.articulo, acto.label).toMatch(/^art\. (9|10|11)(, [A-F])?$/)
      expect(acto.detalle.length, acto.label).toBeGreaterThan(20)
    }
  })

  it('las causas justificadas son las tres del artículo 6, con plazo y destinatario', () => {
    expect(VOTING_JUSTIFICATIONS.map(j => j.literal)).toEqual(['A', 'B', 'C'])
    for (const causa of VOTING_JUSTIFICATIONS) {
      expect(causa.plazo, causa.literal).toMatch(/\d+ días/)
      expect(causa.ante.length, causa.literal).toBeGreaterThan(5)
      expect(causa.prueba.length, causa.literal).toBeGreaterThan(20)
    }
  })

  // La ausencia del país es la única causa que se tramita afuera y la única con plazo que empieza
  // ANTES de la elección: es el detalle que una redacción prolija pierde primero.
  it('la causa de ausencia se presenta en el consulado y abre su plazo antes de la elección', () => {
    const b = VOTING_JUSTIFICATIONS.find(j => j.literal === 'B')
    expect(b!.ante).toMatch(/consular/i)
    expect(b!.plazo).toMatch(/anteriores/)
  })

  it('declara los 30 días del artículo 9 y la fecha en que se verificó', () => {
    expect(VOTING_FILING_GRACE_DAYS).toBe(30)
    expect(VOTING_FINE_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('todas las fuentes son oficiales', () => {
    const urls = Object.values(VOTING_FINE_SOURCES).map(s => s.url)
    expect(urls.length).toBeGreaterThanOrEqual(3)
    for (const url of urls) expect(url).toMatch(/^https:\/\/(www\.)?(gub\.uy|impo\.com\.uy)\//)
  })
})
