// Lo que se testea acá son las dos cosas que la página no puede permitirse tener mal: el desglose
// de quién paga cuántos días (porque el total y el detalle se muestran juntos y una fila desalineada
// contradice a la otra a la vista) y la aritmética del calendario maternal, que produce fechas
// concretas a partir de la fecha presunta de parto.

import { describe, expect, it } from 'vitest'

import {
  LICENCIA_PARENTAL_CASOS,
  LICENCIA_PARENTAL_FAQ,
  LICENCIA_PARENTAL_SOURCES,
  MATERNIDAD_DIAS_POSPARTO,
  MATERNIDAD_DIAS_PREPARTO,
  MATERNIDAD_DIAS_TOTAL,
  MEDIO_HORARIO_HASTA_MESES,
  PATERNIDAD_DESGLOSE,
  PATERNIDAD_DIAS_EMPRESA,
  PATERNIDAD_DIAS_TOTAL,
  calendarioMaternidad,
  diasDePaternidad,
} from '../../utils/licenciaParental'

/** Días entre dos `yyyy-mm-dd`, ambos extremos incluidos. */
function spanInclusive(fromISO: string, toISO: string): number {
  const from = Date.parse(`${fromISO}T00:00:00Z`)
  const to = Date.parse(`${toISO}T00:00:00Z`)
  return Math.round((to - from) / 86_400_000) + 1
}

describe('los días de la licencia coinciden con lo que publica BPS', () => {
  it('la licencia maternal son 98 días, 42 de preparto y 56 de posparto', () => {
    expect(MATERNIDAD_DIAS_PREPARTO).toBe(42)
    expect(MATERNIDAD_DIAS_POSPARTO).toBe(56)
    expect(MATERNIDAD_DIAS_TOTAL).toBe(98)
    // 98 días son exactamente las catorce semanas del art. 2 de la Ley 19.161.
    expect(MATERNIDAD_DIAS_TOTAL / 7).toBe(14)
  })

  it('la licencia por paternidad son 20 días continuos desde el 1.º de enero de 2026', () => {
    expect(PATERNIDAD_DIAS_TOTAL).toBe(20)
  })
})

describe('diasDePaternidad reparte los mismos 20 días', () => {
  it('al dependiente le pone 3 días la empresa y 17 el BPS', () => {
    const d = diasDePaternidad('dependiente')
    expect(d.empresa).toBe(PATERNIDAD_DIAS_EMPRESA)
    expect(d.bps).toBe(17)
    expect(d.total).toBe(20)
  })

  it('al no dependiente se los paga todos el BPS, porque no hay empleador', () => {
    const d = diasDePaternidad('no-dependiente')
    expect(d.empresa).toBe(0)
    expect(d.bps).toBe(20)
    expect(d.total).toBe(20)
  })

  // La invariante que justifica que esto sea una función y no una tabla escrita a mano: el total
  // que muestra la página es la suma de las dos columnas que muestra al lado.
  it('empresa + BPS siempre da el total, y el total no cambia según quién sea', () => {
    for (const fila of PATERNIDAD_DESGLOSE) {
      expect(fila.empresa + fila.bps).toBe(fila.total)
      expect(fila.total).toBe(PATERNIDAD_DIAS_TOTAL)
    }
    expect(PATERNIDAD_DESGLOSE).toHaveLength(2)
  })
})

describe('calendarioMaternidad', () => {
  it('arranca 42 días antes de la fecha presunta', () => {
    const cal = calendarioMaternidad('2026-10-01')
    expect(cal?.inicioPreparto).toBe('2026-08-20')
    expect(spanInclusive(cal!.inicioPreparto, '2026-09-30')).toBe(42)
  })

  it('el tramo completo mide exactamente los 98 días de BPS', () => {
    for (const fecha of ['2026-01-15', '2026-10-01', '2027-03-31', '2028-02-29']) {
      const cal = calendarioMaternidad(fecha)
      expect(spanInclusive(cal!.inicioPreparto, cal!.finPosparto)).toBe(MATERNIDAD_DIAS_TOTAL)
    }
  })

  it('cruza fin de año y años bisiestos sin desviarse', () => {
    // 2028 es bisiesto: el preparto de un parto previsto para el 1 de marzo tiene que pasar por el 29.
    const cal = calendarioMaternidad('2028-03-01')
    expect(cal?.inicioPreparto).toBe('2028-01-19')
    expect(spanInclusive('2028-01-19', '2028-02-29')).toBe(42)
  })

  it('cierra el medio horario a los 6 meses del bebé, recortando al último día del mes', () => {
    expect(calendarioMaternidad('2026-10-15')?.finMedioHorario).toBe('2027-04-15')
    // 31 de agosto + 6 meses no es el 3 de marzo: es el último día de febrero.
    expect(calendarioMaternidad('2026-08-31')?.finMedioHorario).toBe('2027-02-28')
    expect(MEDIO_HORARIO_HASTA_MESES).toBe(6)
  })

  it('rechaza fechas que no existen en vez de correrlas en silencio', () => {
    expect(calendarioMaternidad('2026-02-30')).toBeNull()
    expect(calendarioMaternidad('2026-13-01')).toBeNull()
    expect(calendarioMaternidad('15/10/2026')).toBeNull()
    expect(calendarioMaternidad('')).toBeNull()
  })
})

describe('el contenido publicado se sostiene en fuentes', () => {
  it('todas las fuentes son oficiales uruguayas y en https', () => {
    expect(LICENCIA_PARENTAL_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const s of LICENCIA_PARENTAL_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/(www\.)?(impo\.com\.uy|bps\.gub\.uy|gub\.uy)\//)
      expect(s.label.length).toBeGreaterThan(40)
    }
  })

  it('cada pregunta frecuente tiene resumen y respuesta propios', () => {
    const questions = new Set(LICENCIA_PARENTAL_FAQ.map(f => f.question))
    expect(questions.size).toBe(LICENCIA_PARENTAL_FAQ.length)
    for (const f of LICENCIA_PARENTAL_FAQ) {
      expect(f.short.length).toBeGreaterThan(10)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })

  it('los casos especiales están todos atribuidos', () => {
    for (const c of LICENCIA_PARENTAL_CASOS) expect(c.source.length).toBeGreaterThan(5)
  })
})
