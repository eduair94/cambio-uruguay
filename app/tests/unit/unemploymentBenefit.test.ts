import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { URUGUAY } from '../../utils/calculators'
import {
  BENEFIT_FLOOR,
  CAUSAL_DISPUTE_PROOF,
  CAUSALES,
  COVERAGE_RULES,
  DESPIDO_MONTHLY_CAPS,
  DESPIDO_PERCENTAGES,
  EXIT_RULES,
  EXTENSION_JORNALES_50_PLUS_BPS,
  EXTENSION_JORNALES_50_PLUS_LEY,
  EXTENSION_MONTHS_50_PLUS,
  FAMILY_COMPLEMENT_PCT,
  LEGAL_FLOOR_ARTICLE_BPC,
  PROCEDURE_STEPS,
  REPEAT_AFTER_MONTHS,
  REPEAT_CONTRIBUTION_MONTHS,
  REQUIREMENTS,
  SUSPENSION_CAP,
  SUSPENSION_FLOOR,
  SUSPENSION_PERCENTAGE,
  TERMINATION_CAUSES,
  UNEMPLOYMENT_FAQ,
  UNEMPLOYMENT_SOURCES,
  UNEMPLOYMENT_VERIFIED_AT,
  UNIPERSONAL_WHILE_ON_BENEFIT,
  dependantIncomeCap,
  estimateUnemploymentBenefit,
  legalFloor,
  type BenefitInput,
} from '../../utils/unemploymentBenefit'

const input = (over: Partial<BenefitInput> = {}): BenefitInput => ({
  averageNominal: 50000,
  causal: 'despido',
  age: 35,
  hasDependants: false,
  ...over,
})

describe('subsidio por despido', () => {
  it('paga el porcentaje decreciente sobre el promedio nominal', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 50000 }))
    expect(r.months).toHaveLength(6)
    expect(r.months.map(m => m.percentage)).toEqual([...DESPIDO_PERCENTAGES])
    expect(r.months[0].amount).toBe(Math.round(50000 * 0.66))
    expect(r.months[5].amount).toBe(Math.round(50000 * 0.4))
  })

  // La queja recurrente en Reddit: "cada mes me pagan menos". Es el régimen, no un error.
  it('el importe baja mes a mes', () => {
    const r = estimateUnemploymentBenefit(input())
    for (let i = 1; i < r.months.length; i++) {
      expect(r.months[i].amount).toBeLessThan(r.months[i - 1].amount)
    }
    expect(r.notes.some(n => n.includes('baja todos los meses'))).toBe(true)
  })

  it('aplica el tope de cada mes cuando el sueldo es alto', () => {
    // Un promedio muy alto cobra el tope todos los meses.
    const r = estimateUnemploymentBenefit(input({ averageNominal: 400000 }))
    expect(r.months.map(m => m.amount)).toEqual([...DESPIDO_MONTHLY_CAPS])
    expect(r.months.every(m => m.cappedByLimit)).toBe(true)
    expect(r.notes.some(n => n.includes('supera el tope'))).toBe(true)
  })

  // Aunque esté topeado los seis meses, el importe igual baja: los topes también decrecen.
  it('con sueldo topeado el importe sigue bajando, porque los topes decrecen', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 400000 }))
    expect(r.months[0].amount).toBeGreaterThan(r.months[5].amount)
  })

  it('no aplica tope cuando el porcentaje da por debajo', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 40000 }))
    expect(r.months.every(m => m.cappedByLimit)).toBe(false)
  })
})

