import { describe, expect, it } from 'vitest'

import {
  AGUINALDO_DIVISOR,
  JORNAL_DIVISOR,
  LICENCIA_DIAS_POR_MES_20,
  LICENCIA_DIAS_POR_MES_21,
  PLAZO_EXIGIBILIDAD_DIAS,
  RECARGO_POR_MORA,
  RENUNCIA_FAQ,
  RENUNCIA_NO_PUBLICADO,
  RENUNCIA_PARTIDAS,
  RENUNCIA_SOURCES,
  aguinaldoGenerado,
  diasDeLicenciaGenerados,
  enMora,
  exigibleDesde,
  licenciaNoGozadaImporte,
  recargoPorMora,
} from '../../utils/renuncia'

describe('exigibleDesde', () => {
  it('cuenta diez días CORRIDOS, que es como los cuenta el art. 1440', () => {
    // 2026-03-02 + 10 corridos = 2026-03-12. Con días hábiles daría el 16: la
    // diferencia es justamente el error que la página corrige.
    expect(exigibleDesde(new Date('2026-03-02T12:00:00Z')).toISOString().slice(0, 10)).toBe(
      '2026-03-12'
    )
  })

  it('cruza el fin de mes y el fin de año sin ayuda', () => {
    expect(exigibleDesde(new Date('2026-01-28T12:00:00Z')).toISOString().slice(0, 10)).toBe(
      '2026-02-07'
    )
    expect(exigibleDesde(new Date('2026-12-27T12:00:00Z')).toISOString().slice(0, 10)).toBe(
      '2027-01-06'
    )
  })

  it('no muta la fecha que recibe', () => {
    const cese = new Date('2026-03-02T12:00:00Z')
    const antes = cese.getTime()
    exigibleDesde(cese)
    expect(cese.getTime()).toBe(antes)
  })

  it('siempre adelanta exactamente el plazo publicado', () => {
    const cese = new Date('2026-06-15T12:00:00Z')
    const dias = (exigibleDesde(cese).getTime() - cese.getTime()) / 86_400_000
    expect(dias).toBe(PLAZO_EXIGIBILIDAD_DIAS)
  })
})

describe('enMora', () => {
  const cese = new Date('2026-03-02T12:00:00Z')

  it('no hay mora mientras el plazo corre', () => {
    expect(enMora(cese, new Date('2026-03-03T12:00:00Z'))).toBe(false)
    expect(enMora(cese, new Date('2026-03-11T12:00:00Z'))).toBe(false)
  })

  it('el día en que vence todavía no es mora: recién ahí la deuda se hace exigible', () => {
    expect(enMora(cese, new Date('2026-03-12T12:00:00Z'))).toBe(false)
  })

  it('a partir del día siguiente sí', () => {
    expect(enMora(cese, new Date('2026-03-13T12:00:00Z'))).toBe(true)
    expect(enMora(cese, new Date('2026-09-01T12:00:00Z'))).toBe(true)
  })
})

