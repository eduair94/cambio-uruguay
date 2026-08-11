import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { DEFENSE_POWERS } from '../../utils/consumerDefense'
import * as bills from '../../utils/householdBills'
import {
  BILLS_FAQ,
  BILLS_FAQ_VERIFIED_AT,
  BILLS_VERIFIED_AT,
  UTE_IVA_RATE,
  OSE_BLOCKS,
  OSE_FIXED_CHARGES,
  SANEAMIENTO_AUTHORITIES,
  TARIFF_SOURCES,
  UTE_DISCOUNT_KWH_CAP,
  UTE_DISCOUNT_POTENCIA_CAP,
  UTE_LEVERS,
  UTE_TARIFFS,
  checkUteDiscount,
  compareUteTariffs,
  estimateUteBill,
  simpleEnergyCost,
  splitBands,
  uteTariff,
} from '../../utils/householdBills'

/**
 * El .vue como texto. Estos datos sólo sirven si la PÁGINA los publica: la corrección del alcance
 * del saneamiento ya había vivido una vez en el módulo sin llegar nunca al template, mientras el
 * template seguía afirmando como regla nacional algo que en Montevideo es falso.
 */
const here = dirname(fileURLToPath(import.meta.url))
const page = readFileSync(join(here, '../../pages/factura-de-ute-uruguay.vue'), 'utf8')

/** Busca una pregunta del FAQ por un fragmento de su texto. Falla ruidosamente si no está. */
const faq = (fragment: string) => {
  const found = BILLS_FAQ.find(f => f.question.includes(fragment))
  if (!found) throw new Error(`No hay pregunta en BILLS_FAQ que contenga "${fragment}"`)
  return found
}

const input = (over: Partial<Parameters<typeof estimateUteBill>[1]> = {}) => ({
  kwh: 300,
  potenciaKw: 3.5,
  puntaPct: 20,
  vallePct: 0,
  ...over,
})

describe('escalones de la Tarifa Residencial Simple', () => {
  // La confusión que la página existe para deshacer: la gente cree que pasar de 600 kWh
  // reprecia TODO el consumo. Es progresivo, como el IRPF.
  it('aplica los escalones de forma progresiva, no reprecia todo el consumo', () => {
    // 100 kWh caen enteros en el primer escalón.
    expect(simpleEnergyCost(100).total).toBeCloseTo(100 * 6.744, 2)
    // 300 kWh = 100 al primero + 200 al segundo.
    expect(simpleEnergyCost(300).total).toBeCloseTo(100 * 6.744 + 200 * 8.452, 2)
    // 700 kWh = 100 + 500 + 100 al tercero.
    expect(simpleEnergyCost(700).total).toBeCloseTo(100 * 6.744 + 500 * 8.452 + 100 * 10.539, 2)
  })

  it('el kWh marginal del último tramo vale más de un 50 % más que el del primero', () => {
    const brackets = uteTariff('simple').brackets!
    const first = brackets[0].pricePerKwh
    const last = brackets[brackets.length - 1].pricePerKwh
    expect(last / first).toBeGreaterThan(1.5)
  })

  it('duplicar el consumo aumenta la factura más del doble en la parte de energía', () => {
    const a = simpleEnergyCost(300).total
    const b = simpleEnergyCost(600).total
    expect(b).toBeGreaterThan(a * 2)
  })

  it('un consumo de 0 kWh no cobra energía', () => {
    expect(simpleEnergyCost(0).total).toBe(0)
    expect(simpleEnergyCost(0).parts).toHaveLength(0)
  })
})

