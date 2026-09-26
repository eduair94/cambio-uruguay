import { describe, expect, it } from 'vitest'

import {
  ABROAD_EXTRA_YEARS,
  HISTORIA_LABORAL_START,
  WORK_YEARS_BRACKETS,
  WORK_YEARS_FAQ,
  WORK_YEARS_SOURCES,
  addYears,
  bracketForBirthDate,
  closesOnFor,
  daysUntilClose,
  isCalendarDate,
  windowStateOn,
} from '../../utils/workYearsRecognition'

describe('el cuadro de plazos del BPS se transcribe entero', () => {
  it('tiene las cuatro franjas del cuadro, en orden y sin huecos', () => {
    expect(WORK_YEARS_BRACKETS).toHaveLength(4)
    expect(WORK_YEARS_BRACKETS[0]!.bornFrom).toBeNull()
    expect(WORK_YEARS_BRACKETS.at(-1)!.bornTo).toBeNull()
    // El día siguiente al techo de una franja es el piso de la próxima: sin eso hay una fecha de
    // nacimiento a la que no le toca ninguna fila y el resolvedor devuelve null para una persona
    // real.
    for (let i = 0; i < WORK_YEARS_BRACKETS.length - 1; i++) {
      const top = WORK_YEARS_BRACKETS[i]!.bornTo!
      expect(WORK_YEARS_BRACKETS[i + 1]!.bornFrom).toBe(addDay(top))
    }
  })

  it('abre y cierra cada franja en el día que publica el cuadro', () => {
    expect(WORK_YEARS_BRACKETS.map(b => [b.opensOn, b.closesOn])).toEqual([
      ['2023-06-01', '2027-05-31'],
      ['2025-06-01', '2027-05-31'],
      ['2027-06-01', '2029-05-31'],
      ['2029-06-01', '2031-05-31'],
    ])
  })

  it('marca como extendida sólo la franja que el cuadro anota', () => {
    // La nota (1) del cuadro es del Decreto de MTSS del 21/5/2026 y cuelga de la primera fila. Que
    // sea UNA sola importa: si se propaga, la página le atribuye al decreto plazos que no tocó.
    expect(WORK_YEARS_BRACKETS.filter(b => b.extendedByDecree).map(b => b.key)).toEqual([
      'hasta-1963',
    ])
  })

  it('deja las dos primeras franjas cerrando el mismo día', () => {
    // No es una transcripción repetida: la extensión de la primera la empató con la segunda, y es
    // el hecho que la página titula.
    expect(WORK_YEARS_BRACKETS[0]!.closesOn).toBe(WORK_YEARS_BRACKETS[1]!.closesOn)
  })

  it('cada franja cierra después de abrir', () => {
    for (const bracket of WORK_YEARS_BRACKETS) {
      expect(bracket.closesOn > bracket.opensOn).toBe(true)
    }
  })
})

describe('la franja de una fecha de nacimiento', () => {
  it('resuelve los bordes inclusivos del cuadro', () => {
    expect(bracketForBirthDate('1963-06-01')!.key).toBe('hasta-1963')
    expect(bracketForBirthDate('1963-06-02')!.key).toBe('1963-1968')
    expect(bracketForBirthDate('1968-06-01')!.key).toBe('1963-1968')
    expect(bracketForBirthDate('1968-06-02')!.key).toBe('1968-1973')
    expect(bracketForBirthDate('1973-06-01')!.key).toBe('1968-1973')
    expect(bracketForBirthDate('1973-06-02')!.key).toBe('desde-1973')
  })

  it('le da una franja a cualquier fecha de nacimiento plausible', () => {
    for (const iso of ['1930-01-01', '1959-12-31', '1970-07-20', '1999-02-28', '2006-06-06']) {
      expect(bracketForBirthDate(iso), iso).not.toBeNull()
    }
  })

  it('rechaza lo que no es una fecha en vez de adivinar una franja', () => {
    for (const bad of ['', '1963', '1963-6-1', '1963-13-01', '1963-02-31', 'ayer', '1963/06/01']) {
      expect(bracketForBirthDate(bad), bad).toBeNull()
    }
  })

  it('valida el calendario, no el formato', () => {
    expect(isCalendarDate('2024-02-29')).toBe(true)
    expect(isCalendarDate('2026-02-29')).toBe(false)
    expect(isCalendarDate('2026-04-31')).toBe(false)
    expect(isCalendarDate('2026-12-31')).toBe(true)
  })
})

