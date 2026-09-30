import { describe, expect, it } from 'vitest'
import { URUGUAY } from '../../utils/calculators'
import {
  SOLIDARITY_BPC_UYU,
  SOLIDARITY_BRACKETS,
  SOLIDARITY_END_CAUSES,
  SOLIDARITY_FAQ,
  SOLIDARITY_FIRST_YEAR,
  SOLIDARITY_INCOME_THRESHOLD_BPC,
  SOLIDARITY_MAX_CONTRIBUTION_YEARS,
  SOLIDARITY_SOURCES,
  solidarityBpcToUyu,
  solidarityContribution,
  solidarityIncomeThresholdUyu,
  solidaritySeoDescription,
} from '../../utils/solidarityFund'

describe('la escala del Fondo de Solidaridad', () => {
  // Los cuatro casos del art. 3, uno por fila de la escala.
  it('cobra media BPC a la carrera corta entre los años 5 y 9', () => {
    const verdict = solidarityContribution(3, 6)
    expect(verdict).toMatchObject({ status: 'aporta', bpc: 0.5 })
  })

  it('cobra 1 BPC a la carrera corta desde los 10 años', () => {
    expect(solidarityContribution(3, 10)).toMatchObject({ status: 'aporta', bpc: 1 })
  })

  it('cobra 1 BPC a la carrera de 4 años o más entre los años 5 y 9', () => {
    expect(solidarityContribution(5, 9)).toMatchObject({ status: 'aporta', bpc: 1 })
  })

  it('cobra 2 BPC a la carrera de 4 años o más desde los 10 años', () => {
    expect(solidarityContribution(6, 11)).toMatchObject({ status: 'aporta', bpc: 2 })
  })

  // El borde que decide el tramo de carrera: 4 años ya es "larga". Sale del texto —"carreras de
  // cuatro años o más"—, y un `>` en vez de `>=` le cobraría la mitad a toda una cohorte.
  it('trata los 4 años exactos como carrera larga', () => {
    expect(solidarityContribution(4, 6)).toMatchObject({ bpc: 1 })
    expect(solidarityContribution(3.9, 6)).toMatchObject({ bpc: 0.5 })
  })

  // El otro borde: el salto de tramo es "a partir de cumplidos los diez años".
  it('salta de tramo recién a los 10 años, no a los 9', () => {
    expect(solidarityContribution(5, 9)).toMatchObject({ bpc: 1 })
    expect(solidarityContribution(5, 10)).toMatchObject({ bpc: 2 })
  })
})

describe('los dos ceros no son el mismo cero', () => {
  // La razón por la que la función devuelve un veredicto y no un número: antes del quinto año y
  // después del tope de 25 la página tiene que decir cosas distintas.
  it('antes del quinto año no se aporta todavía', () => {
    expect(solidarityContribution(6, 4).status).toBe('todavia-no')
    expect(solidarityContribution(6, 0).status).toBe('todavia-no')
  })

  it('empieza exactamente en el quinto año', () => {
    expect(solidarityContribution(6, SOLIDARITY_FIRST_YEAR).status).toBe('aporta')
  })

  it('cesa al cumplir 25 años de aportación contados desde el quinto año', () => {
    const last = SOLIDARITY_FIRST_YEAR + SOLIDARITY_MAX_CONTRIBUTION_YEARS - 1
    expect(solidarityContribution(6, last).status).toBe('aporta')
    expect(solidarityContribution(6, last + 1).status).toBe('cesa-por-tope')
  })

  it('no explota con valores no numéricos', () => {
    expect(solidarityContribution(Number.NaN, 6).status).toBe('todavia-no')
    expect(solidarityContribution(6, Number.POSITIVE_INFINITY).status).toBe('todavia-no')
  })
})

describe('la conversión a pesos', () => {
  // La BPC no se copia: se toma de la misma constante auditada que usan el IRPF y la calculadora
  // de sueldo líquido. Si alguien pega un literal acá, este test lo delata.
  it('usa la BPC auditada del sitio y no una copia', () => {
    expect(SOLIDARITY_BPC_UYU).toBe(URUGUAY.bpc)
  })

  it('convierte cada tramo de la escala a pesos', () => {
    expect(solidarityBpcToUyu(0.5, 6864)).toBe(3432)
    expect(solidarityBpcToUyu(1, 6864)).toBe(6864)
    expect(solidarityBpcToUyu(2, 6864)).toBe(13728)
  })

  it('publica el umbral de ingresos en pesos', () => {
    expect(SOLIDARITY_INCOME_THRESHOLD_BPC).toBe(8)
    expect(solidarityIncomeThresholdUyu(6864)).toBe(54912)
  })

  it('el veredicto trae el monto en pesos ya resuelto', () => {
    const verdict = solidarityContribution(6, 11, 6864)
    expect(verdict).toMatchObject({ status: 'aporta', bpc: 2, uyu: 13728 })
  })
})