describe('IVA', () => {
  // Si esto se rompe, la página miente en el número que el lector compara contra su factura.
  it('no grava el cargo fijo y sí la energía y la potencia', () => {
    const bill = estimateUteBill('simple', input())
    const fijo = bill.lines.find(l => l.label === 'Cargo fijo')!
    const potencia = bill.lines.find(l => l.label === 'Potencia contratada')!
    expect(fijo.taxed).toBe(false)
    expect(potencia.taxed).toBe(true)
    expect(bill.lines.filter(l => l.label.startsWith('Energía')).every(l => l.taxed)).toBe(true)
    expect(bill.untaxed).toBeCloseTo(uteTariff('simple').cargoFijo, 2)
    expect(bill.iva).toBeCloseTo(bill.taxedBase * UTE_IVA_RATE, 2)
    expect(bill.total).toBeCloseTo(bill.untaxed + bill.taxedBase + bill.iva, 2)
  })

  it('el total NO es el subtotal por 1,22', () => {
    const bill = estimateUteBill('simple', input())
    const naive = (bill.untaxed + bill.taxedBase) * (1 + UTE_IVA_RATE)
    expect(bill.total).toBeLessThan(naive)
  })
})

describe('reparto por franjas', () => {
  it('reparte el consumo y el llano absorbe el resto', () => {
    const s = splitBands(input({ kwh: 500, puntaPct: 20, vallePct: 30 }), true)
    expect(s.punta).toBeCloseTo(100, 2)
    expect(s.valle).toBeCloseTo(150, 2)
    expect(s.llano).toBeCloseTo(250, 2)
    expect(s.punta + s.valle + s.llano).toBeCloseTo(500, 2)
  })

  it('ignora el valle cuando la tarifa no lo tiene', () => {
    const s = splitBands(input({ kwh: 400, puntaPct: 25, vallePct: 50 }), false)
    expect(s.valle).toBe(0)
    expect(s.punta).toBeCloseTo(100, 2)
    expect(s.llano).toBeCloseTo(300, 2)
  })

  // Un campo de porcentaje acepta cualquier cosa; el llano nunca puede quedar negativo.
  it('normaliza porcentajes que se pasan de 100 sin producir un llano negativo', () => {
    const s = splitBands(input({ kwh: 100, puntaPct: 80, vallePct: 80 }), true)
    expect(s.llano).toBeGreaterThanOrEqual(0)
    expect(s.punta + s.valle + s.llano).toBeCloseTo(100, 2)
  })

  it('clampea porcentajes negativos', () => {
    const s = splitBands(input({ kwh: 100, puntaPct: -30, vallePct: 0 }), true)
    expect(s.punta).toBe(0)
    expect(s.llano).toBeCloseTo(100, 2)
  })
})

describe('comparador de tarifas', () => {
  it('con casi todo el consumo en la punta, la Simple gana', () => {
    const c = compareUteTariffs(input({ kwh: 400, puntaPct: 90 }))
    expect(c.best.tariff.id).toBe('simple')
    expect(c.annualSavingVsSimple).toBe(0)
  })

  it('con consumo alto y poca punta, el horario gana y reporta el ahorro anual', () => {
    const c = compareUteTariffs(input({ kwh: 700, puntaPct: 5, vallePct: 30 }))
    expect(c.best.tariff.id).not.toBe('simple')
    expect(c.annualSavingVsSimple).toBeGreaterThan(0)
    expect(c.annualSavingVsSimple).toBeCloseTo((c.simple.total - c.best.total) * 12, 1)
  })

  it('marca como no elegible la tarifa horaria cuando la potencia no llega al mínimo', () => {
    const c = compareUteTariffs(input({ potenciaKw: 2.3 }))
    const doble = c.results.find(r => r.tariff.id === 'doble')!
    expect(doble.ineligibleReason).toMatch(/3.5 kW/)
    expect(c.best.tariff.id).toBe('simple')
  })

  it('nunca elige una tarifa no elegible', () => {
    const c = compareUteTariffs(input({ potenciaKw: 1.4, kwh: 900, puntaPct: 0, vallePct: 60 }))
    expect(c.best.ineligibleReason).toBeNull()
  })

  it('el costo efectivo del kWh incluye cargos fijos e IVA', () => {
    const bill = estimateUteBill('simple', input({ kwh: 100 }))
    const brackets = uteTariff('simple').brackets!
    // Con 100 kWh el cargo fijo pesa mucho: el costo real por kWh supera holgadamente la tarifa.
    expect(bill.effectiveKwhCost).toBeGreaterThan(brackets[0].pricePerKwh)
  })

  it('con 0 kWh el costo efectivo es 0 y no NaN', () => {
    expect(estimateUteBill('simple', input({ kwh: 0 })).effectiveKwhCost).toBe(0)
  })
})

