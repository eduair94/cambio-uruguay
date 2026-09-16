import { describe, it, expect } from 'vitest'
import {
  AI_RELEASES,
  AI_RELEASES_VERIFIED_AT,
  beforeAfter,
  markReleaseMonths,
  releaseMonth,
  releasesByMonth,
  releasesInMonth,
  riseSplit,
  type AiRelease,
} from '../../utils/aiReleases'

// El riesgo real de esta lista es una fecha mal copiada, y contra eso el único control barato es
// el origen: cada fila tiene que enlazar el anuncio en el dominio del PROPIO fabricante. La tabla
// se escribe acá, no en el módulo, para que agregar un fabricante obligue a decidir a mano cuál
// es su dominio oficial en vez de heredar el de la fila de al lado.
const VENDOR_DOMAINS: Record<string, string> = {
  GitHub: 'github.blog',
  OpenAI: 'openai.com',
  Anthropic: 'www.anthropic.com',
  Cognition: 'cognition.com',
  Cursor: 'cursor.com',
  DeepSeek: 'api-docs.deepseek.com',
  Google: 'blog.google',
}

const KINDS = ['chat', 'coding', 'model']

describe('AI_RELEASES', () => {
  it('no está vacía', () => {
    expect(AI_RELEASES.length).toBeGreaterThan(0)
  })

  it('va en orden cronológico estricto', () => {
    const dates = AI_RELEASES.map(r => r.date)
    const sorted = [...dates].sort()
    expect(dates).toEqual(sorted)
    expect(new Set(dates).size).toBe(dates.length)
  })

  it('no repite una entrada', () => {
    const keys = AI_RELEASES.map(r => `${r.date} ${r.label}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('cada fecha tiene forma YYYY-MM-DD y es una fecha real', () => {
    for (const r of AI_RELEASES) {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(`${r.date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(r.date)
    }
  })

  it('ningún lanzamiento es posterior a la fecha de verificación', () => {
    expect(AI_RELEASES_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const r of AI_RELEASES) {
      expect(r.date <= AI_RELEASES_VERIFIED_AT).toBe(true)
    }
  })

  it('cada url es https y apunta al dominio de su propio fabricante', () => {
    for (const r of AI_RELEASES) {
      expect(r.url.startsWith('https://')).toBe(true)
      const allowed = VENDOR_DOMAINS[r.vendor]
      expect(allowed, `falta el dominio oficial de ${r.vendor} en la tabla del test`).toBeTruthy()
      expect(new URL(r.url).host).toBe(allowed)
    }
  })

  it('cada kind está dentro del union', () => {
    for (const r of AI_RELEASES) {
      expect(KINDS).toContain(r.kind)
    }
  })

  it('cada fila explica por qué está, con más de 30 caracteres', () => {
    for (const r of AI_RELEASES) {
      expect(r.label.length).toBeGreaterThan(0)
      expect(r.vendor.length).toBeGreaterThan(0)
      expect(r.why.length).toBeGreaterThan(30)
    }
  })

  it('ninguna cadena visible trae el separador de plurales de vue-i18n', () => {
    for (const r of AI_RELEASES) {
      expect(`${r.label} ${r.vendor} ${r.why}`).not.toContain('|')
    }
  })
})

describe('releaseMonth / releasesByMonth / releasesInMonth', () => {
  it('releaseMonth recorta a YYYY-MM', () => {
    expect(releaseMonth({ date: '2024-12-18' } as AiRelease)).toBe('2024-12')
  })

  it('releasesByMonth agrupa la lista por defecto sin perder filas', () => {
    const byMonth = releasesByMonth()
    const total = [...byMonth.values()].reduce((acc, list) => acc + list.length, 0)
    expect(total).toBe(AI_RELEASES.length)
    for (const key of byMonth.keys()) {
      expect(key).toMatch(/^\d{4}-\d{2}$/)
    }
  })

  it('releasesByMonth junta dos lanzamientos del mismo mes en un solo bucket', () => {
    const list = [
      { date: '2030-01-05', label: 'Uno' },
      { date: '2030-01-28', label: 'Dos' },
      { date: '2030-02-01', label: 'Tres' },
    ] as AiRelease[]
    const byMonth = releasesByMonth(list)
    expect(byMonth.get('2030-01')?.map(r => r.label)).toEqual(['Uno', 'Dos'])
    expect(byMonth.get('2030-02')?.map(r => r.label)).toEqual(['Tres'])
  })

  it('releasesInMonth devuelve lo del mes y [] para un mes sin lanzamientos', () => {
    expect(releasesInMonth('2022-11').map(r => r.label)).toEqual(['ChatGPT'])
    expect(releasesInMonth('1999-01')).toEqual([])
    expect(releasesInMonth('2030-01', [{ date: '2030-01-05', label: 'Uno' } as AiRelease])).toEqual(
      [{ date: '2030-01-05', label: 'Uno' }]
    )
  })
})

describe('markReleaseMonths', () => {
  it('marca sólo los meses con lanzamiento y deja el resto invisible', () => {
    const months = ['2022-10', '2022-11', '2022-12']
    const out = markReleaseMonths(months, '#7c4dff', '#888')
    expect(out.pointRadius).toEqual([0, 5, 0])
    expect(out.pointBackgroundColor).toEqual(['#888', '#7c4dff', '#888'])
  })

  it('devuelve arrays de la misma longitud que months', () => {
    const months = ['2021-01', '2022-06', '2023-03', '2024-03', '2099-01']
    const out = markReleaseMonths(months, '#7c4dff', '#888')
    expect(out.pointRadius).toHaveLength(months.length)
    expect(out.pointBackgroundColor).toHaveLength(months.length)
    expect(out.pointRadius).toEqual([0, 5, 5, 5, 0])
  })

  it('respeta el radio pedido', () => {
    expect(markReleaseMonths(['2022-06'], '#7c4dff', '#888', 9).pointRadius).toEqual([9])
  })

  it('con months vacío devuelve arrays vacíos', () => {
    expect(markReleaseMonths([], '#7c4dff', '#888')).toEqual({
      pointRadius: [],
      pointBackgroundColor: [],
    })
  })
})

describe('beforeAfter', () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  it('promedia los w meses previos y los w siguientes, sin contar el mes del índice', () => {
    expect(beforeAfter(values, 3, 3)).toEqual({ before: 2, after: 6 })
  })

  it('el w por defecto es 3', () => {
    expect(beforeAfter(values, 3)).toEqual(beforeAfter(values, 3, 3))
  })

  it('devuelve null del lado cuya ventana está incompleta por el borde', () => {
    expect(beforeAfter(values, 2, 3)).toEqual({ before: null, after: 5 })
    expect(beforeAfter(values, 6, 3)).toEqual({ before: 5, after: null })
    expect(beforeAfter(values, 0, 3)).toEqual({ before: null, after: 3 })
  })

  it('un hueco adentro de la ventana la anula entera, no la promedia con menos meses', () => {
    const gappy = [1, null, 3, 4, 5, 6, 7]
    expect(beforeAfter(gappy, 3, 3)).toEqual({ before: null, after: 6 })
  })

  it('con w=1 mira un solo mes de cada lado', () => {
    expect(beforeAfter(values, 4, 1)).toEqual({ before: 4, after: 6 })
  })
})

