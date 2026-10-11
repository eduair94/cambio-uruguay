// La pensión por sobrevivencia: lo que no puede cambiar sin volver a las fuentes.
//
// Estos tests no verifican que el catálogo "tenga datos": fijan las afirmaciones que la página
// publica y que vienen de una norma o de una tabla oficial concreta. Si una de ellas cambia, el
// test falla y obliga a volver al BPS o a impo.com.uy antes de publicar otra cosa — que es
// exactamente lo que queremos acá, porque el tema tiene DOS regímenes conviviendo y los resúmenes
// de terceros mezclan los plazos de uno con los topes del otro.

import { describe, expect, it } from 'vitest'

import {
  SURVIVOR_DEADLINES,
  SURVIVOR_FAQ,
  SURVIVOR_INCOME_CAPS,
  SURVIVOR_LIFELONG_CASES,
  SURVIVOR_MINIMUM_AMOUNT,
  SURVIVOR_MINIMUM_YEAR,
  SURVIVOR_OTHER_PERIODS,
  SURVIVOR_PREVIOUS_REGIME_END,
  SURVIVOR_REGIME_CUTOFF,
  SURVIVOR_REQUIREMENTS,
  SURVIVOR_SHARES,
  SURVIVOR_SOURCES,
  SURVIVOR_TERMS,
  SURVIVOR_WIDOW_CAPS,
  survivorLatestWidowCap,
  survivorTermForAge,
} from '../../utils/survivorPension'

describe('los tramos de plazo', () => {
  // Decreto 229/023, art. 17: A) 40 o más, vitalicia; B) entre 30 y 39, cinco años; C) menos de
  // 30, dos años. Son tres tramos y no se solapan ni dejan hueco, que es justo lo que el resumen
  // del BPS sí deja al escribir «mayores de 40».
  it('son los tres del decreto, sin huecos ni solapes', () => {
    expect(SURVIVOR_TERMS.map(term => term.years)).toEqual([2, 5, null])
    for (let age = 0; age <= 110; age++) {
      const matches = SURVIVOR_TERMS.filter(
        term => age >= term.fromAge && (term.toAge === null || age <= term.toAge)
      )
      expect(matches, `edad ${age}`).toHaveLength(1)
    }
  })

  // Los 40 justos son el borde que esta página existe para aclarar: el decreto dice «40 o más».
  it('pone los 40 justos en el tramo vitalicio', () => {
    expect(survivorTermForAge(39)?.years).toBe(5)
    expect(survivorTermForAge(40)?.years).toBeNull()
    expect(survivorTermForAge(29)?.years).toBe(2)
    expect(survivorTermForAge(30)?.years).toBe(5)
  })

  it('no adivina el tramo de una edad que no se puede leer', () => {
    expect(survivorTermForAge(-1)).toBeNull()
    expect(survivorTermForAge(30.5)).toBeNull()
    expect(survivorTermForAge(Number.NaN)).toBeNull()
  })

  // El inciso 2.º del mismo artículo, que ninguna tabla de plazos muestra.
  it('conserva los casos de vitalicia que no dependen de la edad', () => {
    expect(SURVIVOR_LIFELONG_CASES).toHaveLength(3)
    expect(SURVIVOR_LIFELONG_CASES.join(' ')).toContain('incapacitada para todo trabajo')
  })
})

describe('los porcentajes del sueldo básico de pensión', () => {
  // Decreto 229/023, art. 25, literales A) y B). Son tres valores y ninguno es "el 100 % de lo
  // que cobraba": ésa es la lectura equivocada que la página corrige.
  it('son 66, 75 y 50', () => {
    expect(SURVIVOR_SHARES.map(share => share.percent)).toEqual([66, 75, 50])
  })

  it('cada uno dice en qué caso se aplica', () => {
    for (const share of SURVIVOR_SHARES) expect(share.when.length).toBeGreaterThan(20)
  })
})