describe('bonificación del 40 %', () => {
  it('rechaza por consumo y por potencia, y lo dice por separado', () => {
    const r = checkUteDiscount({ kwh: 400, potenciaKw: 5.7 })
    expect(r.eligible).toBe(false)
    expect(r.reasons).toHaveLength(2)
  })

  it('acepta cuando se cumplen las dos condiciones medibles', () => {
    const r = checkUteDiscount({
      kwh: UTE_DISCOUNT_KWH_CAP - 1,
      potenciaKw: UTE_DISCOUNT_POTENCIA_CAP,
    })
    expect(r.eligible).toBe(true)
    // No promete el beneficio: la condición personal la sabe el lector.
    expect(r.reasons[0]).toMatch(/jubilado|Fondo de Solidaridad/i)
  })

  it('el tope de consumo es estricto: 230 kWh justos no califica', () => {
    expect(checkUteDiscount({ kwh: UTE_DISCOUNT_KWH_CAP, potenciaKw: 3.5 }).eligible).toBe(false)
  })
})

describe('integridad de los datos publicados', () => {
  it('las tres tarifas tienen cargo fijo, potencia y precios de energía', () => {
    expect(UTE_TARIFFS).toHaveLength(3)
    for (const t of UTE_TARIFFS) {
      expect(t.cargoFijo).toBeGreaterThan(0)
      expect(t.potenciaPerKw).toBeGreaterThan(0)
      expect(t.potenciaRange.min).toBeLessThan(t.potenciaRange.max)
      expect(Boolean(t.brackets) !== Boolean(t.bands)).toBe(true)
    }
  })

  it('la punta es la franja más cara de cada tarifa horaria', () => {
    for (const t of UTE_TARIFFS.filter(t => t.bands)) {
      expect(t.bands!.punta).toBeGreaterThan(t.bands!.llano)
      if (t.bands!.valle !== undefined) expect(t.bands!.llano).toBeGreaterThan(t.bands!.valle)
    }
  })

  it('todas las palancas dicen qué hacer y qué se gana', () => {
    expect(UTE_LEVERS.length).toBeGreaterThanOrEqual(4)
    for (const l of UTE_LEVERS) {
      expect(l.action.length).toBeGreaterThan(20)
      expect(l.effect.length).toBeGreaterThan(20)
    }
  })

  it('cada pregunta del FAQ tiene respuesta corta y desarrollo', () => {
    expect(BILLS_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of BILLS_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.short.length).toBeGreaterThan(10)
      expect(f.answer.length).toBeGreaterThan(80)
    }
  })

  it('los tramos de OSE y los cargos fijos son monótonos crecientes', () => {
    const fixed = OSE_FIXED_CHARGES.map(c => c.amount)
    expect([...fixed].sort((a, b) => a - b)).toEqual(fixed)
    const perM3 = OSE_BLOCKS.filter(b => b.kind === 'perM3').map(b => b.amount)
    expect([...perM3].sort((a, b) => a - b)).toEqual(perM3)
  })

  it('toda cifra publicada tiene fuente citada', () => {
    expect(TARIFF_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const s of TARIFF_SOURCES) expect(s.url).toMatch(/^https:\/\//)
    // Las dos fuentes normativas que sostienen los precios.
    expect(TARIFF_SOURCES.some(s => s.url.includes('339-2025'))).toBe(true)
    expect(TARIFF_SOURCES.some(s => s.url.includes('340-2025'))).toBe(true)
  })
})