describe('recargoPorMora', () => {
  it('es el 10 % del art. 29', () => {
    expect(recargoPorMora(50_000)).toBeCloseTo(5_000, 6)
    expect(RECARGO_POR_MORA).toBe(0.1)
  })

  it('no inventa un recargo sobre una deuda que no existe', () => {
    for (const monto of [0, -1, -50_000, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(recargoPorMora(monto)).toBe(0)
    }
  })
})

describe('aguinaldoGenerado', () => {
  it('es la alícuota mensual del MTSS por los meses del período', () => {
    // Sueldo 60.000, seis meses corridos: 60.000/12 * 6 = 30.000.
    expect(aguinaldoGenerado(60_000, 6)).toBeCloseTo(30_000, 6)
    expect(AGUINALDO_DIVISOR).toBe(12)
  })

  it('irse a mitad de período no lo hace perder, lo hace proporcional', () => {
    expect(aguinaldoGenerado(60_000, 3)).toBeCloseTo(aguinaldoGenerado(60_000, 6) / 2, 6)
    expect(aguinaldoGenerado(60_000, 1)).toBeGreaterThan(0)
  })

  it('un período completo de doce meses paga un sueldo entero', () => {
    expect(aguinaldoGenerado(60_000, 12)).toBeCloseTo(60_000, 6)
  })

  it('no explota ni devuelve negativos con entradas basura', () => {
    for (const malo of [-1, Number.NaN]) {
      expect(aguinaldoGenerado(malo, 6)).toBe(0)
      expect(aguinaldoGenerado(60_000, malo)).toBe(0)
    }
  })
})

describe('diasDeLicenciaGenerados', () => {
  it('usa los dos escalones que publica el MTSS y no un promedio entre ellos', () => {
    expect(diasDeLicenciaGenerados(1)).toBe(LICENCIA_DIAS_POR_MES_20)
    expect(diasDeLicenciaGenerados(1, true)).toBe(LICENCIA_DIAS_POR_MES_21)
    expect(LICENCIA_DIAS_POR_MES_20).toBe(1.66)
    expect(LICENCIA_DIAS_POR_MES_21).toBe(1.75)
  })

  it('el día complementario por antigüedad siempre genera más, nunca menos', () => {
    for (const meses of [1, 3, 6, 12]) {
      expect(diasDeLicenciaGenerados(meses, true)).toBeGreaterThan(
        diasDeLicenciaGenerados(meses, false)
      )
    }
  })

  it('un año completo se acerca a los días anuales de cada escalón', () => {
    expect(diasDeLicenciaGenerados(12)).toBeCloseTo(19.92, 2)
    expect(diasDeLicenciaGenerados(12, true)).toBeCloseTo(21, 6)
  })

  it('no genera días con entradas basura', () => {
    for (const malo of [0, -5, Number.NaN]) expect(diasDeLicenciaGenerados(malo)).toBe(0)
  })
})

describe('licenciaNoGozadaImporte', () => {
  it('es el valor día por 30 multiplicado por los días generados', () => {
    // 60.000/30 = 2.000 por día; seis meses al escalón de 20 días = 9,96 días.
    expect(licenciaNoGozadaImporte(60_000, 6)).toBeCloseTo(2_000 * 6 * 1.66, 6)
    expect(JORNAL_DIVISOR).toBe(30)
  })

  it('coincide con componer las dos funciones que publica la página', () => {
    for (const meses of [1, 4, 7.5, 12]) {
      for (const extra of [false, true]) {
        expect(licenciaNoGozadaImporte(90_000, meses, extra)).toBeCloseTo(
          (90_000 / JORNAL_DIVISOR) * diasDeLicenciaGenerados(meses, extra),
          6
        )
      }
    }
  })

  it('no devuelve importes negativos', () => {
    for (const malo of [-1, Number.NaN]) expect(licenciaNoGozadaImporte(malo, 6)).toBe(0)
  })
})

describe('el catálogo de partidas', () => {
  it('cobra tres partidas y pierde sólo la indemnización', () => {
    const cobra = RENUNCIA_PARTIDAS.filter(p => p.corresponde).map(p => p.key)
    const pierde = RENUNCIA_PARTIDAS.filter(p => !p.corresponde).map(p => p.key)
    expect(cobra).toEqual(['licencia', 'salario-vacacional', 'aguinaldo'])
    expect(pierde).toEqual(['indemnizacion'])
  })

  it('cada partida dice de dónde sale', () => {
    for (const partida of RENUNCIA_PARTIDAS) {
      expect(partida.source.length).toBeGreaterThan(8)
      expect(partida.detail.length).toBeGreaterThan(60)
    }
  })

  it('no repite claves', () => {
    const keys = RENUNCIA_PARTIDAS.map(p => p.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('las fuentes', () => {
  it('son todas oficiales uruguayas y ninguna es un blog', () => {
    const permitidos = ['gub.uy', 'impo.com.uy']
    expect(RENUNCIA_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const source of RENUNCIA_SOURCES) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(permitidos.some(host => new URL(source.url).hostname.endsWith(host))).toBe(true)
      expect(source.label.length).toBeGreaterThan(40)
    }
  })

  it('no repite URLs', () => {
    const urls = RENUNCIA_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
})

describe('los huecos declarados', () => {
  // El punto de este bloque: la página promete no publicar dos números, y esta es
  // la guarda que impide que alguien los agregue sin darse cuenta.
  it('declara el preaviso y el despido indirecto como no publicados', () => {
    expect(RENUNCIA_NO_PUBLICADO.map(o => o.key).sort()).toEqual(['despido-indirecto', 'preaviso'])
  })

  it('no cuela una cifra de preaviso en el texto que explica por qué no la hay', () => {
    const preaviso = RENUNCIA_NO_PUBLICADO.find(o => o.key === 'preaviso')!
    // Las cifras que circulan aparecen sólo nombradas como lo que NO se afirma;
    // ningún dígito debe entrar como dato.
    expect(preaviso.detail).not.toMatch(/\d/)
  })

  it('no publica un monto de despido indirecto', () => {
    const indirecto = RENUNCIA_NO_PUBLICADO.find(o => o.key === 'despido-indirecto')!
    expect(indirecto.detail).not.toMatch(/\d/)
  })
})

describe('las preguntas frecuentes', () => {
  it('contestan con datos y no con generalidades', () => {
    expect(RENUNCIA_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const faq of RENUNCIA_FAQ) {
      expect(faq.q.endsWith('?')).toBe(true)
      expect(faq.a.length).toBeGreaterThan(80)
    }
  })

  it('el bloque entero nombra los tres números que sostienen la página', () => {
    const todo = RENUNCIA_FAQ.map(f => f.a).join(' ')
    expect(todo).toContain('1440')
    expect(todo).toContain('10%')
    expect(todo).toContain('18.572')
  })

  it('no repite preguntas', () => {
    const qs = RENUNCIA_FAQ.map(f => f.q)
    expect(new Set(qs).size).toBe(qs.length)
  })
})