// Art. 7.7: «El monto del subsidio, resultante de la aplicación de los artículos 7.1, 7.2 y 7.5,
// no podrá ser inferior a 1 BPC». El 7.1 es el despido. Antes de este test la página publicaba
// $ 3.300 con un promedio de $ 5.000: por debajo del piso legal y sin ninguna fuente que lo avale.
//
// SEGUNDA CORRECCIÓN (2026-08-10): el arreglo de aquella vez leyó ese «1 BPC» como 1 × la BPC del
// año ($ 6.864) y publicó un piso que no publica NADIE, un 19 % por debajo del que corresponde. La
// Ley 19.003, anotada al pie de los artículos 7.x en IMPO, pasó los mínimos y máximos de las
// prestaciones de seguridad social a U.R. desde el 01/01/2012, y desde entonces esa «BPC» es una
// unidad de cuenta que ya no sigue a la BPC. Los tests de acá abajo lo demuestran con la propia
// tabla de topes de BPS y fijan el piso en el importe publicado, $ 8.467.
describe('piso del artículo 7.7: uno solo, y NO es la BPC del año', () => {
  it('el piso es el importe publicado ($ 8.467), no 1 × la BPC vigente', () => {
    // ESTE ES EL TEST QUE FIJA LA CORRECCIÓN: la versión equivocada devolvía 6864.
    expect(legalFloor()).toBe(BENEFIT_FLOOR)
    expect(BENEFIT_FLOOR).toBe(8467)
    expect(legalFloor()).not.toBe(LEGAL_FLOOR_ARTICLE_BPC * URUGUAY.bpc)
  })

  // El art. 7.7 nombra al 7.1 (despido), al 7.2 (suspensión) y al 7.5 con UNA sola redacción y UN
  // solo mínimo. Publicar dos importes distintos para una misma regla era la señal del error.
  it('despido y suspensión comparten piso: no hay dos mínimos', () => {
    const despido = estimateUnemploymentBenefit(input({ averageNominal: 5000 }))
    const suspension = estimateUnemploymentBenefit(
      input({ causal: 'suspension', averageNominal: 5000 })
    )
    expect(despido.months[0].floor).toBe(suspension.months[0].floor)
    expect(despido.months[0].amount).toBe(suspension.months[0].amount)
  })

  // La prueba está en la tabla que BPS publica EN LA PÁGINA DE DESPIDO: los seis topes son los
  // 11, 9,5, 8, 7, 6,5 y 6 «BPC» del art. 7.8 valuados a la misma unidad que el mínimo del 7.7.
  it('los topes de BPS confirman la unidad: cada «BPC» del art. 7.8 vale ≈ el piso', () => {
    const bpcDelArticulo = [11, 9.5, 8, 7, 6.5, 6]
    for (let i = 0; i < DESPIDO_MONTHLY_CAPS.length; i++) {
      const unidad = DESPIDO_MONTHLY_CAPS[i] / bpcDelArticulo[i]
      expect(Math.abs(unidad - BENEFIT_FLOOR) / BENEFIT_FLOOR).toBeLessThan(0.001)
      // Y con la BPC del año no da: el primer tope sería $ 75.504 y BPS paga $ 93.155.
      expect(Math.abs(unidad - URUGUAY.bpc) / URUGUAY.bpc).toBeGreaterThan(0.15)
    }
  })

  it('levanta el importe hasta el piso cuando el porcentaje da menos', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 5000 }))
    // La versión original devolvía 5000 * 0,66 = 3300; la siguiente, 6864.
    expect(r.months[0].amount).toBe(BENEFIT_FLOOR)
    expect(r.months.every(m => m.amount === BENEFIT_FLOOR)).toBe(true)
    expect(r.months.every(m => m.raisedToFloor)).toBe(true)
  })

  // No es un caso de borde: con el 40 % del sexto mes, todo promedio entre $ 17.160 y $ 21.168
  // caía por debajo del mínimo legal y se publicaba igual.
  it('con promedio $ 20.000 el sexto mes no puede salir $ 8.000', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 20000 }))
    const ultimo = r.months[r.months.length - 1]
    expect(ultimo.percentage).toBe(40)
    expect(ultimo.gross).toBe(8000) // lo que da el porcentaje…
    expect(ultimo.amount).toBe(BENEFIT_FLOOR) // …y lo que se cobra.
    expect(ultimo.raisedToFloor).toBe(true)
    // El primer mes, en cambio, está muy por encima del piso: el error era invisible ahí.
    expect(r.months[0].raisedToFloor).toBe(false)
  })

  it('avisa que el piso es de jornada completa y por qué no es la BPC', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 5000 }))
    const nota = r.notes.find(n => n.includes('7.7'))
    expect(nota).toBeTruthy()
    expect(nota).toMatch(/proporcional/i)
    expect(nota).toMatch(/8\.467/)
    expect(nota).toMatch(/19\.003/)
    // La racionalización inventada que justificaba dos pisos distintos no vuelve.
    expect(nota).not.toMatch(/BPS no publica/)
  })

  it('con un promedio normal el piso no toca nada', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 50000 }))
    expect(r.months.some(m => m.raisedToFloor)).toBe(false)
  })

  // El artículo 7.7 nombra al 7.1, al 7.2 y al 7.5. No nombra al 7.3 (trabajo reducido):
  // ahí no hay mínimo previsto y acá no se le inventa uno.
  it('el trabajo reducido no lleva piso porque el 7.7 no lo nombra', () => {
    const r = estimateUnemploymentBenefit(
      input({ causal: 'reduccion', averageNominal: 10000, reducedIncome: 4000 })
    )
    expect(r.months.every(m => m.floor === null)).toBe(true)
    expect(r.months[0].amount).toBe(Math.round(10000 * 0.5 - 4000))
  })
})