describe('alcance territorial del saneamiento', () => {
  // El error que este bloque existe para impedir: leer la regla del 100 % como regla nacional.
  // En Montevideo el saneamiento no lo presta OSE, así que ese renglón no está en su factura.
  it('separa a Montevideo del resto y nombra a quién le paga cada uno', () => {
    expect(SANEAMIENTO_AUTHORITIES).toHaveLength(2)
    const mvd = SANEAMIENTO_AUTHORITIES.find(a => a.scope === 'Montevideo')!
    const interior = SANEAMIENTO_AUTHORITIES.find(a => a.scope !== 'Montevideo')!
    expect(mvd.operator).toMatch(/Intendencia/)
    expect(interior.operator).toBe('OSE')
    // La regla del 100 % es del decreto de OSE: sólo vale donde OSE factura el saneamiento.
    expect(interior.variableCharge).toMatch(/100 %/)
    expect(mvd.variableCharge).not.toMatch(/100 %/)
  })

  it('cada fila cita la norma que la sostiene', () => {
    for (const a of SANEAMIENTO_AUTHORITIES) {
      expect(a.rule).toMatch(/Ley 11\.907/)
      expect(a.billing.length).toBeGreaterThan(10)
    }
  })

  it('la pregunta del saneamiento dice que en Montevideo lo cobra la Intendencia', () => {
    const f = faq('saneamiento')
    expect(f.answer).toMatch(/excepto en el Departamento de Montevideo/)
    expect(f.answer).toMatch(/Intendencia/)
    // Cifras que caducan: el importe de la Intendencia va con el período al que corresponde.
    expect(f.answer).toMatch(/junio a setiembre de 2025/)
  })

  it('ninguna respuesta afirma la regla del 100 % sin decir dónde vale', () => {
    // Antes, «¿Por qué la factura del agua tiene dos partes parecidas?» abría con «El cargo
    // variable del saneamiento convencional es el 100 % del importe facturado por cargo variable
    // de agua», sin una palabra de alcance, y seguía con los $ 137,05 como si fueran de todos.
    for (const f of BILLS_FAQ) {
      if (!/100 % del (?:importe facturado por )?cargo variable/.test(f.answer)) continue
      expect(f.answer).toMatch(/Montevideo/)
      expect(f.answer).toMatch(/OSE/)
    }
  })

  it('el cargo fijo de saneamiento se publica como de OSE, no como de todo el país', () => {
    const f = BILLS_FAQ.find(q => q.answer.includes('137,05'))!
    expect(f.answer).toMatch(/saneamiento de OSE/)
    expect(f.answer).toMatch(/Montevideo/)
  })

  it('el 100 % no se exporta como escalar suelto', () => {
    // Era `export const SANEAMIENTO_MULTIPLIER = 1`. Ninguna página, componente ni test lo
    // consumía, y un número sin territorio pegado se lee como regla nacional: es la forma exacta
    // de volver a cobrarle a un montevideano un renglón que su factura de OSE no tiene. El dato
    // vive donde va con su alcance al lado, en SANEAMIENTO_AUTHORITIES, que la página renderiza.
    expect(Object.keys(bills)).not.toContain('SANEAMIENTO_MULTIPLIER')
    const interior = SANEAMIENTO_AUTHORITIES.find(a => a.operator === 'OSE')!
    expect(interior.variableCharge).toMatch(/100 %/)
    expect(interior.scope).toMatch(/no son Montevideo/)
  })
})

describe('la meta description no promete fuera de su territorio', () => {
  // Es lo que ve Google y lo que viaja al compartir: description, ogDescription y
  // twitterDescription salen de la misma const. El h2 ya se había acotado; la description seguía
  // cerrando con «por qué el saneamiento te cobra el agua dos veces», que para el ~40 % de la
  // audiencia que está en Montevideo describe una factura de OSE que no existe.
  const description = page.match(/const description =\s*'([^']*)'/)![1]

  it('no afirma el doble cobro sin decir dónde vale', () => {
    expect(description).not.toContain('por qué el saneamiento te cobra el agua dos veces')
    if (/dos veces/.test(description)) expect(description).toMatch(/Montevideo|interior/)
  })

  it('nombra a los dos que cobran', () => {
    expect(description).toContain('OSE')
    expect(description).toContain('Montevideo')
    expect(description).toContain('Intendencia')
  })

  it('sigue siendo una description usable y no un fragmento', () => {
    expect(description.length).toBeGreaterThan(120)
    expect(description.length).toBeLessThan(400)
    expect(description).toContain('339/025')
  })
})

