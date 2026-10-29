import { describe, expect, it } from 'vitest'
import {
  calendarioDe,
  carnavalDe,
  cenizaDe,
  finesDeSemanaLargosDe,
  pascuaDe,
  resumenDe,
  semanaDeTurismoDe,
} from '../../utils/feriadosAnuales'

/**
 * El calendario anual de /feriados-2027-uruguay.
 *
 * Lo que hay que vigilar acá no es que el código corra: es que las fechas sean las correctas. Un
 * cómputo de Pascua transcripto mal no se rompe, devuelve un domingo de marzo o abril que parece
 * bien y mueve Carnaval y Semana de Turismo del año entero. Por eso el ancla del archivo son fechas
 * de Pascua conocidas y comprobables fuera del repo, y no el resultado del propio algoritmo.
 */
describe('la Pascua', () => {
  // Ocho años seguidos, incluido el salto de siglo que el cómputo gregoriano corrige.
  const CONOCIDAS: Record<number, string> = {
    2023: '2023-04-09',
    2024: '2024-03-31',
    2025: '2025-04-20',
    2026: '2026-04-05',
    2027: '2027-03-28',
    2028: '2028-04-16',
    2029: '2029-04-01',
    2030: '2030-04-21',
  }

  it.each(Object.entries(CONOCIDAS))('cae el %s → %s', (year, iso) => {
    expect(pascuaDe(Number(year))).toBe(iso)
  })

  it('siempre cae domingo', () => {
    for (let year = 2020; year <= 2040; year++) {
      expect(new Date(`${pascuaDe(year)}T00:00:00Z`).getUTCDay(), String(year)).toBe(0)
    }
  })

  it('el miércoles de Ceniza va 46 días antes y cae miércoles', () => {
    expect(cenizaDe(2027)).toBe('2027-02-10')
    for (let year = 2020; year <= 2040; year++) {
      expect(new Date(`${cenizaDe(year)}T00:00:00Z`).getUTCDay(), String(year)).toBe(3)
    }
  })
})

describe('las dos fechas que cuelgan de la Pascua', () => {
  it('Carnaval 2027 es el lunes 8 y el martes 9 de febrero', () => {
    expect(carnavalDe(2027)).toEqual({ lunes: '2027-02-08', martes: '2027-02-09' })
  })

  it('Semana de Turismo 2027 es el jueves 25 y el viernes 26 de marzo', () => {
    expect(semanaDeTurismoDe(2027)).toEqual({ jueves: '2027-03-25', viernes: '2027-03-26' })
  })

  it('Carnaval siempre cae lunes y martes, y Turismo jueves y viernes', () => {
    const dia = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay()
    for (let year = 2020; year <= 2040; year++) {
      const carnaval = carnavalDe(year)
      expect(dia(carnaval.lunes), String(year)).toBe(1)
      expect(dia(carnaval.martes), String(year)).toBe(2)
      const turismo = semanaDeTurismoDe(year)
      expect(dia(turismo.jueves), String(year)).toBe(4)
      expect(dia(turismo.viernes), String(year)).toBe(5)
    }
  })
})

