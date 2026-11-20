import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { irpfBracketsUyu, URUGUAY } from '../../utils/calculators'
import { formatUYU } from '../../utils/format'
import { ID_CARD_BY_KEY } from '../../utils/idCard'
import { LENDERS } from '../../utils/loans'
import { STORE_DIRECTORY } from '../../utils/storeDirectory'
import { remittanceCounts } from '../../utils/remittanceAgents'
import { titleFits } from '../../utils/liveRateSeo'
import { getWithdrawContent } from '../../utils/withdrawCash'

/**
 * Títulos que Google cortaba: los cinco pasaban de 60 caracteres con la marca y el SERP los
 * mostraba truncados justo antes de lo que distingue a la página (el urgente de la cédula, el
 * "rentas de capital" de inversiones). Cada test mide el título con los valores reales y, donde
 * lleva una cifra, también con la cifra un orden de magnitud más larga.
 */
const page = (...parts: string[]) =>
  readFileSync(join(__dirname, '..', '..', 'pages', ...parts), 'utf8')

describe('títulos que entran en el SERP', () => {
  it('cédula: renovación y urgente entran juntos', () => {
    const fmt = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 0 })
    const pesos = (n: number) => `$${fmt.format(n)}`
    const title = (renewal: number, urgent: number) =>
      `Cuánto sale la cédula: ${pesos(renewal)}, urgente ${pesos(urgent)}`
    const renewal = ID_CARD_BY_KEY['renovacion-comun']!.arancel
    const urgent = ID_CARD_BY_KEY['renovacion-urgente']!.arancel
    expect(titleFits(title(renewal, urgent))).toBe(true)
    // El urgente es el doble: con la renovación en tres cifras y el urgente en cuatro todavía entra.
    expect(titleFits(title(999, 1_998))).toBe(true)
    // Más allá, la página cae a la renovación sola, que entra con cualquier importe realista.
    expect(titleFits(`Cuánto sale la cédula: ${pesos(99_999)}`)).toBe(true)
    const source = page('cuanto-sale-la-cedula-de-identidad-uruguaya.vue')
    expect(source).toContain(
      '[`Cuánto sale la cédula: ${pesos(renovacion.arancel)}, urgente ${pesos(urgente.arancel)}`]'
    )
    expect(source).toContain('`Cuánto sale la cédula: ${pesos(renovacion.arancel)}`')
  })

  it('IRPF: el mínimo no imponible sale de la franja al 0 % y entra aun con la BPC al doble', () => {
    const [first] = irpfBracketsUyu(URUGUAY.bpc)
    expect(first!.rate).toBe(0)
    for (const bpc of [URUGUAY.bpc, URUGUAY.bpc * 2]) {
      const exempt = formatUYU(irpfBracketsUyu(bpc)[0]!.upTo, 0)
      expect(titleFits(`Calculadora de IRPF: exento hasta ${exempt}`)).toBe(true)
    }
    const source = page('herramientas', 'calculadora-irpf.vue')
    expect(source).toContain(':seo-title="seoTitle"')
    expect(source).toContain('formatUYU(irpfBracketsUyu(URUGUAY.bpc)[0]!.upTo, 0)')
  })

  it('las dos calculadoras de impuestos pasan un título corto', () => {
    for (const [file, title] of [
      ['calculadora-impuestos-importacion.vue', 'Calculadora de impuestos de importación'],
      ['calculadora-impuestos-inversiones.vue', 'Calculadora de impuestos sobre inversiones'],
    ] as const) {
      expect(titleFits(title)).toBe(true)
      expect(page('herramientas', file)).toContain(`seo-title="${title} | Cambio Uruguay"`)
    }
  })

  // El peor título del sitio hasta el 2026-11-03: 94 caracteres con la marca, de los cuales el SERP
  // publicaba 60 y cortaba en «…bancos, financieras y c». No lo medía nadie —`staticTitle` de
  // `seoTitleBudget` se queda en la línea del `title:` y prettier había partido ésta justamente por
  // ser larga—, así que entra acá con su cifra puesta y arriba queda el trinquete que lo delata.
  it('préstamos: el título lleva cuántos prestadores hay y entra con la cifra puesta', () => {
    const title = (lenders: number) => `Préstamos en Uruguay: ${lenders} prestadores`
    expect(titleFits(title(LENDERS.length))).toBe(true)
    // Y sigue entrando si el catálogo pasa de los 99, que es el único crecimiento que lo alargaría.
    expect(titleFits(title(123))).toBe(true)

    // La cifra se cuenta sobre la lista que la página publica, no se congela en el título: es la
    // misma regla con la que `/descuentos-con-tarjeta-uruguay/*` dice cuántos comercios tiene hoy.
    const source = page('prestamos-uruguay.vue')
    expect(source).toContain(
      'const title = computed(() => `Préstamos en Uruguay: ${lenders.value.length} prestadores`)'
    )
    expect(source).toContain('title: () => `${title.value} | Cambio Uruguay`')
  })

  // 74 caracteres con la marca hasta el 2026-11-04: el SERP cortaba en «…datos verificable» y los
  // 60 que publicaba se iban en adjetivos. El piso lo delataba `seoTitleBudget`, y acá va la
  // medición exacta con la cifra puesta, que es lo que ese pozo no puede afirmar.
  it('tiendas online: el título lleva cuántas tienen reseñas y entra con la cifra puesta', () => {
    const title = (conResenas: number) => `Tiendas online de Uruguay: ${conResenas} con reseñas`
    // El peor caso real es que TODAS las tiendas del registro tengan reseñas: la cifra se cuenta
    // sobre las publicadas, que nunca son más que el registro.
    expect(titleFits(title(STORE_DIRECTORY.length))).toBe(true)
    // Y sigue entrando si el registro pasa de las 99, que es el único crecimiento que lo alargaría.
    expect(titleFits(title(999))).toBe(true)

    // La cifra sale de la lista que la página publica, no de un literal congelado, igual que en
    // `/prestamos-uruguay`.
    const source = page('tiendas-online-uruguay', 'index.vue')
    expect(source).toContain(
      'const seoTitle = computed(() => `Tiendas online de Uruguay: ${conResenas.value} con reseñas`)'
    )
    expect(source).toContain('title: () => `${seoTitle.value} | Cambio Uruguay`')
  })

  // 75 caracteres con la marca hasta el 2026-11-09, el peor de los tres que quedaban en el piso de
  // `seoTitleBudget`: el SERP cortaba en «…cambiar dóla» y lo que publicaba era la pregunta que el
  // visitante acababa de escribir. Ahora lleva el veredicto del día, y las cuatro ramas se miden
  // acá porque el piso de ese pozo sólo puede ver el prefijo fijo.
  it('banco o casa de cambio: las cuatro ramas del veredicto entran con la marca', () => {
    const title = (verdict: string) => `¿Banco o casa de cambio? ${verdict}`
    for (const verdict of [
      'Hoy gana la casa',
      'Hoy gana el banco',
      'Hoy están iguales',
      'Cuál conviene hoy',
    ])
      expect(titleFits(title(verdict)), verdict).toBe(true)

    // El veredicto sale del MISMO cálculo que firma la respuesta del cuerpo, no de un literal
    // suelto: un título que corone a un grupo distinto del que corona la página es peor que uno
    // largo. `compareInstitutionKinds` es el único que decide quién gana.
    const source = page('banco-o-casa-de-cambio-uruguay.vue')
    expect(source).toContain('const gap = comparison.value.sell')
    expect(source).toContain(
      "return gap.winner === 'casa' ? 'Hoy gana la casa' : 'Hoy gana el banco'"
    )
    expect(source).toContain(
      'const metaTitle = computed(() => `¿Banco o casa de cambio? ${titleVerdict.value}`)'
    )
    expect(source).toContain('title: () => metaTitle.value')
  })

  // 68 con la marca hasta el 2026-11-09: el corte se llevaba la cifra, que es lo único que este
  // título puede decir y la caja de respuesta de Google no.
  it('giro del exterior: el título lleva cuántas casas son agentes y entra con la cifra puesta', () => {
    const title = (agents: number) => `Cobrar un giro del exterior: ${agents} casas`
    expect(titleFits(title(remittanceCounts().agents))).toBe(true)
    // El peor caso es que las 45 casas relevadas pasen a declararse agentes; entra igual, y sigue
    // entrando si el relevamiento pasa de las 99, que es el único crecimiento que lo alargaría.
    expect(titleFits(title(remittanceCounts().researched))).toBe(true)
    expect(titleFits(title(999))).toBe(true)

    // La cifra se cuenta sobre la lista que la página publica, no se congela en el título.
    expect(page('cobrar-giro-del-exterior-uruguay.vue')).toContain(
      'const metaTitle = `Cobrar un giro del exterior: ${counts.agents} casas`'
    )
  })

  it('retirar efectivo: los tres idiomas entran', () => {
    for (const locale of ['es', 'en', 'pt'] as const) {
      const { metaTitle } = getWithdrawContent(locale)
      expect(titleFits(metaTitle), `${locale}: ${metaTitle}`).toBe(true)
    }
  })
})