describe('qué puede el Área de Defensa del Consumidor', () => {
  // La corrección anterior de esta misma respuesta cambió una falsedad jurídica por otra: cerraba
  // con «quien resuelve si corresponde es ese organismo o un juez». El art. 42 de la Ley 17.250 no
  // le da al Área ninguna facultad resolutiva: cita a audiencia «para tentar el acuerdo» (lit. F)
  // y sanciona (art. 47), y la multa es del Estado. Y encima lo desmiente el propio sitio.
  const damage = () => faq('variación de tensión')

  it('no le atribuye al organismo un poder resolutivo', () => {
    expect(damage().answer).not.toContain('quien resuelve si corresponde')
    expect(damage().answer).not.toMatch(/resuelve/)
  })

  it('publica la facultad real, textual del art. 42 lit. F', () => {
    expect(damage().answer).toContain('tentar el acuerdo entre las partes')
    expect(damage().answer).toContain('presunción simple en su contra')
    expect(damage().answer).toMatch(/art\. 42, lit\. F/)
  })

  it('deja el pago en manos de un juez y aclara que la multa no repara nada', () => {
    expect(damage().answer).toMatch(/sólo lo puede hacer un juez/)
    expect(damage().answer).toMatch(/art\. 47/)
    expect(damage().answer).toMatch(/no una reparación para vos/)
  })

  it('no contradice a /defensa-al-consumidor-uruguay sobre el mismo organismo', () => {
    // Coherencia interna: si aquella página publica que el Área no puede ordenar la devolución y
    // que la restitución la ordena un juez, ésta no puede decir que el Área resuelve si te pagan.
    const cantOrder = DEFENSE_POWERS.find(p => !p.can && /ordenar la devolución/i.test(p.title))
    expect(cantOrder).toBeDefined()
    expect(cantOrder!.detail).toMatch(/la tiene que ordenar un juez/)
    expect(damage().answer).toMatch(/un juez/)
  })

  it('las dos normas nuevas están en la lista de fuentes', () => {
    const urls = TARIFF_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('leyes/17250-2000/42')
    expect(urls).toContain('leyes/17250-2000/47')
  })
})

describe('la página publica el alcance territorial, no sólo el módulo', () => {
  // El hallazgo grave: SANEAMIENTO_AUTHORITIES existía y no lo importaba nadie. La corrección
  // vivía en el módulo y el lector veía el dato viejo.
  const water = page.slice(page.indexOf('<!-- Water -->'), page.indexOf('<!-- FAQ -->'))

  it('el bloque del agua renderiza quién cobra el saneamiento en cada lado', () => {
    expect(page).toContain('SANEAMIENTO_AUTHORITIES')
    expect(water).toContain('SANEAMIENTO_AUTHORITIES')
    // No alcanza con importarlo: tiene que recorrerse en el template.
    expect(water).toMatch(/v-for="a in SANEAMIENTO_AUTHORITIES"/)
  })

  it('no afirma la regla del 100 % ni el cargo fijo de OSE sin acotar el territorio', () => {
    // Cualquiera de las dos cifras obliga a nombrar a Montevideo en el mismo bloque.
    expect(water).toMatch(/100 %/)
    expect(water).toContain('OSE_SANEAMIENTO_FIXED')
    expect(water).toMatch(/Montevideo/)
    // Y el h2 ya no promete como universal algo que en Montevideo no describe ninguna factura.
    expect(page).not.toMatch(/Y el agua: por qué pagás el consumo dos veces/)
  })

  it('el pie muestra las dos fechas de contraste, no una sola', () => {
    expect(page).toContain('BILLS_FAQ_VERIFIED_AT')
    expect(page).toContain('BILLS_VERIFIED_AT')
    expect(page).toMatch(/faqVerifiedAt/)
    // La fecha vieja no puede quedar sola cubriendo cifras verificadas después.
    expect(page).not.toMatch(/Cifras contrastadas el \{\{ verifiedAt \}\}/)
  })
})

