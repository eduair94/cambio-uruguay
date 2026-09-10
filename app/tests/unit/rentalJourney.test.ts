import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  JOURNEY_STAGES,
  journeyFigures,
  journeyFirstOutlay,
  type JourneyFigure,
} from '../../utils/rentalJourney'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const figure = (key: string, valueUyu: number | null): JourneyFigure => ({
  key,
  label: key,
  valueUyu,
  note: '',
})

describe('las cinco etapas', () => {
  it('no repite claves y va en el orden en que llegan los momentos', () => {
    expect(JOURNEY_STAGES.map(stage => stage.key)).toEqual([
      'decidir',
      'buscar',
      'firmar',
      'equipar',
      'vivir',
    ])
  })

  it('toda etapa hace una pregunta y tiene exactamente un destino principal', () => {
    for (const stage of JOURNEY_STAGES) {
      expect(stage.question, `${stage.key} sin pregunta`).toMatch(/\?/)
      expect(stage.links.length, `${stage.key} sin destinos`).toBeGreaterThan(2)
      const lead = stage.links.filter(link => link.lead)
      expect(lead.length, `${stage.key} tiene ${lead.length} destinos principales`).toBe(1)
    }
  })

  it('cada destino es una página que existe o un ancla de esta guía', () => {
    // Un hub que enlaza a una ruta inventada es peor que no tener hub: se ve bien y da 404.
    const guide = readFileSync(resolve(appRoot, 'pages/alquilar-en-uruguay.vue'), 'utf8')
    for (const stage of JOURNEY_STAGES) {
      for (const link of stage.links) {
        if (link.to.startsWith('#')) {
          expect(guide, `${link.to} no existe en la guía`).toContain(`id="${link.to.slice(1)}"`)
          continue
        }
        const slug = link.to.replace(/^\//, '')
        const direct = resolve(appRoot, `pages/${slug}.vue`)
        const asIndex = resolve(appRoot, `pages/${slug}/index.vue`)
        const exists = [direct, asIndex].some(candidate => {
          try {
            readFileSync(candidate)
            return true
          } catch {
            return false
          }
        })
        expect(exists, `${link.to} no tiene página`).toBe(true)
      }
    }
  })

  it('lleva al catálogo del hogar, que es la etapa que nadie presupuesta', () => {
    const equipar = JOURNEY_STAGES.find(stage => stage.key === 'equipar')!
    expect(equipar.links.some(link => link.to === '/equipar-casa-uruguay' && link.lead)).toBe(true)
  })
})

describe('la franja de números', () => {
  it('dice cuántas observaciones sostienen cada cifra', () => {
    const figures = journeyFigures({
      rentMedian: 28_000,
      rentCount: 23_717,
      expensesMedian: 4_322,
      expensesCount: 7_968,
      basketMinUyu: 17_661,
      basketComplete: true,
    })
    expect(figures.map(f => f.valueUyu)).toEqual([28_000, 4_322, 17_661])
    expect(figures[0]!.note).toContain('23.717')
    expect(figures[2]!.note).toContain('completa')
  })

  it('una cifra que no se pudo medir vuelve nula y lo dice', () => {
    const figures = journeyFigures({
      rentMedian: null,
      rentCount: 0,
      expensesMedian: 4_322,
      expensesCount: 10,
      basketMinUyu: null,
      basketComplete: false,
    })
    expect(figures[0]!.valueUyu).toBeNull()
    expect(figures[0]!.note).toBe('sin datos hoy')
  })
})

describe('el primer desembolso', () => {
  it('suma las tres partes cuando están las tres', () => {
    expect(journeyFirstOutlay([figure('a', 28_000), figure('b', 4_322), figure('c', 17_661)])).toBe(
      49_983
    )
  })

  it('NO suma a medias si falta una parte', () => {
    // Es la misma regla que las canastas: un total al que le falta una parte es más bajo que la
    // verdad y se lee como aliento.
    expect(
      journeyFirstOutlay([figure('a', 28_000), figure('b', null), figure('c', 17_661)])
    ).toBeNull()
  })
})