describe('complemento por cargas familiares', () => {
  it('suma el 20 % DESPUÉS del tope, no antes', () => {
    const capped = estimateUnemploymentBenefit(
      input({ averageNominal: 400000, hasDependants: true })
    )
    const expected = Math.round(DESPIDO_MONTHLY_CAPS[0] * (1 + FAMILY_COMPLEMENT_PCT / 100))
    expect(capped.months[0].amount).toBe(expected)
    // El error clásico sería topear después: daría exactamente el tope.
    expect(capped.months[0].amount).toBeGreaterThan(DESPIDO_MONTHLY_CAPS[0])
  })

  // Art. 7.9: «A los mínimos y máximos previstos por dichos artículos, se adicionará el suplemento
  // establecido en el artículo 7.10». Se suma AL mínimo; no se absorbe dentro de él.
  it('suma el 20 % DESPUÉS del piso, no dentro de él', () => {
    const r = estimateUnemploymentBenefit(
      input({ causal: 'suspension', averageNominal: 5000, hasDependants: true })
    )
    // La versión equivocada (piso después del complemento) devolvía 8.467.
    expect(r.months[0].amount).toBe(
      Math.round(SUSPENSION_FLOOR * (1 + FAMILY_COMPLEMENT_PCT / 100))
    )
    expect(r.months[0].amount).toBeGreaterThan(SUSPENSION_FLOOR)
  })

  it('también en despido el 20 % se suma sobre el piso legal', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 5000, hasDependants: true }))
    expect(r.months[0].amount).toBe(Math.round(legalFloor() * (1 + FAMILY_COMPLEMENT_PCT / 100)))
  })

  it('sin cargas familiares no suma nada', () => {
    const r = estimateUnemploymentBenefit(input({ hasDependants: false }))
    expect(r.months.every(m => m.complement === 0)).toBe(true)
  })

  it('el tope de ingreso de la persona a cargo es 1 BPC', () => {
    expect(dependantIncomeCap()).toBe(URUGUAY.bpc)
  })
})

// Art. 6.3: «En los casos de DESPIDO de trabajadores que contaren con cincuenta o más años de edad
// al momento de producirse aquél, los máximos totales [...] se extenderán por otros seis meses».
// BPS la publica sólo en la página de despido. Aplicarla a las tres causales inventaba meses.
describe('extensión por 50 años o más: SÓLO en despido', () => {
  it('agrega seis meses y los marca como extensión', () => {
    const r = estimateUnemploymentBenefit(input({ age: 50 }))
    expect(r.totalMonths).toBe(6 + EXTENSION_MONTHS_50_PLUS)
    expect(r.months.filter(m => m.isExtension)).toHaveLength(EXTENSION_MONTHS_50_PLUS)
    expect(r.notes.some(n => n.includes('50 años'))).toBe(true)
  })

  it('la extensión mantiene el último porcentaje: no vuelve a empezar en 66 %', () => {
    const r = estimateUnemploymentBenefit(input({ age: 55 }))
    const last = DESPIDO_PERCENTAGES[DESPIDO_PERCENTAGES.length - 1]
    expect(r.months.filter(m => m.isExtension).every(m => m.percentage === last)).toBe(true)
  })

  it('a los 49 no se extiende', () => {
    expect(estimateUnemploymentBenefit(input({ age: 49 })).totalMonths).toBe(6)
  })

  it('un suspendido de 55 años sigue teniendo 4 meses, no 10', () => {
    const r = estimateUnemploymentBenefit(input({ causal: 'suspension', age: 55 }))
    expect(r.totalMonths).toBe(4)
    expect(r.months.some(m => m.isExtension)).toBe(false)
  })

  it('un trabajo reducido de 55 años sigue teniendo 6 meses, no 12', () => {
    const r = estimateUnemploymentBenefit(
      input({ causal: 'reduccion', age: 55, reducedIncome: 10000 })
    )
    expect(r.totalMonths).toBe(6)
    expect(r.months.some(m => m.isExtension)).toBe(false)
  })

  it('explica por qué no se extendió cuando la causal no es despido', () => {
    const r = estimateUnemploymentBenefit(input({ causal: 'suspension', age: 55 }))
    expect(r.notes.some(n => /sólo de la causal despido/i.test(n))).toBe(true)
  })

  // BPS dice 54 jornales; el art. 6.3 dice 72. Se publica el de BPS, que es quien liquida, pero
  // los dos quedan expuestos para que nadie "corrija" en el sentido equivocado.
  it('publica los dos números de jornales de la extensión y los distingue', () => {
    expect(EXTENSION_JORNALES_50_PLUS_BPS).toBe(54)
    expect(EXTENSION_JORNALES_50_PLUS_LEY).toBe(72)
    const nota = estimateUnemploymentBenefit(input({ age: 50 })).notes.find(n =>
      n.includes('50 años')
    )
    expect(nota).toMatch(/54/)
    expect(nota).toMatch(/72/)
    const faq = UNEMPLOYMENT_FAQ.find(f => /cuántos meses me corresponden/i.test(f.question))
    expect(faq?.answer).toMatch(/54 jornales/)
    expect(faq?.answer).toMatch(/setenta y dos jornales/)
  })
})

describe('suspensión total', () => {
  it('paga 50 % fijo durante 4 meses', () => {
    const r = estimateUnemploymentBenefit(input({ causal: 'suspension', averageNominal: 50000 }))
    expect(r.totalMonths).toBe(4)
    expect(r.months.every(m => m.percentage === SUSPENSION_PERCENTAGE)).toBe(true)
    expect(r.months.every(m => m.amount === Math.round(50000 * 0.5))).toBe(true)
  })

  it('respeta el tope máximo', () => {
    const r = estimateUnemploymentBenefit(input({ causal: 'suspension', averageNominal: 500000 }))
    expect(r.months.every(m => m.amount === SUSPENSION_CAP)).toBe(true)
  })

  it('respeta el piso mínimo que publica BPS', () => {
    const r = estimateUnemploymentBenefit(input({ causal: 'suspension', averageNominal: 5000 }))
    expect(r.months.every(m => m.amount === SUSPENSION_FLOOR)).toBe(true)
    expect(r.notes.some(n => n.includes('mínimo'))).toBe(true)
  })
})