describe('los dos años de quien vive en el exterior', () => {
  it('corre el cierre de cada franja exactamente dos años', () => {
    expect(ABROAD_EXTRA_YEARS).toBe(2)
    for (const bracket of WORK_YEARS_BRACKETS) {
      expect(closesOnFor(bracket, true)).toBe(addYears(bracket.closesOn, 2))
    }
  })

  it('no le toca nada a quien reside en Uruguay', () => {
    for (const bracket of WORK_YEARS_BRACKETS) {
      expect(closesOnFor(bracket)).toBe(bracket.closesOn)
    }
  })

  it('no se sale del calendario al sumar años', () => {
    expect(addYears('2027-05-31', 2)).toBe('2029-05-31')
    // Un 29 de febrero baja al 28 en lugar de convertirse en un 1.º de marzo.
    expect(addYears('2028-02-29', 1)).toBe('2029-02-28')
    expect(addYears('2028-02-29', 4)).toBe('2032-02-29')
  })
})

describe('el estado de la ventana en una fecha dada', () => {
  const [primera, , tercera] = WORK_YEARS_BRACKETS as unknown as [
    (typeof WORK_YEARS_BRACKETS)[number],
    (typeof WORK_YEARS_BRACKETS)[number],
    (typeof WORK_YEARS_BRACKETS)[number],
  ]

  it('cuenta como abiertos los dos días del borde', () => {
    expect(windowStateOn('2023-06-01', primera)).toBe('open')
    expect(windowStateOn('2027-05-31', primera)).toBe('open')
    expect(windowStateOn('2023-05-31', primera)).toBe('upcoming')
    expect(windowStateOn('2027-06-01', primera)).toBe('closed')
  })

  it('el 2026-09-26 tiene abiertas las dos primeras franjas y no la tercera', () => {
    expect(windowStateOn('2026-09-26', primera)).toBe('open')
    expect(windowStateOn('2026-09-26', WORK_YEARS_BRACKETS[1]!)).toBe('open')
    expect(windowStateOn('2026-09-26', tercera)).toBe('upcoming')
  })

  it('a quien vive afuera le sigue abierta la ventana que en Uruguay ya cerró', () => {
    expect(windowStateOn('2028-01-01', primera)).toBe('closed')
    expect(windowStateOn('2028-01-01', primera, true)).toBe('open')
  })

  it('los dos años de afuera alargan el final y NO corren la apertura', () => {
    // El BPS extiende «los plazos». Correr también el «Desde» le diría a alguien que su ventana no
    // abrió cuando el cuadro dice que sí, y esa es una afirmación que la fuente no hace.
    expect(windowStateOn('2027-06-15', tercera)).toBe('open')
    expect(windowStateOn('2027-06-15', tercera, true)).toBe('open')
    expect(windowStateOn('2027-05-31', tercera, true)).toBe('upcoming')
  })

  it('cuenta los días que faltan, y los negativos cuando ya venció', () => {
    expect(daysUntilClose('2027-05-31', primera)).toBe(0)
    expect(daysUntilClose('2027-05-30', primera)).toBe(1)
    expect(daysUntilClose('2027-06-01', primera)).toBe(-1)
    expect(daysUntilClose('2027-05-31', primera, true)).toBe(731)
  })
})

describe('las fuentes y el texto de la página', () => {
  it('cita sólo organismos y publicaciones oficiales, por https', () => {
    expect(WORK_YEARS_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const source of WORK_YEARS_SOURCES) {
      expect(source.url, source.label).toMatch(
        /^https:\/\/(www\.)?(bps\.gub\.uy|gub\.uy|impo\.com\.uy)\//
      )
      expect(source.label.length).toBeGreaterThan(10)
    }
  })

  it('apunta al cuadro del BPS, que es de donde sale cada fecha', () => {
    expect(WORK_YEARS_SOURCES.map(s => s.url)).toContain(
      'https://www.bps.gub.uy/20542/reconocimiento-de-anos-trabajados.html'
    )
  })

  it('arranca la historia laboral nominada el 1/4/1996', () => {
    expect(HISTORIA_LABORAL_START).toBe('1996-04-01')
  })

  it('no deja una pregunta sin respuesta ni una respuesta sin pregunta', () => {
    expect(WORK_YEARS_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const item of WORK_YEARS_FAQ) {
      expect(item.question.endsWith('?'), item.question).toBe(true)
      expect(item.answer.length).toBeGreaterThan(40)
    }
    expect(new Set(WORK_YEARS_FAQ.map(i => i.question)).size).toBe(WORK_YEARS_FAQ.length)
  })

  it('dice que el costo no se publica, en vez de inventar un importe', () => {
    // La convención del repo: una cifra sin fuente no se publica y se explica por qué. Si alguien
    // le mete un importe a esta FAQ, este test lo frena.
    const cost = WORK_YEARS_FAQ.find(i => i.question.includes('Cuánto cuesta'))
    expect(cost).toBeDefined()
    expect(cost!.answer).toContain('No lo publicamos')
    expect(cost!.answer).not.toMatch(/\$\s?\d|\bUI\b|\bUR\b/)
  })
})

/** El día siguiente a una fecha ISO, para comprobar que las franjas no dejan huecos. */
function addDay(iso: string): string {
  const next = new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000)
  return next.toISOString().slice(0, 10)
}
