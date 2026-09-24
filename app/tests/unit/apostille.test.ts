// La aritmética de `/apostillar-un-documento-uruguay`.
//
// Lo que estos tests defienden no es la suma —sumar dos números no se rompe— sino
// la REGLA que hace que la suma signifique algo: un total al que le falta un
// arancel tiene que decirlo. La IGRN no publica el suyo, y un total silencioso
// publicaría que apostillar un poder sale $777, que es menos de lo que sale. Es la
// misma lección que la canasta emparejada de PRECIOS.md: un total baja por
// faltarle ítems, así que o viene con lo que le falta o no vale.

import { describe, expect, it } from 'vitest'

import {
  APOSTILLE_FEES,
  APOSTILLE_PRE_STEPS,
  APOSTILLE_SOURCES,
  feeFor,
  pesosForUr,
  preStepFor,
  stepCostPesos,
  totalFor,
} from '../../utils/apostille'

describe('los aranceles del MRREE', () => {
  it('publica los dos trámites con el importe de su ficha', () => {
    expect(feeFor('apostilla')?.pesos).toBe(777)
    expect(feeFor('legalizacion')?.pesos).toBe(379)
  })

  it('no tiene dos entradas para el mismo trámite', () => {
    const keys = APOSTILLE_FEES.map(fee => fee.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('pesosForUr', () => {
  it('convierte con el valor del día y redondea a peso entero', () => {
    expect(pesosForUr(1, 1748.51)).toBe(1749)
    expect(pesosForUr(2, 1500)).toBe(3000)
  })

  it('devuelve null antes que inventar una conversión', () => {
    // Sin valor de UR la página muestra «1 UR» y no un peso fabricado.
    expect(pesosForUr(1, null)).toBeNull()
    expect(pesosForUr(1, undefined)).toBeNull()
    expect(pesosForUr(1, 0)).toBeNull()
    expect(pesosForUr(1, -5)).toBeNull()
    expect(pesosForUr(1, Number.NaN)).toBeNull()
    expect(pesosForUr(0, 1500)).toBeNull()
  })
})

describe('stepCostPesos', () => {
  it('un paso sin organismo intermedio cuesta cero, no «desconocido»', () => {
    // La diferencia importa: cero se suma, null marca el total como parcial.
    expect(stepCostPesos({ kind: 'none' }, 1500)).toBe(0)
  })

  it('un arancel en pesos se toma tal cual', () => {
    expect(stepCostPesos({ kind: 'pesos', pesos: 269 }, null)).toBe(269)
  })

  it('un arancel en UR necesita el valor del día', () => {
    expect(stepCostPesos({ kind: 'ur', ur: 1 }, 1748.51)).toBe(1749)
    expect(stepCostPesos({ kind: 'ur', ur: 1 }, null)).toBeNull()
  })

  it('un arancel que el organismo no publica nunca vale cero', () => {
    expect(stepCostPesos({ kind: 'unpublished', why: 'no hay ficha' }, 1500)).toBeNull()
  })
})

describe('totalFor', () => {
  const urValue = 1748.51

  it('suma el paso previo del MEC y no marca nada como faltante', () => {
    const total = totalFor(preStepFor('estudio')!, 'apostilla', urValue)
    expect(total).toEqual({ total: 777 + 269, partial: false, missing: [] })
  })

  it('convierte el paso del MSP con la UR de hoy', () => {
    const total = totalFor(preStepFor('salud')!, 'apostilla', urValue)
    expect(total.total).toBe(777 + 1749)
    expect(total.partial).toBe(false)
  })

  it('sin valor de UR el total del MSP queda parcial y dice por qué', () => {
    const total = totalFor(preStepFor('salud')!, 'apostilla', null)
    expect(total.total).toBe(777)
    expect(total.partial).toBe(true)
    expect(total.missing.join(' ')).toContain('1 UR')
  })

  // El caso que motiva el módulo entero.
  it('el paso de la IGRN deja el total en un piso declarado, nunca en $777 a secas', () => {
    const total = totalFor(preStepFor('notarial')!, 'apostilla', urValue)
    expect(total.total).toBe(777)
    expect(total.partial).toBe(true)
    expect(total.missing).toHaveLength(1)
    expect(total.missing[0]).toContain('IGRN')
    expect(total.missing[0]).toContain('no publica su arancel')
  })

  it('un documento que va directo al MRREE sale exactamente el arancel', () => {
    const total = totalFor(preStepFor('caj')!, 'apostilla', urValue)
    expect(total).toEqual({ total: 777, partial: false, missing: [] })
  })

  it('la legalización usa su propio arancel, no el de la apostilla', () => {
    expect(totalFor(preStepFor('otro')!, 'legalizacion', urValue).total).toBe(379)
  })

  it('un trámite desconocido no se redondea a gratis', () => {
    const total = totalFor(preStepFor('otro')!, 'inventado' as unknown as 'apostilla', urValue)
    expect(total.total).toBe(0)
    expect(total.partial).toBe(true)
  })
})

describe('el catálogo de pasos previos', () => {
  it('no repite claves', () => {
    const keys = APOSTILLE_PRE_STEPS.map(step => step.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('todo importe publicado viene con la URL de la ficha de la que salió', () => {
    // La regla de oro del sitio: ninguna cifra sin fuente que la sostenga.
    for (const step of APOSTILLE_PRE_STEPS) {
      if (step.cost.kind === 'pesos' || step.cost.kind === 'ur') {
        expect(step.sourceUrl, `${step.key} publica un importe sin fuente`).toBeTruthy()
      }
    }
  })

  it('un paso con organismo intermedio no puede costar cero por descuido', () => {
    // `none` significa «no hay organismo previo». Si hay uno, su costo es un
    // importe o un `unpublished` explícito, nunca un cero silencioso.
    for (const step of APOSTILLE_PRE_STEPS) {
      if (step.organismo) expect(step.cost.kind, step.key).not.toBe('none')
    }
  })
})

describe('las fuentes', () => {
  it('son todas oficiales y por HTTPS', () => {
    const allowed = /^https:\/\/(www\.gub\.uy|www\.poderjudicial\.gub\.uy|www\.hcch\.net)\//
    for (const source of APOSTILLE_SOURCES) {
      expect(source.url, source.url).toMatch(allowed)
      expect(source.label.length).toBeGreaterThan(20)
    }
  })
})