// Art. 7.3: el monto «será la diferencia que existiera entre el monto del subsidio calculado
// conforme al artículo 7.2 y lo efectivamente percibido». El 7.2 es el 50 % de la suspensión, NO
// la escala del despido. Y el art. 7.8 numeral 2 le da a la reducción el mismo tope único que a la
// suspensión total. Con la versión equivocada la página pagaba 2,6 veces de más el primer mes.
describe('trabajo reducido: se calcula sobre el 50 % del artículo 7.2', () => {
  it('cubre la diferencia contra lo que se sigue cobrando, al 50 %', () => {
    const r = estimateUnemploymentBenefit(
      input({ causal: 'reduccion', averageNominal: 50000, reducedIncome: 20000 })
    )
    // La versión equivocada devolvía 50000 * 0,66 - 20000 = 13.000.
    expect(r.months[0].amount).toBe(Math.round(50000 * 0.5 - 20000))
    expect(r.months[0].amount).toBe(5000)
  })

  it('no usa la escala decreciente del despido: el porcentaje es 50 % todos los meses', () => {
    const r = estimateUnemploymentBenefit(
      input({ causal: 'reduccion', averageNominal: 50000, reducedIncome: 20000 })
    )
    expect(r.months.every(m => m.percentage === SUSPENSION_PERCENTAGE)).toBe(true)
    expect(r.months.every(m => m.amount === r.months[0].amount)).toBe(true)
  })

  it('usa el tope único del artículo 7.8, no los topes por mes del despido', () => {
    const r = estimateUnemploymentBenefit(
      input({ causal: 'reduccion', averageNominal: 500000, reducedIncome: 0 })
    )
    expect(r.months.every(m => m.cap === SUSPENSION_CAP)).toBe(true)
    expect(r.months.every(m => m.amount === SUSPENSION_CAP)).toBe(true)
  })

  it('dura 6 meses o 72 jornales, como dice el artículo 6.1', () => {
    const c = CAUSALES.find(x => x.id === 'reduccion')
    expect(c?.months).toBe(6)
    expect(c?.jornales).toBe(72)
  })

  it('nunca da negativo si lo que se cobra supera el subsidio', () => {
    const r = estimateUnemploymentBenefit(
      input({ causal: 'reduccion', averageNominal: 50000, reducedIncome: 90000 })
    )
    expect(r.months.every(m => m.amount >= 0)).toBe(true)
  })

  it('explica en una nota que la base es el 50 %, no el 66 %', () => {
    const r = estimateUnemploymentBenefit(input({ causal: 'reduccion', reducedIncome: 10000 }))
    expect(r.notes.some(n => /50 %/.test(n) && /7\.2/.test(n))).toBe(true)
  })
})

describe('robustez', () => {
  it('un promedio de 0 no rompe ni produce NaN', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 0 }))
    expect(r.total).toBe(0)
    expect(r.months.every(m => Number.isFinite(m.amount))).toBe(true)
  })

  // El piso es el mínimo de una prestación que existe, no un pago a quien no declaró remuneración.
  it('con promedio 0 tampoco se aplica el piso en suspensión', () => {
    const r = estimateUnemploymentBenefit(input({ causal: 'suspension', averageNominal: 0 }))
    expect(r.total).toBe(0)
  })

  it('un promedio negativo se trata como 0', () => {
    expect(estimateUnemploymentBenefit(input({ averageNominal: -5000 })).total).toBe(0)
  })

  it('el total es la suma de los meses', () => {
    const r = estimateUnemploymentBenefit(input({ age: 52, hasDependants: true }))
    expect(r.total).toBe(r.months.reduce((n, m) => n + m.amount, 0))
  })
})