describe('el calendario de 2027', () => {
  const filas = calendarioDe(2027)

  it('tiene las quince fechas de feriado, ordenadas', () => {
    expect(filas.map(f => f.observado)).toEqual([
      '2027-01-01', // Año Nuevo, viernes
      '2027-01-06', // Día de los Niños, miércoles
      '2027-02-08', // lunes de Carnaval
      '2027-02-09', // martes de Carnaval
      '2027-03-25', // jueves de Semana de Turismo
      '2027-03-26', // viernes de Semana de Turismo
      '2027-04-19', // Desembarco: cae lunes, se observa ese día
      '2027-05-01', // Día de los Trabajadores, sábado
      '2027-05-17', // Las Piedras: el 18 cae martes y pasa al lunes anterior
      '2027-06-19', // Natalicio de Artigas, sábado
      '2027-07-18', // Jura de la Constitución, domingo
      '2027-08-25', // Declaratoria de la Independencia, miércoles
      '2027-10-11', // 12 de octubre: cae martes y pasa al lunes anterior
      '2027-11-02', // Día de los Difuntos, martes (no se corre)
      '2027-12-25', // Día de la Familia, sábado
    ])
  })

  it('mueve de día sólo los dos que el artículo 1 corre', () => {
    const corridos = filas.filter(f => f.seCorre)
    expect(corridos.map(f => [f.declarada, f.observado])).toEqual([
      ['2027-05-18', '2027-05-17'],
      ['2027-10-12', '2027-10-11'],
    ])
  })

  it('el 19 de abril cae lunes, así que se observa en su fecha y no se corre', () => {
    const abril = filas.find(f => f.observado === '2027-04-19')
    expect(abril?.seCorre).toBe(false)
    expect(abril?.declarada).toBeNull()
    expect(abril?.corrimiento).toBe('mismo-dia')
  })

  it('no marca como pago ningún feriado que no esté en el art. 18 de la Ley 12.590', () => {
    expect(filas.filter(f => f.pago).map(f => f.observado)).toEqual([
      '2027-01-01',
      '2027-05-01',
      '2027-07-18',
      '2027-08-25',
      '2027-12-25',
    ])
  })

  it('declara de dónde sale cada fecha', () => {
    const porOrigen = filas.reduce<Record<string, number>>((acc, f) => {
      acc[f.origen] = (acc[f.origen] ?? 0) + 1
      return acc
    }, {})
    // Ocho fechas fijas con día del mes, las cuatro de la Pascua y las tres móviles.
    expect(porOrigen).toEqual({ 'ley-fija': 8, pascua: 4, 'ley-movil': 3 })
  })
})

describe('los fines de semana largos de 2027', () => {
  const tramos = finesDeSemanaLargosDe(2027)

  it('son seis, y cada uno trae los feriados que lo arman', () => {
    expect(tramos.map(t => ({ desde: t.desde, hasta: t.hasta, dias: t.dias }))).toEqual([
      { desde: '2027-01-01', hasta: '2027-01-03', dias: 3 }, // Año Nuevo viernes
      { desde: '2027-02-06', hasta: '2027-02-09', dias: 4 }, // Carnaval
      { desde: '2027-03-25', hasta: '2027-03-28', dias: 4 }, // Semana de Turismo
      { desde: '2027-04-17', hasta: '2027-04-19', dias: 3 }, // 19 de abril, lunes
      { desde: '2027-05-15', hasta: '2027-05-17', dias: 3 }, // Las Piedras corrido
      { desde: '2027-10-09', hasta: '2027-10-11', dias: 3 }, // 12 de octubre corrido
    ])
    for (const tramo of tramos) expect(tramo.feriados.length).toBeGreaterThan(0)
  })

  it('no cuenta como tramo un feriado aislado en medio de la semana', () => {
    // El 25 de agosto de 2027 cae miércoles y el 2 de noviembre, martes sin corrimiento.
    const fechas = tramos.flatMap(t => [t.desde, t.hasta])
    expect(fechas).not.toContain('2027-08-25')
    expect(fechas).not.toContain('2027-11-02')
  })

  it('tampoco cuenta un fin de semana sin feriado partido por el borde del año', () => {
    // 2027 arranca viernes y termina viernes; 2032 arranca jueves y termina sábado.
    for (const year of [2027, 2028, 2029, 2030, 2031, 2032]) {
      for (const tramo of finesDeSemanaLargosDe(year)) {
        expect(tramo.feriados.length, `${year} ${tramo.desde}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('el resumen que va en el título y en la descripción', () => {
  it('cuenta 2027 como lo cuenta la página', () => {
    expect(resumenDe(2027)).toEqual({
      year: 2027,
      dias: 15,
      // 1.º de mayo y 19 de junio sábado, 18 de julio domingo, 25 de diciembre sábado.
      enFinDeSemana: 4,
      seCorren: 2,
      pagos: 5,
      finesDeSemanaLargos: 6,
      tramoMasLargo: 4,
    })
  })

  it('cuenta siempre quince días de feriado y cinco pagos', () => {
    for (let year = 2020; year <= 2040; year++) {
      const resumen = resumenDe(year)
      expect(resumen.dias, String(year)).toBe(15)
      expect(resumen.pagos, String(year)).toBe(5)
      expect(resumen.seCorren, String(year)).toBeLessThanOrEqual(3)
    }
  })
})
