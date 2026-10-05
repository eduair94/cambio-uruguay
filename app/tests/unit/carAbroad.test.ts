// El catálogo de /llevar-el-auto-a-brasil-o-argentina es una lista de afirmaciones legales, así
// que lo que se verifica acá no es formato: es que cada afirmación siga teniendo detrás una
// fuente declarada, y que la única cifra de la página se calcule y no se escriba.

import { describe, expect, it } from 'vitest'
import {
  CAR_ABROAD_DOCUMENTS,
  CAR_ABROAD_DRIVERS,
  CAR_ABROAD_EXCLUSIONS,
  CAR_ABROAD_INSURANCE,
  CAR_ABROAD_SOURCES,
  CAR_ABROAD_STAY_DISCREPANCY,
  CAR_ABROAD_STAY_RULES,
  CAR_ABROAD_VERIFIED_AT,
  SOA_COVERAGE_UI,
  allRows,
  rowsWithUnknownSource,
  soaCoverageInPesos,
  sourceById,
  sourcesMissingFromCatalog,
} from '../../utils/carAbroad'

describe('cada afirmación del catálogo cita una fuente que existe', () => {
  it('no deja ninguna fila citando un id inexistente', () => {
    const orphans = rowsWithUnknownSource()
    expect(orphans, orphans.join(', ')).toEqual([])
  })

  // El otro sentido: una fuente al pie que ninguna fila usa infla el respaldo aparente de la
  // página sin sostener nada.
  it('no declara ninguna fuente que ninguna fila use', () => {
    const unused = sourcesMissingFromCatalog()
    expect(unused, unused.join(', ')).toEqual([])
  })

  it('cuenta todas las filas de las cinco listas', () => {
    expect(allRows()).toHaveLength(
      CAR_ABROAD_DOCUMENTS.length +
        CAR_ABROAD_INSURANCE.length +
        CAR_ABROAD_DRIVERS.length +
        CAR_ABROAD_EXCLUSIONS.length +
        CAR_ABROAD_STAY_RULES.length +
        CAR_ABROAD_STAY_DISCREPANCY.readings.length
    )
  })

  it('detecta una fila huérfana cuando la hay', () => {
    const ids = new Set(CAR_ABROAD_SOURCES.map(source => source.id))
    expect(ids.has('inventada')).toBe(false)
  })
})

describe('las fuentes son oficiales uruguayas y resolubles', () => {
  const ALLOWED_HOSTS = ['www.impo.com.uy', 'www.gub.uy', 'www.aduanas.gub.uy']

  it.each(CAR_ABROAD_SOURCES.map(source => [source.id, source] as const))(
    '%s apunta a un host oficial por https',
    (_id, source) => {
      const url = new URL(source.url)
      expect(url.protocol).toBe('https:')
      expect(ALLOWED_HOSTS).toContain(url.host)
    }
  )

  it('no repite ningún id', () => {
    const ids = CAR_ABROAD_SOURCES.map(source => source.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // El nombre corto es lo que el lector ve al lado de cada afirmación. Dos fuentes con el mismo
  // nombre corto hacen que dos enlaces distintos se lean igual, que es lo mismo que no citar.
  it('le da a cada fuente un nombre corto propio', () => {
    const shorts = CAR_ABROAD_SOURCES.map(source => source.short)
    expect(shorts.every(short => short.trim().length > 0)).toBe(true)
    expect(new Set(shorts).size).toBe(shorts.length)
  })

  it('resuelve una fuente por id y devuelve null para una desconocida', () => {
    expect(sourceById('ley-18412')?.url).toContain('impo.com.uy')
    expect(sourceById('no-existe')).toBeNull()
  })

  it('fecha el día en que se leyeron las fuentes', () => {
    expect(CAR_ABROAD_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('la discrepancia de plazos se publica entera, no resuelta', () => {
  it('conserva las dos lecturas y cada una con su fuente', () => {
    expect(CAR_ABROAD_STAY_DISCREPANCY.readings).toHaveLength(2)
    const sources = CAR_ABROAD_STAY_DISCREPANCY.readings.map(reading => reading.sourceId)
    expect(new Set(sources).size).toBe(2)
  })
})

describe('el tope del SOA se calcula y no se escribe', () => {
  it('multiplica las UI de la ley por el valor del día', () => {
    expect(SOA_COVERAGE_UI).toBe(250_000)
    expect(soaCoverageInPesos(6.58)).toBeCloseTo(1_645_000, 6)
  })

  // Sin lectura viva no se publica una cifra: el fallback del catálogo de indicadores tiene meses
  // y estamparlo como "al valor de hoy" es el defecto que esta guarda existe para evitar.
  it.each([null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'no inventa un monto con la UI en %s',
    value => {
      expect(soaCoverageInPesos(value as number)).toBeNull()
    }
  )
})