describe('integridad de los datos publicados', () => {
  it('hay un tope por cada mes del régimen general', () => {
    expect(DESPIDO_MONTHLY_CAPS).toHaveLength(DESPIDO_PERCENTAGES.length)
  })

  it('porcentajes y topes son estrictamente decrecientes', () => {
    for (let i = 1; i < DESPIDO_PERCENTAGES.length; i++) {
      expect(DESPIDO_PERCENTAGES[i]).toBeLessThan(DESPIDO_PERCENTAGES[i - 1])
      expect(DESPIDO_MONTHLY_CAPS[i]).toBeLessThan(DESPIDO_MONTHLY_CAPS[i - 1])
    }
  })

  it('el piso de suspensión es menor que su tope', () => {
    expect(SUSPENSION_FLOOR).toBeLessThan(SUSPENSION_CAP)
  })

  // Un solo importe para una sola regla: el alias existe porque BPS lo rotula «tope mínimo por
  // suspensión», no porque sea un piso distinto.
  it('el piso de suspensión y el del artículo 7.7 son el mismo número', () => {
    expect(SUSPENSION_FLOOR).toBe(BENEFIT_FLOOR)
    expect(legalFloor()).toBe(SUSPENSION_FLOOR)
  })

  it('las tres causales están descritas con duración', () => {
    expect(CAUSALES).toHaveLength(3)
    for (const c of CAUSALES) {
      expect(c.months).toBeGreaterThan(0)
      expect(c.jornales).toBeGreaterThan(0)
      expect(c.what.length).toBeGreaterThan(30)
    }
  })

  it('requisitos y causas de cese están documentados', () => {
    expect(REQUIREMENTS.length).toBeGreaterThanOrEqual(3)
    expect(TERMINATION_CAUSES.length).toBeGreaterThanOrEqual(3)
  })

  it('cada pregunta del FAQ tiene respuesta corta y desarrollo', () => {
    expect(UNEMPLOYMENT_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of UNEMPLOYMENT_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(80)
    }
  })

  it('toda cifra publicada tiene fuente oficial', () => {
    expect(UNEMPLOYMENT_SOURCES.length).toBeGreaterThanOrEqual(3)
    // IMPO es la fuente del texto de la norma; el resto, BPS y MTSS (gub.uy). Nada más entra acá.
    for (const s of UNEMPLOYMENT_SOURCES)
      expect(s.url).toMatch(/^https:\/\/(www\.)?(bps|gub|impo)\./)
  })

  // impo.com.uy sirve dos versiones: /bases/... es el texto vigente y /bases/...-originales/ es el
  // original ya derogado. Citar el original como si fuera vigente ya costó un error grave.
  it('la fuente de IMPO apunta al texto vigente, no al original', () => {
    const impo = UNEMPLOYMENT_SOURCES.find(s => s.url.includes('impo.com.uy'))
    expect(impo?.url).toBeTruthy()
    expect(impo?.url).not.toMatch(/originales/)
  })

  it('la fecha de verificación es una fecha real', () => {
    expect(UNEMPLOYMENT_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(new Date(UNEMPLOYMENT_VERIFIED_AT).getTime())).toBe(false)
  })
})

// BPS exige los dos requisitos juntos: «haber computado en los 180 días en planilla Y 150 jornales
// trabajados». Publicarlos como alternativas le decía a un jornalero sin los 180 días que tenía
// derecho cuando no lo tiene.
describe('los aportes previos son acumulativos', () => {
  it('el jornalero necesita los 180 días Y los 150 jornales', () => {
    const jornal = REQUIREMENTS.find(r => /jornal/i.test(r.label))
    expect(jornal?.detail).toMatch(/180 días en planilla/)
    expect(jornal?.detail).toMatch(/150 jornales/)
    expect(jornal?.detail).toMatch(/ Y /)
  })

  it('el destajista necesita los 180 días Y las 6 BPC', () => {
    const destajo = REQUIREMENTS.find(r => /destajo/i.test(r.label))
    expect(destajo?.detail).toMatch(/180 días en planilla/)
    expect(destajo?.detail).toMatch(/6 BPC/)
    expect(destajo?.detail).toMatch(/ Y /)
  })

  it('ningún requisito se presenta como alternativa del otro', () => {
    for (const r of REQUIREMENTS) {
      expect(r.detail).not.toMatch(/180 días en planilla o /i)
      expect(r.detail).not.toMatch(/o bien 150 jornales/i)
    }
  })

  // Los 180 días son de INDUSTRIA Y COMERCIO. Publicar sólo que «en el rural cambia el período»
  // —lo que este módulo hacía— le dice a un rural mensual que con 180 días cumple, cuando BPS le
  // pide 270. Es el mismo modo de falla que publicar los requisitos como alternativas.
  it('los tres requisitos generales se rotulan como de industria y comercio', () => {
    const generales = REQUIREMENTS.filter(r => /180 días en planilla/.test(r.detail))
    expect(generales.length).toBeGreaterThanOrEqual(3)
    for (const r of generales.slice(0, 3)) expect(r.label).toMatch(/industria y comercio/i)
  })

  it('el rural publica sus cantidades, no sólo su período', () => {
    const rural = REQUIREMENTS.find(r => /rural/i.test(r.label))
    expect(rural).toBeTruthy()
    expect(rural?.detail).toMatch(/30 meses/)
    expect(rural?.detail).toMatch(/270 días/)
    expect(rural?.detail).toMatch(/225 jornales/)
    expect(rural?.detail).toMatch(/9 BPC/)
    expect(rural?.detail).toMatch(/61\.776/)
    // 9 BPC son BPC de verdad: las de `URUGUAY.bpc`, no la unidad de los topes.
    expect(9 * URUGUAY.bpc).toBe(61776)
  })

  // El jornalero rural tiene UN requisito, 225 jornales. El cartel de «acumulativos» de industria
  // y comercio no le aplica tal cual, y decirlo sin la salvedad es publicar un requisito de más.
  it('avisa que al jornalero rural no se le exigen días en planilla', () => {
    const rural = REQUIREMENTS.find(r => /rural/i.test(r.label))
    expect(rural?.detail).toMatch(/sin exigencia de días/i)
  })

  it('el servicio doméstico publica las tres variantes, no sólo la de las mensuales', () => {
    const dom = REQUIREMENTS.find(r => /doméstico/i.test(r.label))
    expect(dom).toBeTruthy()
    expect(dom?.detail).toMatch(/180 días/)
    expect(dom?.detail).toMatch(/150 jornales/)
    expect(dom?.detail).toMatch(/6 BPC/)
    expect(dom?.detail).toMatch(/360 días/)
    expect(dom?.detail).toMatch(/250 jornales/)
    expect(dom?.detail).toMatch(/12 BPC/)
    expect(dom?.detail).toMatch(/82\.368/)
    expect(12 * URUGUAY.bpc).toBe(82368)
  })

  it('la ficha de cobertura del rural y el doméstico tampoco se queda en el período', () => {
    const c = COVERAGE_RULES.find(r => /Rural y servicio doméstico/i.test(r.label))
    expect(c?.detail).toMatch(/270 días/)
    expect(c?.detail).toMatch(/225 jornales/)
    expect(c?.detail).toMatch(/9 BPC/)
    expect(c?.detail).toMatch(/250 jornales|12 BPC/)
  })

  // La bajada de la página decía «en los 12 meses anteriores, salvo en el rural y el doméstico,
  // que tienen su propio período»: verdadero y engañoso a la vez.
  it('la bajada de la página no reduce el rural a un cambio de período', () => {
    const pageSource = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../pages/seguro-de-paro-uruguay.vue'),
      'utf8'
    )
    const bajada = pageSource.slice(
      pageSource.indexOf('Qué tenés que tener aportado'),
      pageSource.indexOf('v-for="r in REQUIREMENTS"')
    )
    // `\s+`, no un espacio: prettier reflows el texto del template y parte las frases.
    expect(bajada).toMatch(/270\s+días/)
    expect(bajada).toMatch(/225\s+jornales/)
    expect(bajada).not.toMatch(/que\s+tienen\s+su\s+propio\s+período/)
  })

  // Art. 6.4: «al menos doce meses, SEIS DE ELLOS DE APORTACIÓN EFECTIVA».
  it('para volver a cobrarlo hacen falta 12 meses con 6 de aportación efectiva', () => {
    expect(REPEAT_AFTER_MONTHS).toBe(12)
    expect(REPEAT_CONTRIBUTION_MONTHS).toBe(6)
    const faq = UNEMPLOYMENT_FAQ.find(f => /volver a cobrarlo/i.test(f.question))
    expect(faq?.answer).toMatch(/aportación efectiva/)
    expect(faq?.answer).toMatch(/6\.4/)
  })
})

