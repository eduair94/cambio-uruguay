// La regla de corrimiento de feriados (Ley 16.805, art. 1) es la única aritmética que
// /feriados-que-se-corren-uruguay publica, y es aritmética sobre una norma: si se equivoca, la
// página afirma que un feriado cae un día que no cae. Por eso se prueba contra el texto legal caso
// por caso —los siete días de la semana— y no sólo contra un par de años de ejemplo.

import { describe, expect, it } from 'vitest'

import {
  FERIADOS_FIJOS,
  FERIADOS_MOVILES,
  FERIADOS_PAGOS,
  FERIADOS_SOURCES,
  corrimientoDe,
  feriadosMovilesDe,
  observarFeriado,
} from '../../utils/feriados'

describe('el artículo 1 de la Ley 16.805, día por día', () => {
  // «si coincidieran el sábado, domingo o lunes, se observarán esos días»
  it.each([
    ['sábado', 6],
    ['domingo', 0],
    ['lunes', 1],
  ])('un feriado en %s se observa ese mismo día', (_label, weekday) => {
    expect(corrimientoDe(weekday)).toBe('mismo-dia')
  })

  // «si ocurrieran en martes o miércoles, se observarán el lunes inmediato anterior»
  it.each([
    ['martes', 2],
    ['miércoles', 3],
  ])('un feriado en %s se observa el lunes anterior', (_label, weekday) => {
    expect(corrimientoDe(weekday)).toBe('lunes-anterior')
  })

  // «si ocurrieren en jueves o viernes, se observarán el lunes inmediato siguiente»
  it.each([
    ['jueves', 4],
    ['viernes', 5],
  ])('un feriado en %s se observa el lunes siguiente', (_label, weekday) => {
    expect(corrimientoDe(weekday)).toBe('lunes-siguiente')
  })

  it('rechaza un día de la semana que no existe', () => {
    expect(() => corrimientoDe(7)).toThrow(RangeError)
    expect(() => corrimientoDe(-1)).toThrow(RangeError)
  })
})

describe('la fecha observada', () => {
  it('siempre cae en lunes cuando el feriado se corre', () => {
    // Barrido de un año entero: toda fecha que se corra tiene que aterrizar en lunes, nunca en otro
    // día. Es la invariante que hace de red contra un signo dado vuelta en el offset.
    for (let day = 1; day <= 366; day++) {
      const d = new Date(Date.UTC(2027, 0, day))
      if (d.getUTCFullYear() !== 2027) break
      const obs = observarFeriado(2027, d.getUTCMonth() + 1, d.getUTCDate())
      if (obs.seCorre) expect(new Date(`${obs.observado}T00:00:00Z`).getUTCDay()).toBe(1)
    }
  })

  it('se corre como máximo tres días para atrás o cuatro para adelante', () => {
    // Miércoles → −2 y jueves → +4 son los extremos que permite la regla; cualquier cosa más lejos
    // sería un lunes de otra semana.
    for (let day = 1; day <= 28; day++) {
      const obs = observarFeriado(2027, 2, day)
      const delta =
        (Date.parse(`${obs.observado}T00:00:00Z`) - Date.parse(`${obs.fecha}T00:00:00Z`)) /
        86_400_000
      expect(delta).toBeGreaterThanOrEqual(-2)
      expect(delta).toBeLessThanOrEqual(4)
    }
  })

  it('cruza el fin de mes cuando hace falta', () => {
    // 30 de setiembre de 2027 es jueves: el lunes siguiente es el 4 de octubre, en el mes que viene.
    const obs = observarFeriado(2027, 9, 30)
    expect(obs.diaOriginal).toBe(4)
    expect(obs.observado).toBe('2027-10-04')
  })

  it('cruza el fin de año cuando hace falta', () => {
    // 31 de diciembre de 2026 es jueves: se observaría el lunes 4 de enero de 2027.
    const obs = observarFeriado(2026, 12, 31)
    expect(obs.observado).toBe('2027-01-04')
  })
})

describe('los tres feriados móviles, resueltos por año', () => {
  it('en 2026 ninguno de los tres se corre', () => {
    // 19/4/2026 domingo, 18/5/2026 lunes y 12/10/2026 lunes: los tres caen en días que el artículo 1
    // manda observar tal cual.
    const filas = feriadosMovilesDe(2026)
    expect(filas.map(f => f.observado)).toEqual(['2026-04-19', '2026-05-18', '2026-10-12'])
    expect(filas.every(f => !f.seCorre)).toBe(true)
  })

  it('en 2027 se corren el 18 de mayo y el 12 de octubre, pero no el 19 de abril', () => {
    // 19/4/2027 es lunes (queda), 18/5/2027 es martes (→ lunes 17) y 12/10/2027 es martes (→ 11).
    const filas = feriadosMovilesDe(2027)
    expect(filas.map(f => [f.key, f.observado, f.seCorre])).toEqual([
      ['desembarco', '2027-04-19', false],
      ['las-piedras', '2027-05-17', true],
      ['doce-octubre', '2027-10-11', true],
    ])
  })

  it('conserva la fecha que declara la ley junto a la observada', () => {
    const [, lasPiedras] = feriadosMovilesDe(2027)
    expect(lasPiedras.fecha).toBe('2027-05-18')
    expect(lasPiedras.mes).toBe(5)
    expect(lasPiedras.dia).toBe(18)
  })
})

describe('los catálogos coinciden con las normas citadas', () => {
  it('tiene exactamente los tres feriados que la Ley 16.805 no exceptúa', () => {
    expect(FERIADOS_MOVILES.map(f => `${f.dia}/${f.mes}`)).toEqual(['19/4', '18/5', '12/10'])
  })

  it('tiene las diez entradas del artículo 2, y ninguna repetida con las móviles', () => {
    expect(FERIADOS_FIJOS).toHaveLength(10)
    const moviles = new Set(FERIADOS_MOVILES.map(f => `${f.dia}/${f.mes}`))
    for (const fijo of FERIADOS_FIJOS) {
      if (fijo.mes !== null) expect(moviles.has(`${fijo.dia}/${fijo.mes}`)).toBe(false)
    }
  })

  it('marca como pagos sólo los cinco del art. 18 de la Ley 12.590', () => {
    expect(FERIADOS_PAGOS.map(f => f.cuando)).toEqual([
      '1.º de enero',
      '1.º de mayo',
      '18 de julio',
      '25 de agosto',
      '25 de diciembre',
    ])
  })

  it('deja Carnaval y Semana de Turismo sin fecha de calendario', () => {
    // Dependen de la Pascua: darles un día fijo sería inventarlo.
    const sinFecha = FERIADOS_FIJOS.filter(f => f.mes === null)
    expect(sinFecha.map(f => f.key)).toEqual(['carnaval', 'turismo'])
    expect(sinFecha.every(f => f.dia === null)).toBe(true)
  })

  it('cita sólo fuentes oficiales uruguayas', () => {
    expect(FERIADOS_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const source of FERIADOS_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.)?(impo\.com\.uy|gub\.uy)\//)
      expect(source.label.length).toBeGreaterThan(20)
    }
  })
})
