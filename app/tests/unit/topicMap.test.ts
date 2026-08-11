import { describe, expect, it } from 'vitest'

import { classifyPost, TOPIC_DEFS } from '../../utils/redditTopics'
import {
  COVERAGE_COUNT,
  coverageCount,
  coverageStatus,
  hubFor,
  TOPIC_HUB,
} from '../../utils/topicMap'
import { getHub } from '../../utils/guideHubs'

const TOTAL = TOPIC_DEFS.length

/** El estado que /mapa-de-temas publica para un tema, sin depender del ranking de demanda. */
function statusAtBothRanks(topicId: string): string[] {
  const count = coverageCount(topicId)
  return [coverageStatus(count, 0, TOTAL), coverageStatus(count, TOTAL - 1, TOTAL)]
}

describe('topicMap › cada tema apunta a un hub real', () => {
  // Este test existe porque `derechos-reclamos` se agregó a TOPIC_DEFS y nadie lo agregó a
  // TOPIC_HUB: la tarjeta de oportunidad del mapa quedó sin ningún lugar a dónde mandar al lector.
  it('mapea todos los temas, sin dejar ninguno huérfano', () => {
    const huerfanos = TOPIC_DEFS.filter(t => !TOPIC_HUB[t.id]).map(t => t.id)
    expect(huerfanos).toEqual([])
  })

  it('resuelve cada hub mapeado a un hub existente con guías', () => {
    for (const t of TOPIC_DEFS) {
      const ref = hubFor(t.id)
      expect(ref, `el tema ${t.id} no resuelve a un hub`).not.toBeNull()
      expect(getHub(ref!.slug), `hub inexistente para ${t.id}`).toBeDefined()
      expect(ref!.guides).toBeGreaterThan(0)
    }
  })

  it('devuelve null para un tema desconocido', () => {
    expect(hubFor('tema-que-no-existe')).toBeNull()
  })
})

describe('topicMap › umbrales de cobertura', () => {
  it('clasifica por cantidad de guías y por demanda', () => {
    expect(coverageStatus(0, 0, 14)).toBe('gap')
    expect(coverageStatus(1, 13, 14)).toBe('gap')
    expect(coverageStatus(2, 0, 14)).toBe('gap') // alta demanda con 2 guías duele igual
    expect(coverageStatus(2, 13, 14)).toBe('oportunidad')
    expect(coverageStatus(3, 0, 14)).toBe('oportunidad')
    expect(coverageStatus(4, 0, 14)).toBe('cubierto')
  })
})

describe('topicMap › los dos temas que estaban flojos', () => {
  // «Derechos y reclamos» tenía UNA guía (despido) y ningún hub; «Sueldo y trabajo» tenía tres y
  // un matcher que ni siquiera reconocía las horas extra. Si alguien borra ese contenido o angosta
  // otra vez el matcher, el mapa vuelve a publicar un gap y esto lo avisa.
  it('derechos-reclamos quedó cubierto y con hub propio', () => {
    expect(COVERAGE_COUNT['derechos-reclamos']).toBeGreaterThanOrEqual(4)
    expect(statusAtBothRanks('derechos-reclamos')).toEqual(['cubierto', 'cubierto'])
    expect(hubFor('derechos-reclamos')?.slug).toBe('derechos-y-reclamos-uruguay')
  })

  it('sueldo-trabajo quedó cubierto', () => {
    expect(COVERAGE_COUNT['sueldo-trabajo']).toBeGreaterThanOrEqual(4)
    expect(statusAtBothRanks('sueldo-trabajo')).toEqual(['cubierto', 'cubierto'])
  })

  it('ningún tema monitoreado queda sin guías propias', () => {
    const sinGuias = TOPIC_DEFS.filter(t => coverageCount(t.id) === 0).map(t => t.id)
    expect(sinGuias).toEqual([])
  })
})

describe('redditTopics › el matcher de sueldo lee un recibo entero', () => {
  const esSueldo = (title: string) => classifyPost({ title }).includes('sueldo-trabajo')

  it('reconoce el léxico retributivo que antes se le escapaba', () => {
    expect(esSueldo('¿Cómo se pagan las horas extras el sábado?')).toBe(true)
    expect(esSueldo('Trabajé un feriado pago, ¿me tienen que pagar doble?')).toBe(true)
    expect(esSueldo('No me pagaron el salario vacacional')).toBe(true)
    expect(esSueldo('Soy jornalero y me descontaron un día')).toBe(true)
    expect(esSueldo('¿Cuándo sale el ajuste del consejo de salarios?')).toBe(true)
    expect(esSueldo('Estoy trabajando en negro hace dos años')).toBe(true)
  })

  it('sigue reconociendo lo de siempre', () => {
    expect(esSueldo('¿Cuánto es el sueldo líquido de 60 mil nominales?')).toBe(true)
    expect(esSueldo('Duda con el aguinaldo de diciembre')).toBe(true)
  })

  it('no se traga cualquier mención a un feriado', () => {
    expect(esSueldo('¿Abren los bancos el feriado del 18 de julio?')).toBe(false)
    expect(esSueldo('Recomienden una serie para el finde')).toBe(false)
  })
})

describe('redditTopics › los reclamos siguen en su tema', () => {
  it('manda un sueldo impago a derechos-reclamos', () => {
    expect(classifyPost({ title: 'Consulta laboral por sueldo impago y despido' })).toContain(
      'derechos-reclamos'
    )
  })
})