// La causal es lo primero que mira BPS y lo último que pregunta el trabajador. Estos tests
// existen para que nadie "simplifique" la lista dejando la renuncia como caso ambiguo.
describe('cómo terminó el vínculo', () => {
  it('la renuncia y el arreglo con la empresa NO dan derecho', () => {
    const renuncia = EXIT_RULES.find(r => /Renunciaste/.test(r.situation))
    const arreglo = EXIT_RULES.find(r => /Arreglaste la salida/.test(r.situation))
    expect(renuncia?.gives).toBe(false)
    expect(arreglo?.gives).toBe(false)
  })

  it('el despido y el fin de contrato sí dan derecho', () => {
    expect(EXIT_RULES.filter(r => r.gives).length).toBeGreaterThanOrEqual(2)
    expect(EXIT_RULES.find(r => r.situation.endsWith('Te despidieron'))?.gives).toBe(true)
  })

  it('la salida acordada explica que cobrar la indemnización no la convierte en despido', () => {
    const arreglo = EXIT_RULES.find(r => /Arreglaste la salida/.test(r.situation))
    expect(arreglo?.detail).toMatch(/indemnización/)
    expect(arreglo?.detail).toMatch(/acuerdo de voluntades/)
  })

  // La R.D. 18-16/2005 no es una regla nacional: su numeral 2º proyecta los criterios «a todas las
  // situaciones semejantes que se produzcan en la empresa» del expediente. La regla general es el
  // artículo 2, y el orden del argumento tiene que reflejarlo.
  it('la regla del arreglo es el artículo 2, y la R.D. va como precedente acotado', () => {
    const arreglo = EXIT_RULES.find(r => /Arreglaste la salida/.test(r.situation))
    expect(arreglo?.detail).toMatch(/artículo 2/)
    expect(arreglo?.detail).toMatch(/precedente/i)
    expect(arreglo?.detail).toMatch(/en la empresa/)
    expect(arreglo?.detail).toMatch(/no rige para todo el país/)
    expect(arreglo?.detail).toMatch(/numeral 2/)
    const faq = UNEMPLOYMENT_FAQ.find(f => /arreglar con la empresa/i.test(f.question))
    expect(faq?.answer).toMatch(/R\.D\. 18-16\/2005/)
    expect(faq?.answer).toMatch(/no a todo el país/)
  })

  it('el despido disciplinario aclara que se prueba en el expediente', () => {
    const disciplinario = EXIT_RULES.find(r => /disciplinarias/.test(r.situation))
    expect(disciplinario?.gives).toBe(false)
    expect(disciplinario?.detail).toMatch(/expediente/)
  })

  it('para discutir la causal se pide sentencia o acta de conciliación, nada más', () => {
    expect(CAUSAL_DISPUTE_PROOF).toHaveLength(2)
    expect(CAUSAL_DISPUTE_PROOF.join(' ')).toMatch(/Sentencia/)
    expect(CAUSAL_DISPUTE_PROOF.join(' ')).toMatch(/conciliación/)
  })
})

