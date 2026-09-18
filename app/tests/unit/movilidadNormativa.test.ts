// The point of this suite is that the normativa table never says more than the source does: a
// `vigente` row always carries a source, a `sin-norma-encontrada` row never carries a rule, San
// José never gets an entry-into-force date nobody published, and the page never slips into a
// verdict ("es ilegal" / "está prohibido usar" as a blanket statement).

import { describe, expect, it } from 'vitest'

import {
  MOVILIDAD_NORMATIVA,
  MOVILIDAD_NORMATIVA_NOTA_NACIONAL,
  MOVILIDAD_NORMATIVA_REVISADA,
  movilidadNormativaDe,
  movilidadResumenNormativa,
} from '../../utils/movilidadNormativa'

describe('MOVILIDAD_NORMATIVA — forma de la tabla', () => {
  it('tiene exactamente los 19 departamentos, sin repetidos', () => {
    expect(MOVILIDAD_NORMATIVA).toHaveLength(19)
    const names = MOVILIDAD_NORMATIVA.map(d => d.departamento)
    expect(new Set(names).size).toBe(19)
  })

  it('incluye los 19 nombres canónicos, con sus tildes', () => {
    const names = MOVILIDAD_NORMATIVA.map(d => d.departamento)
    expect(names).toEqual([
      'Artigas',
      'Canelones',
      'Cerro Largo',
      'Colonia',
      'Durazno',
      'Flores',
      'Florida',
      'Lavalleja',
      'Maldonado',
      'Montevideo',
      'Paysandú',
      'Río Negro',
      'Rivera',
      'Rocha',
      'Salto',
      'San José',
      'Soriano',
      'Tacuarembó',
      'Treinta y Tres',
    ])
  })

  it('sólo usa los tres estados documentados', () => {
    for (const fila of MOVILIDAD_NORMATIVA) {
      expect(['vigente', 'en-estudio', 'sin-norma-encontrada']).toContain(fila.estado)
    }
  })

  it('fecha de revisión fijada y consistente con el resumen', () => {
    expect(MOVILIDAD_NORMATIVA_REVISADA).toBe('2026-09-17')
    expect(movilidadResumenNormativa().revisado).toBe(MOVILIDAD_NORMATIVA_REVISADA)
  })
})

describe('ninguna fila vigente sin fuente', () => {
  it('toda fila "vigente" trae al menos una fuente con título, URL y fecha', () => {
    const vigentes = MOVILIDAD_NORMATIVA.filter(d => d.estado === 'vigente')
    expect(vigentes.length).toBeGreaterThan(0)
    for (const fila of vigentes) {
      expect(fila.fuentes.length).toBeGreaterThan(0)
      expect(fila.norma).toBeTruthy()
      for (const fuente of fila.fuentes) {
        expect(fuente.titulo.length).toBeGreaterThan(0)
        expect(fuente.url.length).toBeGreaterThan(0)
        expect(fuente.fecha.length).toBeGreaterThan(0)
      }
    }
  })

  it('Montevideo y San José son las únicas filas vigentes', () => {
    const vigentes = MOVILIDAD_NORMATIVA.filter(d => d.estado === 'vigente').map(
      d => d.departamento
    )
    expect(vigentes.sort()).toEqual(['Montevideo', 'San José'])
  })
})

describe('ninguna regla no nula en una fila sin-norma-encontrada', () => {
  it('reglas todas en null y sin norma citada', () => {
    const sinNorma = MOVILIDAD_NORMATIVA.filter(d => d.estado === 'sin-norma-encontrada')
    // Los 19 menos Montevideo, San José, Durazno, Maldonado y Canelones.
    expect(sinNorma).toHaveLength(14)
    for (const fila of sinNorma) {
      expect(fila.norma).toBeNull()
      expect(Object.values(fila.reglas).every(value => value === null)).toBe(true)
    }
  })

  it('en-estudio tampoco declara reglas: no hay decreto de dónde sacarlas', () => {
    const enEstudio = MOVILIDAD_NORMATIVA.filter(d => d.estado === 'en-estudio')
    expect(enEstudio.map(d => d.departamento).sort()).toEqual(['Canelones', 'Durazno', 'Maldonado'])
    for (const fila of enEstudio) {
      expect(fila.norma).toBeNull()
      expect(Object.values(fila.reglas).every(value => value === null)).toBe(true)
      // Pero sí llevan la fuente de prensa que registra que está a estudio.
      expect(fila.fuentes.length).toBeGreaterThan(0)
    }
  })
})