describe('riseSplit', () => {
  // Serie armada a mano: plana salvo un pozo en m3, así que el único mes que "sube" es m4
  // (antes 5, después 10). Los meses de los bordes no tienen las dos ventanas y no se cuentan.
  const months = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6']
  const values = [10, 10, 10, 5, 10, 10, 10]

  it('cuenta bien los dos grupos', () => {
    const out = riseSplit(months, values, new Set(['m4']), 1)
    expect(out.withRelease).toEqual({ n: 1, rose: 1, share: 1 })
    expect(out.without).toEqual({ n: 4, rose: 0, share: 0 })
  })

  it('un mes con lanzamiento pero sin ventana completa no entra en la muestra', () => {
    const out = riseSplit(months, values, new Set(['m0', 'm6']), 1)
    expect(out.withRelease).toEqual({ n: 0, rose: 0, share: null })
    expect(out.without).toEqual({ n: 5, rose: 1, share: 0.2 })
  })

  it('share es null sin muestra, nunca NaN', () => {
    const out = riseSplit([], [], new Set())
    expect(out.withRelease).toEqual({ n: 0, rose: 0, share: null })
    expect(out.without).toEqual({ n: 0, rose: 0, share: null })
    expect(JSON.stringify(out)).not.toContain('NaN')
  })

  it('con w=3 descarta los tres meses de cada borde', () => {
    const rising = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
    const out = riseSplit(rising, [1, 2, 3, 4, 5, 6, 7, 8, 9], new Set(['e']))
    expect(out.withRelease).toEqual({ n: 1, rose: 1, share: 1 })
    expect(out.without).toEqual({ n: 2, rose: 2, share: 1 })
  })

  it('los huecos de la serie sacan ese mes de la cuenta', () => {
    const out = riseSplit(months, [10, 10, null, 5, 10, 10, 10], new Set(['m4']), 1)
    expect(out.withRelease).toEqual({ n: 1, rose: 1, share: 1 })
    expect(out.without).toEqual({ n: 2, rose: 0, share: 0 })
  })
})