// El artículo 8 tiene excepciones expresas que la versión anterior borraba. Publicarlo pelado le
// decía a un suspendido, o a un despedido en su primer mes, que perdía el subsidio por cosas que
// no lo cortan.
describe('qué corta el subsidio, con las condiciones del artículo 8', () => {
  const texto = TERMINATION_CAUSES.join(' ')

  it('el reintegro excluye expresamente la continuación en régimen reducido', () => {
    expect(texto).toMatch(/régimen reducido/)
    expect(texto).toMatch(/literal C\) del artículo 5/)
  })

  it('menciona el multiempleo de BPS, donde se mantiene el subsidio', () => {
    expect(texto).toMatch(/multiempleo/i)
    expect(texto).toMatch(/industria y comercio, rural, doméstica o construcción/)
  })

  it('el literal D) va con sus tres condiciones, no suelto', () => {
    const capacitacion = TERMINATION_CAUSES.find(c => /capacitación/i.test(c))
    expect(capacitacion).toBeTruthy()
    expect(capacitacion).toMatch(/hipótesis de despido/)
    expect(capacitacion).toMatch(/mitad de los períodos/)
    expect(capacitacion).toMatch(/Ministerio de Trabajo y Seguridad Social/)
    expect(capacitacion).toMatch(/injustificada/)
  })

  it('el FAQ de trabajar durante el subsidio no lo publica como un no absoluto', () => {
    const f = UNEMPLOYMENT_FAQ.find(x => /puedo trabajar/i.test(x.question))
    expect(f?.answer).toMatch(/régimen reducido/)
    expect(f?.answer).toMatch(/multiempleo/i)
    expect(f?.short).not.toMatch(/^No:/)
  })
})

describe('a quién ampara', () => {
  it('distingue amparados de excluidos, y hay de los dos', () => {
    expect(COVERAGE_RULES.some(r => r.covered)).toBe(true)
    expect(COVERAGE_RULES.some(r => !r.covered)).toBe(true)
    for (const r of COVERAGE_RULES) expect(r.detail.length).toBeGreaterThan(60)
  })

  it('el contrato a término del Estado entra con sus dos vínculos funcionales', () => {
    const estado = COVERAGE_RULES.find(r => r.covered && /Estado/.test(r.label))
    expect(estado?.detail).toMatch(/61/)
    expect(estado?.detail).toMatch(/94/)
    expect(estado?.detail).toMatch(/24 meses/)
  })

  it('el resto del funcionariado queda fuera de la lista sin afirmar que una norma lo excluya', () => {
    const fuera = COVERAGE_RULES.find(r => !r.covered && /Funcionario/.test(r.label))
    expect(fuera?.detail).toMatch(/no figura|No figura/)
    expect(fuera?.detail).toMatch(/por escrito/)
    expect(fuera?.detail).not.toMatch(/no hay norma que lo incorpore/)
  })

  // BPS lista entre los BENEFICIARIOS a los «titulares de empresas unipersonales con vínculo
  // funcional 60 o 166». La afirmación categórica anterior quedaba desmentida por su propia fuente.
  it('la restricción de titulares de empresa publica su excepción nombrada', () => {
    const titular = COVERAGE_RULES.find(r => !r.covered && /titulares de empresa/i.test(r.label))
    expect(titular?.detail).toMatch(/calidad de tales/)
    expect(titular?.detail).toMatch(/60/)
    expect(titular?.detail).toMatch(/166/)
    expect(titular?.detail).not.toMatch(/no a quien factura por su cuenta/)
  })

  it('la enumeración de colectivos no se queda corta ni se presenta como cerrada', () => {
    const texto = COVERAGE_RULES.map(r => r.detail).join(' ')
    expect(texto).toMatch(/Elbio Fernández/)
    expect(texto).toMatch(/Tacurú/)
    expect(texto).toMatch(/105/)
    expect(texto).toMatch(/106/)
    expect(texto).toMatch(/107/)
    const colectivos = COVERAGE_RULES.find(r => /Colectivos/.test(r.label))
    expect(colectivos?.detail).not.toMatch(/no se deduce/)
    expect(colectivos?.detail).toMatch(/preguntalo en BPS/i)
  })
})