describe('San José — sin fecha de vigencia', () => {
  it('no afirma una fecha de inicio de vigencia en ningún campo (sólo las fechas de fuente)', () => {
    const sanJose = movilidadNormativaDe('San José')
    expect(sanJose).not.toBeNull()
    // Las únicas fechas ISO permitidas son las de `fuentes[].fecha` (cuándo se leyó/publicó la
    // nota), nunca una fecha en `norma` o `nota` presentada como el día en que el decreto empieza
    // a regir.
    expect(sanJose?.norma ?? '').not.toMatch(/\d{4}-\d{2}-\d{2}/)
    const nota = sanJose?.nota ?? ''
    expect(nota).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(nota).not.toMatch(/rige desde/i)
    expect(nota).not.toMatch(/vigente desde/i)
    expect(nota).not.toMatch(/entra en vigen/i)
    expect(nota).not.toMatch(/entró en vigen/i)
  })

  it('sí registra que la fecha de vigencia no está confirmada', () => {
    const sanJose = movilidadNormativaDe('San José')
    expect(sanJose?.nota ?? '').toMatch(/no está confirmada/i)
  })

  // La revisión final de la rama marcó que el matiz vivía SÓLO en la nota: quien barre los badges
  // lee "Vigente" a secas como "rige hoy". El matiz es un dato de la fila (`estadoDetalle`), que el
  // componente pega al badge, y no una condición escrita sobre el nombre del departamento.
  it('el matiz del badge es un dato de la fila, y sólo San José lo lleva', () => {
    expect(movilidadNormativaDe('San José')?.estadoDetalle).toMatch(/sin confirmar/i)
    const conDetalle = MOVILIDAD_NORMATIVA.filter(fila => fila.estadoDetalle != null)
    expect(conDetalle.map(fila => fila.departamento)).toEqual(['San José'])
  })
})

describe('sin veredictos genéricos', () => {
  it('ningún texto dice "es ilegal" o "está prohibido usar" de forma general', () => {
    const haystack = JSON.stringify(MOVILIDAD_NORMATIVA).toLowerCase()
    expect(haystack).not.toContain('es ilegal')
    expect(haystack).not.toContain('está prohibido usar')
    expect(haystack).not.toContain('esta prohibido usar')
    expect(haystack).not.toContain('ilegal')
  })

  it('la nota nacional tampoco es un veredicto ni una regla por departamento', () => {
    expect(MOVILIDAD_NORMATIVA_NOTA_NACIONAL.toLowerCase()).not.toContain('ilegal')
    expect(MOVILIDAD_NORMATIVA_NOTA_NACIONAL.length).toBeGreaterThan(0)
  })
})

describe('fuentes: URLs https y únicas', () => {
  it('cada URL citada es https y no se repite entre filas', () => {
    const urls = MOVILIDAD_NORMATIVA.flatMap(d => d.fuentes.map(f => f.url))
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(url.startsWith('https://')).toBe(true)
    }
    expect(new Set(urls).size).toBe(urls.length)
  })
})

describe('movilidadNormativaDe', () => {
  it('encuentra la fila exacta por nombre canónico', () => {
    expect(movilidadNormativaDe('Montevideo')?.estado).toBe('vigente')
    expect(movilidadNormativaDe('Artigas')?.estado).toBe('sin-norma-encontrada')
  })

  it('resuelve variantes con y sin tilde a la misma fila (San José, Río Negro, Paysandú, Tacuarembó)', () => {
    expect(movilidadNormativaDe('SAN JOSE')?.departamento).toBe('San José')
    expect(movilidadNormativaDe('San Jose')?.departamento).toBe('San José')
    expect(movilidadNormativaDe('RIO NEGRO')?.departamento).toBe('Río Negro')
    expect(movilidadNormativaDe('PAYSANDU')?.departamento).toBe('Paysandú')
    expect(movilidadNormativaDe('tacuarembo')?.departamento).toBe('Tacuarembó')
  })

  it('devuelve null para un nombre que no es un departamento', () => {
    expect(movilidadNormativaDe('Narnia')).toBeNull()
    expect(movilidadNormativaDe('')).toBeNull()
  })
})

describe('movilidadResumenNormativa', () => {
  it('cuenta los 19 departamentos en sus tres estados', () => {
    const resumen = movilidadResumenNormativa()
    expect(resumen.total).toBe(19)
    expect(resumen.vigente).toBe(2)
    expect(resumen.enEstudio).toBe(3)
    expect(resumen.sinNormaEncontrada).toBe(14)
    expect(resumen.vigente + resumen.enEstudio + resumen.sinNormaEncontrada).toBe(resumen.total)
  })
})