describe('preguntas nuevas del FAQ', () => {
  it('cubre los cinco huecos que el corpus de Reddit repite', () => {
    expect(BILLS_FAQ.length).toBeGreaterThanOrEqual(12)
    for (const fragment of [
      'saneamiento',
      'estima UTE',
      'variación de tensión',
      'atrasé',
      'auto eléctrico',
    ]) {
      expect(faq(fragment).answer.length).toBeGreaterThan(200)
    }
  })

  it('la factura estimada se cita textual y con la salida concreta', () => {
    const f = faq('estima UTE')
    // Textual de UTE, no una reconstrucción nuestra.
    expect(f.answer).toContain('si fue estimada (no se accedió al medidor) o real (si se accedió)')
    // La palanca del usuario y el efecto de reclamar, con artículo.
    expect(f.answer).toMatch(/cinco días antes/)
    expect(f.answer).toMatch(/art\. 86/)
  })

  it('el daño por tensión se publica como procedimiento, nunca como promesa de pago', () => {
    const f = faq('variación de tensión')
    expect(f.answer).toMatch(/20 días hábiles/)
    expect(f.answer).toMatch(/papel membretado/)
    // Publicar la ausencia: el reglamento de URSEA no tiene resarcimiento por daños.
    expect(f.answer).toMatch(/no tiene un solo artículo de daños, resarcimiento ni indemnización/)
    // Si alguna vez alguien escribe que UTE paga, esto lo frena. Prohíbe PROMETER el pago;
    // no prohíbe nombrar la vía legal que sí existe (Ley 17.250, art. 34).
    expect(f.answer).not.toMatch(/UTE (te )?(paga|indemniza|repone|cubre)/i)
    expect(f.short).not.toMatch(/UTE (te )?paga/i)
  })

  it('no niega toda vía legal: nombra el art. 34 sin prometer resultado', () => {
    const f = faq('variación de tensión')
    // Antes el `short` decía «Que te lo paguen no lo promete ninguna norma». Es falso: la Ley
    // 17.250 art. 34 hace responder al proveedor por el daño del vicio de la prestación, y su
    // art. 3 mete a las personas jurídicas públicas estatales en la definición de proveedor.
    expect(f.short).not.toMatch(/ninguna norma/i)
    expect(f.short).toMatch(/URSEA/)
    expect(f.answer).toMatch(/art\. 34/)
    expect(f.answer).toContain('será responsable el proveedor')
    expect(f.answer).toMatch(/art\. 3 define proveedor/)
    // Nombrar la vía no es prometerla: sigue diciendo qué hay que probar y quién resuelve.
    expect(f.answer).toMatch(/no es automática/)
    expect(f.answer).toMatch(/probar el daño/)
    // Y no puede volver a cerrar como si la heladera no tuviera ninguna ruta.
    expect(f.answer).toMatch(/no quiere decir que no exista ninguna vía/)
  })

  it('cita la tabla de tensión con la numeración de la versión que publicamos', () => {
    const f = faq('variación de tensión')
    // «art. 45 y Tabla 2» era la numeración de una versión que no estaba entre las fuentes. En el
    // texto de IMPO (Res. 29/2003 con modificativas hasta 2006) el art. 45 remite a las Tablas 3
    // y 4, y su Tabla 2 es la de metas de continuidad: otra cosa. La Res. URSEA 297/018 dejó una
    // sola tabla y corrió la numeración, y ésa es la que cita el texto ordenado de URSEA.
    expect(f.answer).not.toMatch(/art\. 45 y Tabla 2/)
    expect(f.answer).toContain('Niveles de tensión: desviaciones admitidas')
    expect(f.answer).toMatch(/art\. 46 del texto ordenado de URSEA/)
    expect(f.answer).toMatch(/\(art\. 47\)/)
    // La versión citada tiene que estar publicada, no sólo haber sido leída por nosotros.
    const urls = TARIFF_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('TOR2_Energia_Electrica')
  })

  it('la vía de la Ley 17.250 tiene sus artículos en la lista de fuentes', () => {
    const urls = TARIFF_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('leyes/17250-2000/34')
    expect(urls).toContain('leyes/17250-2000/3')
  })

  it('el atraso no afirma que el reporte al Clearing sea automático', () => {
    const f = faq('atrasé')
    expect(f.answer).toMatch(/5 %/)
    expect(f.answer).toMatch(/30 \(treinta\) días corridos/)
    expect(f.answer).toMatch(/Ley 18\.331/)
    expect(f.answer).not.toMatch(/automátic/i)
    expect(f.answer).toMatch(
      /no lo dice|no dicen que la deuda se informe|ni las páginas de trámites/
    )
  })

  it('la rehabilitación se cita con su condición y sin ocultar la de medida indirecta', () => {
    const f = faq('atrasé')
    // El numeral 1.5 del pliego dice «En servicios de medida directa QUE NO REQUIERAN DAR».
    // Sin esa condición la cifra se publica como si valiera para toda medida directa.
    expect(f.answer).toContain('que no requieran DAR')
    expect(f.answer).toContain('2.220')
    // Y el mismo numeral cobra $ 3.128 en medida indirecta: omitirlo hacía parecer que la
    // rehabilitación era un asunto exclusivo de la medida directa.
    expect(f.answer).toContain('3.128')
    // La reconexión ($ 2.375) es el numeral 1.4, no el 1.5: son cargos distintos.
    expect(f.answer).toContain('2.375')
    expect(f.answer).toMatch(/numeral 1\.4/)
    expect(f.answer).toMatch(/numeral 1\.5/)
  })

  it('no le atribuye al INE una periodicidad que su fuente no publica', () => {
    const f = faq('atrasé')
    // La página del INE dice que la UR «se ajusta periódicamente en función del Índice Medio de
    // Salarios» y no usa la palabra «mensual» en ningún lado. Decíamos «todos los meses» citando
    // esa URL: el dato puede ser cierto, pero la fuente no lo dice.
    expect(f.answer).not.toMatch(/la UR la publica el INE todos los meses/)
    expect(f.answer).toMatch(/el valor de la UR lo publica el INE/)
    // Y la fuente pasa a ser la serie de valores, que es donde los valores están.
    const ine = TARIFF_SOURCES.find(s => s.url.includes('instituto-nacional-estadistica'))!
    expect(ine.url).toContain('series-historicas')
  })

  it('el auto eléctrico publica la ausencia de tarifa en vez de inventarle un nombre', () => {
    const f = faq('auto eléctrico')
    expect(f.answer).toMatch(/no tiene ninguna tarifa de movilidad eléctrica/)
    expect(f.answer).toContain('modalidad de consumo Residencial')
    // La trampa concreta: subir potencia te deja 12 meses sin poder bajarla parcialmente.
    expect(f.answer).toMatch(/12 meses/)
  })

  it('cada norma citada en el FAQ tiene su URL en la lista de fuentes', () => {
    const urls = TARIFF_SOURCES.map(s => s.url).join(' ')
    const norms: Array<[string, string]> = [
      ['Ley 11.907', '11907-1952'],
      ['Decreto 277/002', '277-2002'],
      ['Ley 18.331', '18331-2008'],
      ['Decreto 340/025', '340-2025'],
      ['Decreto 339/025', '339-2025'],
      ['Decreto 29.434', 'normativa.montevideo.gub.uy'],
    ]
    const answers = BILLS_FAQ.map(f => f.answer).join(' ')
    for (const [cited, urlFragment] of norms) {
      if (answers.includes(cited)) expect(urls).toContain(urlFragment)
    }
    // El pliego sostiene la multa por mora, la reconexión y la regla de los 12 meses de potencia.
    expect(urls).toContain('Pliego%20Tarifario%20Enero%202026')
    expect(urls).toContain('resoluciones-ursea-reglamento/29-2003')
  })

  it('declara cuándo se contrastó el bloque nuevo, sin pisar la fecha del resto', () => {
    expect(BILLS_FAQ_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(BILLS_FAQ_VERIFIED_AT >= BILLS_VERIFIED_AT).toBe(true)
  })
})