describe('los montos de la tabla del BPS', () => {
  it('fija el mínimo de pensiones por sobrevivencia del año publicado', () => {
    expect(SURVIVOR_MINIMUM_YEAR).toBe(2026)
    expect(SURVIVOR_MINIMUM_AMOUNT).toBe(20_935)
  })

  it('fija los topes de ingresos del régimen nuevo', () => {
    expect(SURVIVOR_INCOME_CAPS.map(cap => cap.amount)).toEqual([20_672, 201_346, 18_574])
  })

  // La serie de la viuda/concubina va POR FECHA DE FALLECIMIENTO, así que los tramos tienen que
  // ser contiguos y el último es el que la página muestra como "el de hoy". Si alguien agrega un
  // tramo nuevo sin ordenarlo, la página publicaría un tope viejo como si fuera el vigente.
  it('la serie por fecha de fallecimiento es contigua y ordenada', () => {
    expect(SURVIVOR_WIDOW_CAPS.length).toBeGreaterThanOrEqual(7)
    for (let i = 1; i < SURVIVOR_WIDOW_CAPS.length; i++) {
      const previous = SURVIVOR_WIDOW_CAPS[i - 1]!
      const current = SURVIVOR_WIDOW_CAPS[i]!
      expect(previous.to < current.from, `${previous.to} → ${current.from}`).toBe(true)
      const dayAfter = new Date(`${previous.to}T00:00:00Z`)
      dayAfter.setUTCDate(dayAfter.getUTCDate() + 1)
      expect(dayAfter.toISOString().slice(0, 10)).toBe(current.from)
    }
    expect(survivorLatestWidowCap().amount).toBe(262_421)
    expect(survivorLatestWidowCap().from).toBe('2026-08-01')
  })

  // Los dos últimos tramos publicados BAJAN respecto del anterior de cada año, y no es un error de
  // transcripción: el tope se recalcula en agosto. Se fija para que nadie lo "corrija" al alza.
  it('acepta que un tramo valga menos que el anterior', () => {
    const amounts = SURVIVOR_WIDOW_CAPS.map(cap => cap.amount)
    expect(amounts.some((amount, i) => i > 0 && amount < amounts[i - 1]!)).toBe(true)
  })
})

describe('el corte entre los dos regímenes', () => {
  // Ley 20.130 (vigente desde el 1/8/2023) y el último día del régimen anterior. El par tiene que
  // ser consecutivo: un hueco de un día dejaría fallecimientos sin régimen declarado.
  it('el régimen anterior termina el día antes de que arranque la Ley 20.130', () => {
    expect(SURVIVOR_REGIME_CUTOFF).toBe('2023-08-01')
    expect(SURVIVOR_PREVIOUS_REGIME_END).toBe('2023-07-31')
    const dayAfter = new Date(`${SURVIVOR_PREVIOUS_REGIME_END}T00:00:00Z`)
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1)
    expect(dayAfter.toISOString().slice(0, 10)).toBe(SURVIVOR_REGIME_CUTOFF)
  })

  it('la serie de topes arranca el mismo día que el régimen nuevo', () => {
    expect(SURVIVOR_WIDOW_CAPS[0]!.from).toBe(SURVIVOR_REGIME_CUTOFF)
  })
})

describe('la trazabilidad', () => {
  it('toda fuente es del BPS o de impo.com.uy, con identificador único', () => {
    const ids = SURVIVOR_SOURCES.map(source => source.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const source of SURVIVOR_SOURCES)
      expect(source.url, source.id).toMatch(/^https:\/\/www\.(bps\.gub\.uy|impo\.com\.uy)\//)
  })

  // Cada condición cita una fuente que existe: una cita colgada se renderiza como un enlace vacío
  // y nadie lo nota mirando la página.
  it('cada requisito apunta a una fuente del listado', () => {
    const ids = new Set(SURVIVOR_SOURCES.map(source => source.id))
    for (const item of SURVIVOR_REQUIREMENTS) expect(ids.has(item.sourceId), item.id).toBe(true)
  })
})

describe('el contenido que la página renderiza', () => {
  it('no repite identificadores en ninguna lista', () => {
    for (const list of [
      SURVIVOR_TERMS,
      SURVIVOR_OTHER_PERIODS,
      SURVIVOR_SHARES,
      SURVIVOR_REQUIREMENTS,
      SURVIVOR_DEADLINES,
      SURVIVOR_FAQ,
    ]) {
      const ids = list.map(item => item.id)
      expect(new Set(ids).size, ids.join(',')).toBe(ids.length)
    }
  })

  // El FAQ va a `FAQPage` en JSON-LD: una respuesta vacía o una pregunta sin signo de interrogación
  // sale publicada tal cual en el resultado de Google.
  it('cada pregunta del FAQ pregunta y cada respuesta contesta', () => {
    expect(SURVIVOR_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const item of SURVIVOR_FAQ) {
      expect(item.question, item.id).toMatch(/\?$/)
      expect(item.answer.length, item.id).toBeGreaterThan(40)
    }
  })

  // La página promete los 180 días de retroactividad y los 4 años que cierran la puerta: son los
  // dos plazos que, si se pierden, no se recuperan.
  it('conserva los dos plazos que no se recuperan', () => {
    const text = SURVIVOR_DEADLINES.map(item => `${item.label} ${item.detail}`).join(' ')
    expect(text).toContain('180 días')
    expect(text).toContain('4 años')
  })
})