describe('el catálogo se puede publicar', () => {
  it('tiene las cuatro filas que distingue la norma, sin ids repetidos', () => {
    expect(SOLIDARITY_BRACKETS).toHaveLength(4)
    expect(new Set(SOLIDARITY_BRACKETS.map(row => row.id)).size).toBe(4)
  })

  it('cada fila de la escala es alcanzable desde la función', () => {
    const reached = new Set<string>()
    for (const careerYears of [3, 5]) {
      for (const years of [6, 12]) {
        const verdict = solidarityContribution(careerYears, years)
        if (verdict.status === 'aporta') reached.add(verdict.bracket)
      }
    }
    expect(reached.size).toBe(4)
  })

  it('lista las cuatro causas de cese del art. 3', () => {
    expect(SOLIDARITY_END_CAUSES).toHaveLength(4)
  })

  // Toda fuente es una URL real y primaria: impo para la norma, el propio indicador para la BPC.
  // Es la regla que evita que una cifra entre sin respaldo.
  it('cada fuente tiene una URL absoluta de impo o del propio sitio', () => {
    expect(SOLIDARITY_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const source of SOLIDARITY_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.)?(impo\.com\.uy|cambio-uruguay\.com)\//)
      expect(source.label.length).toBeGreaterThan(10)
    }
  })

  // La norma vigente está en BPC. Si alguna vez alguien "corrige" esta página con la versión que
  // devuelven los buscadores —salarios mínimos, umbral de 4—, este test lo frena: es texto
  // derogado y el número quedaría mal por un factor grande.
  it('no cita la escala derogada en salarios mínimos', () => {
    const text = [
      ...SOLIDARITY_FAQ.map(item => `${item.question} ${item.answer}`),
      ...SOLIDARITY_BRACKETS.map(row => `${row.career} ${row.window}`),
    ]
      .join(' ')
      .toLowerCase()
    expect(text).not.toContain('salario mínimo')
    expect(text).not.toContain('cinco tercios')
  })

  it('las preguntas frecuentes responden y no quedan vacías', () => {
    expect(SOLIDARITY_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const item of SOLIDARITY_FAQ) {
      expect(item.question.endsWith('?')).toBe(true)
      expect(item.answer.length).toBeGreaterThan(40)
    }
  })

  // El adicional es el dato que esta página deliberadamente NO publica: su monto del año depende
  // de una norma posterior que no se pudo leer. Ninguna respuesta puede afirmar una cifra suya.
  it('ninguna respuesta le pone monto al adicional', () => {
    for (const item of SOLIDARITY_FAQ) {
      if (!/adicional/i.test(item.answer)) continue
      expect(item.answer).not.toMatch(/\$\s?[\d.]/)
    }
  })
})

describe('la descripción del snippet', () => {
  it('entra en los 155 caracteres que publica Google, hoy y con una BPC de cinco dígitos', () => {
    // El peor caso plausible, igual que `seoTitleBudget`: la BPC crece un dígito y la descripción
    // tiene que seguir entrando entera.
    for (const bpc of [6864, 9999, 12500, 99999]) {
      const description = solidaritySeoDescription(bpc)
      expect(description.length, `${String(bpc)}: ${description}`).toBeLessThanOrEqual(155)
    }
  })

  it('trae los tres montos concretos y no una etiqueta de formato', () => {
    const description = solidaritySeoDescription(6864)
    expect(description).toContain('54.912')
    expect(description).toContain('6.864')
    expect(description).toContain('13.728')
    // La regla de oro medida en este sitio: la descripción arranca por la respuesta, no por lo que
    // la página es ("Guía del...", "Todo sobre...").
    expect(description).not.toMatch(/^(Guía|Todo sobre|Comparativa|Directorio)/i)
  })

  it('se mueve con la BPC en vez de quedar congelada', () => {
    expect(solidaritySeoDescription(6864)).not.toBe(solidaritySeoDescription(9999))
  })
})