describe('el trámite', () => {
  it('los pasos van numerados y en orden', () => {
    expect(PROCEDURE_STEPS.length).toBeGreaterThanOrEqual(4)
    expect(PROCEDURE_STEPS.map(s => s.n)).toEqual(PROCEDURE_STEPS.map((_, i) => i + 1))
  })

  it('dice quién ingresa la solicitud y qué hacer si la empresa no la ingresa', () => {
    const texto = PROCEDURE_STEPS.map(s => `${s.title} ${s.detail}`).join(' ')
    expect(texto).toMatch(/La empresa/)
    expect(texto).toMatch(/reserv\S* (el|de) derecho/i)
  })

  // El plazo es el dato que más caro sale equivocado: va con las palabras de BPS o no va.
  it('el plazo se publica citado y con su consecuencia', () => {
    const plazo = PROCEDURE_STEPS.find(s => /plazo/i.test(s.title))
    expect(plazo?.detail).toMatch(/30 días corridos/)
    expect(plazo?.detail).toMatch(/fecha de egreso/)
    expect(plazo?.detail).toMatch(/configuración de la causal/)
    expect(plazo?.detail).toMatch(/pérdida del subsidio/)
  })

  it('dice desde cuándo se devenga y cada cuánto se paga', () => {
    const pago = PROCEDURE_STEPS.find(s => /devenga|cobrás/i.test(s.title))
    expect(pago?.detail).toMatch(/día siguiente a la fecha de egreso/)
    expect(pago?.detail).toMatch(/mes vencido/)
  })

  it('la espera para volver a cobrarlo son 12 meses', () => {
    expect(REPEAT_AFTER_MONTHS).toBe(12)
  })
})

// El test que protege la decisión editorial: sobre la unipersonal NO hay fuente que habilite
// "mientras no factures no pasa nada", así que el módulo publica la ausencia. Si alguien la
// reemplaza por una tranquilidad inventada, esto se rompe.
describe('unipersonal durante el subsidio', () => {
  it('no promete que sin facturar no pasa nada', () => {
    const texto = UNIPERSONAL_WHILE_ON_BENEFIT.join(' ').toLowerCase()
    expect(texto).not.toMatch(/no pasa nada/)
    expect(texto).not.toMatch(/podés abrirla tranquilo/)
    expect(texto).not.toMatch(/mientras no factures/)
  })

  it('separa lo que dice la norma de lo que dice la restricción de BPS', () => {
    const texto = UNIPERSONAL_WHILE_ON_BENEFIT.join(' ')
    expect(texto).toMatch(/actividad remunerada/)
    expect(texto).toMatch(/calidad de tales/)
  })

  it('nombra la unipersonal que sí está amparada, para no exagerar la exclusión', () => {
    const texto = UNIPERSONAL_WHILE_ON_BENEFIT.join(' ')
    expect(texto).toMatch(/60 o 166/)
  })

  it('publica explícitamente que el umbral de facturación no consta', () => {
    const texto = UNIPERSONAL_WHILE_ON_BENEFIT.join(' ')
    expect(texto).toMatch(/no publica/)
    expect(texto).toMatch(/no consta/)
  })
})

describe('el FAQ cubre los huecos medidos en Reddit', () => {
  const preguntas = UNEMPLOYMENT_FAQ.map(f => f.question.toLowerCase()).join(' | ')

  it('contesta la renuncia, que antes no aparecía ni una vez', () => {
    expect(preguntas).toMatch(/renuncio/)
  })

  it('contesta si se puede arreglar el despido con la empresa', () => {
    const f = UNEMPLOYMENT_FAQ.find(x => /arreglar con la empresa/i.test(x.question))
    expect(f?.answer).toMatch(/R\.D\. 18-16\/2005/)
  })

  it('contesta quién inicia el trámite y cuándo se cobra', () => {
    const f = UNEMPLOYMENT_FAQ.find(x => /quién inicia el trámite/i.test(x.question))
    expect(f?.answer).toMatch(/mes vencido/)
  })

  it('contesta el caso del suplente o eventual del Estado', () => {
    expect(preguntas).toMatch(/suplente o eventual del estado/)
  })

  it('contesta la unipersonal sin inventar el permiso', () => {
    const f = UNEMPLOYMENT_FAQ.find(x => /unipersonal/i.test(x.question))
    expect(f?.short).toMatch(/no la vamos a inventar/i)
  })

  it('contesta cuánto se cobra por trabajo reducido, con el 50 % y el ejemplo', () => {
    const f = UNEMPLOYMENT_FAQ.find(x => /trabajo reducido/i.test(x.question))
    expect(f?.answer).toMatch(/7\.3/)
    expect(f?.answer).toMatch(/7\.2/)
    expect(f?.answer).toMatch(/\$ 5\.000/)
    expect(f?.answer).toMatch(/25 %/)
  })

  it('contesta que el mínimo es uno solo y por qué no es 1 × la BPC del año', () => {
    const f = UNEMPLOYMENT_FAQ.find(x => /mínimo/i.test(x.question))
    expect(f?.answer).toMatch(/8\.467/)
    expect(f?.answer).toMatch(/7\.7/)
    expect(f?.answer).toMatch(/1 BPC/)
    expect(f?.answer).toMatch(/19\.003/)
    expect(f?.answer).toMatch(/U\.R\./)
    // Ya no se publica que en despido no haya mínimo publicado ni que sean dos importes distintos.
    expect(f?.short).not.toMatch(/En despido el mínimo está en la ley/)
    expect(f?.answer).not.toMatch(/Para el despido no publica ninguno/)
  })
})
