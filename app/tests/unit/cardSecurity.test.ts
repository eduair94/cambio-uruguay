// app/tests/unit/cardSecurity.test.ts
import { describe, expect, it } from 'vitest'

import {
  CARD_COMMUNITY_CLAIMS,
  CARD_MYTHS,
  CARD_SECURITY_FAQ,
  CARD_SECURITY_GAPS,
  CARD_SECURITY_LAST_REVIEWED,
  CLAIM_VERDICT_LABELS,
  CLONING_VECTORS,
  CONTROL_LABELS,
  CONTROL_WEIGHTS,
  controlCoverage,
  FIRST_HOUR,
  ISSUERS,
  rankIssuers,
  scoreIssuer,
  STATE_FACTOR,
  STATE_LABELS,
  type ControlId,
  type Issuer,
} from '../../utils/cardSecurity'

const CONTROL_IDS = Object.keys(CONTROL_WEIGHTS) as ControlId[]

describe('integridad de los datos', () => {
  it('la fecha de revisión es una fecha ISO', () => {
    expect(CARD_SECURITY_LAST_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('los ids de emisor no se repiten', () => {
    const ids = ISSUERS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todo emisor declara las cinco casillas del cuadro', () => {
    for (const issuer of ISSUERS) {
      for (const id of CONTROL_IDS) {
        expect(issuer.controls[id], `${issuer.id}.${id}`).toBeDefined()
      }
    }
  })

  /**
   * La regla de la casa: si no hay fuente, no se publica. Aplica también —y
   * sobre todo— a las casillas que dicen "sin publicar": ahí la fuente es la
   * página donde se fue a buscar y no estaba.
   */
  it('cada casilla lleva al menos una fuente con URL', () => {
    for (const issuer of ISSUERS) {
      for (const id of CONTROL_IDS) {
        const control = issuer.controls[id]
        expect(control.sources.length, `${issuer.id}.${id} sin fuente`).toBeGreaterThan(0)
        for (const source of control.sources) {
          expect(source.url, `${issuer.id}.${id}`).toMatch(/^https:\/\//)
          expect(source.label.length).toBeGreaterThan(3)
        }
      }
    }
  })

  it('cada emisor publica un canal para bloquear, con su fuente', () => {
    for (const issuer of ISSUERS) {
      expect(issuer.report.length, issuer.id).toBeGreaterThan(5)
      expect(issuer.reportSource.url, issuer.id).toMatch(/^https:\/\//)
    }
  })

  it('ninguna casilla "sin publicar" se disfraza de dato: siempre dice que no figura', () => {
    for (const issuer of ISSUERS) {
      for (const id of CONTROL_IDS) {
        const control = issuer.controls[id]
        if (control.state !== 'sin-publicar') continue
        expect(control.detail, `${issuer.id}.${id}`).toMatch(/no figura|no aparece|no se cuenta/i)
      }
    }
  })

  it('las citas textuales van entre comillas, para no confundirlas con nuestra redacción', () => {
    for (const issuer of ISSUERS) {
      for (const id of CONTROL_IDS) {
        const quote = issuer.controls[id].quote
        if (!quote) continue
        expect(quote.startsWith('"'), `${issuer.id}.${id}`).toBe(true)
        expect(quote.endsWith('"'), `${issuer.id}.${id}`).toBe(true)
      }
    }
  })

  it('hay etiqueta visible para cada control y cada estado', () => {
    for (const id of CONTROL_IDS) expect(CONTROL_LABELS[id]).toBeTruthy()
    for (const state of Object.keys(STATE_FACTOR)) {
      expect(STATE_LABELS[state as keyof typeof STATE_LABELS]).toBeTruthy()
    }
  })
})

describe('vectores', () => {
  it('todo vector dice qué datos necesita, qué lo frena y qué no', () => {
    for (const vector of CLONING_VECTORS) {
      expect(vector.needs.length, vector.id).toBeGreaterThan(20)
      expect(vector.stops.length, vector.id).toBeGreaterThan(0)
      expect(vector.doesNotStop.length, vector.id).toBeGreaterThan(0)
      expect(vector.sources.length, vector.id).toBeGreaterThan(0)
    }
  })

  /**
   * El orden del cuadro es el del peso: si un vector residual o teórico quedara
   * arriba, la página estaría contando la película al revés de lo que mide.
   */
  it('los vectores están ordenados de más a menos peso', () => {
    const order = { dominante: 0, frecuente: 1, residual: 2, teorico: 3 } as const
    const weights = CLONING_VECTORS.map(v => order[v.weight])
    expect(weights).toEqual([...weights].sort((a, b) => a - b))
  })

  it('el vector dominante es el del número usado sin la tarjeta', () => {
    const first = CLONING_VECTORS[0]
    expect(first?.weight).toBe('dominante')
    expect(first?.needs).toMatch(/n[úu]mero/i)
  })
})

describe('puntaje', () => {
  it('un emisor con todo resuelto da 100 y uno sin nada da 0', () => {
    const base = ISSUERS[0] as Issuer
    const all = (state: 'si' | 'no'): Issuer => ({
      ...base,
      id: `test-${state}`,
      controls: Object.fromEntries(
        CONTROL_IDS.map(id => [id, { ...base.controls[id], state }])
      ) as Issuer['controls'],
    })
    expect(scoreIssuer(all('si')).score).toBe(100)
    expect(scoreIssuer(all('no')).score).toBe(0)
  })

  it('los pesos suman 100, así que el puntaje es directamente un porcentaje', () => {
    const total = CONTROL_IDS.reduce((acc, id) => acc + CONTROL_WEIGHTS[id], 0)
    expect(total).toBe(100)
  })

  /**
   * El aviso por compra pesa más que la billetera a propósito: la billetera
   * protege el canal presencial, que es el que menos aparece en el fraude local.
   * Si alguna vez se invierte, el cuadro premia el control equivocado.
   */
  it('el aviso pesa más que la billetera', () => {
    expect(CONTROL_WEIGHTS.aviso).toBeGreaterThan(CONTROL_WEIGHTS.billetera)
  })

  it('un control pago no vale lo mismo que uno incluido', () => {
    expect(STATE_FACTOR.pago).toBeLessThan(STATE_FACTOR.si)
    expect(STATE_FACTOR.pago).toBeGreaterThan(STATE_FACTOR.no)
  })

  it('"sin publicar" no puntúa, y queda contado aparte', () => {
    expect(STATE_FACTOR['sin-publicar']).toBe(0)
    const brou = ISSUERS.find(i => i.id === 'brou') as Issuer
    expect(scoreIssuer(brou).unpublished).toBeGreaterThan(0)
  })

  it('el ranking ordena de mayor a menor y desempata por casillas publicadas', () => {
    const ranked = rankIssuers()
    expect(ranked.length).toBe(ISSUERS.length)
    for (let i = 1; i < ranked.length; i += 1) {
      const prev = ranked[i - 1]!
      const cur = ranked[i]!
      expect(prev.score).toBeGreaterThanOrEqual(cur.score)
      if (prev.score === cur.score) {
        expect(prev.unpublished).toBeLessThanOrEqual(cur.unpublished)
      }
    }
  })

  it('el control más flojo que reporta el puntaje es uno de los cinco', () => {
    for (const score of rankIssuers()) {
      if (score.score === 100) {
        expect(score.weakest).toBeNull()
      } else {
        expect(CONTROL_IDS).toContain(score.weakest)
      }
    }
  })

  it('la cobertura por control cuenta todos los emisores, sin perder ninguno', () => {
    for (const id of CONTROL_IDS) {
      const cov = controlCoverage(id)
      expect(cov.total).toBe(ISSUERS.length)
      expect(cov.full + cov.partial + cov.unpublished).toBeLessThanOrEqual(cov.total)
    }
  })
})

describe('hallazgos que la página afirma', () => {
  /**
   * Estas tres aserciones son el contrato con el lector. Si un emisor cambia su
   * política y el dato se actualiza, el test falla y el texto de la página se
   * revisa junto con el dato — que es exactamente lo que tiene que pasar.
   */
  /**
   * La versión anterior de este test exigía `pago`, y ese era justo el error que
   * el hilo nos marcó: en BROU el aviso por compra existe y es gratis, lo pago
   * es el SMS que agrega las compras autenticadas. El test se da vuelta con el
   * dato para que nadie pueda volver al titular viejo sin romperlo.
   */
  it('en BROU el aviso gratuito existe, y lo pago es sólo el tramo que falta', () => {
    const brou = ISSUERS.find(i => i.id === 'brou') as Issuer
    expect(brou.controls.aviso.state).toBe('parcial')
    expect(brou.controls.aviso.detail).toMatch(/gratis|gratuito/i)
    expect(brou.controls.aviso.detail).toMatch(/\$ ?75/)
    expect(brou.controls.aviso.detail).toMatch(/PIN/)
  })

  it('OCA publica un tope diario, aunque el titular no lo pueda mover', () => {
    const oca = ISSUERS.find(i => i.id === 'oca') as Issuer
    expect(oca.controls.limites.state).toBe('parcial')
    expect(oca.controls.limites.quote).toMatch(/20\.000/)
  })

  it('Midinero es el único que publica topes por canal ajustables', () => {
    const withLimits = ISSUERS.filter(i => i.controls.limites.state === 'si')
    expect(withLimits.map(i => i.id)).toEqual(['midinero'])
  })

  it('Mercado Pago es el que responde a la pregunta de la cinta: sin datos impresos', () => {
    const mp = ISSUERS.find(i => i.id === 'mercadopago') as Issuer
    expect(mp.controls.virtual.state).toBe('si')
    expect(mp.controls.virtual.detail).toMatch(/sin datos impresos/i)
  })

  it('BROU queda sin Apple Pay, que es la duda del hilo que originó la página', () => {
    const brou = ISSUERS.find(i => i.id === 'brou') as Issuer
    expect(brou.controls.billetera.state).toBe('parcial')
    expect(brou.controls.billetera.detail).toMatch(/Apple Pay no/i)
  })
})

describe('mitos', () => {
  it('cada mito trae veredicto, motivo y una alternativa concreta', () => {
    for (const myth of CARD_MYTHS) {
      expect(myth.claim.length, myth.id).toBeGreaterThan(10)
      expect(myth.why.length, myth.id).toBeGreaterThan(40)
      expect(myth.instead.length, myth.id).toBeGreaterThan(20)
      expect(myth.sources.length, myth.id).toBeGreaterThan(0)
    }
  })

  it('la cinta negra está contestada, porque es la pregunta textual del hilo', () => {
    const cinta = CARD_MYTHS.find(m => m.id === 'cinta-negra')
    expect(cinta?.verdict).toBe('no-sirve')
  })

  it('la banda magnética queda como "es al revés", no como mito neutro', () => {
    expect(CARD_MYTHS.find(m => m.id === 'banda-vieja')?.verdict).toBe('al-reves')
  })
})

describe('lo que discutió la comunidad', () => {
  it('cada afirmación trae lo que se dijo, lo que encontramos y la fuente', () => {
    for (const claim of CARD_COMMUNITY_CLAIMS) {
      expect(claim.said.length, claim.id).toBeGreaterThan(30)
      expect(claim.found.length, claim.id).toBeGreaterThan(80)
      expect(claim.sources.length, claim.id).toBeGreaterThan(0)
      for (const source of claim.sources) expect(source.url, claim.id).toMatch(/^https:\/\//)
      expect(CLAIM_VERDICT_LABELS[claim.verdict], claim.id).toBeTruthy()
    }
  })

  it('los ids no se repiten', () => {
    const ids = CARD_COMMUNITY_CLAIMS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  /**
   * La sección existe para publicar la corrección que nos hicieron, no para
   * exhibir sólo las que ganamos. Si algún día quedaran únicamente veredictos
   * que nos dan la razón, la sección dejó de hacer lo que dice que hace.
   */
  it('incluye al menos una corrección contra la propia página', () => {
    const brou = CARD_COMMUNITY_CLAIMS.find(c => c.id === 'brou-avisa-todo')
    expect(brou?.verdict).toBe('confirmado')
    expect(brou?.found).toMatch(/esta p[áa]gina/i)
  })

  it('lo que no se pudo contrastar queda etiquetado como tal, no borrado', () => {
    const unverified = CARD_COMMUNITY_CLAIMS.filter(c => c.verdict === 'sin-verificar')
    expect(unverified.length).toBeGreaterThan(0)
    for (const claim of unverified) {
      expect(claim.found, claim.id).toMatch(
        /no (se puede|encontramos|hay|puede)|no publica|ning[úu]n emisor/i
      )
    }
  })

  it('las citas de la gente van entre comillas angulares, separadas de nuestra voz', () => {
    for (const claim of CARD_COMMUNITY_CLAIMS) {
      expect(claim.said.includes('«'), claim.id).toBe(true)
      expect(claim.said.includes('»'), claim.id).toBe(true)
    }
  })
})

describe('advertencias por emisor', () => {
  it('toda nota lleva texto y fuente con URL', () => {
    for (const issuer of ISSUERS) {
      if (!issuer.note) continue
      expect(issuer.note.text.length, issuer.id).toBeGreaterThan(60)
      expect(issuer.note.sources.length, issuer.id).toBeGreaterThan(0)
      for (const source of issuer.note.sources) {
        expect(source.url, issuer.id).toMatch(/^https:\/\//)
      }
    }
  })

  it('Scotiabank advierte lo de la Amex, que es el único emisor que la tiene', () => {
    const scotia = ISSUERS.find(i => i.id === 'scotiabank') as Issuer
    expect(scotia.note?.text).toMatch(/frente/i)
  })
})

describe('primera hora', () => {
  it('el primer paso es bloquear, que es el que fija la responsabilidad', () => {
    expect(FIRST_HOUR[0]?.id).toBe('bloquear')
  })

  it('cada paso tiene fuente, y alguna es norma', () => {
    for (const step of FIRST_HOUR) {
      expect(step.sources.length, step.id).toBeGreaterThan(0)
    }
    const kinds = FIRST_HOUR.flatMap(s => s.sources.map(src => src.kind))
    expect(kinds).toContain('norma')
  })

  it('el paso de la denuncia distingue lo que pide el emisor de lo que pide la ley', () => {
    const denuncia = FIRST_HOUR.find(s => s.id === 'denuncia')
    expect(denuncia?.detail).toMatch(/La ley no pone ese requisito/i)
  })
})

describe('honestidad', () => {
  it('los huecos se publican, y dicen que no hay estadística pública', () => {
    expect(CARD_SECURITY_GAPS.length).toBeGreaterThanOrEqual(3)
    expect(CARD_SECURITY_GAPS.join(' ')).toMatch(/no existe una estad[íi]stica p[úu]blica/i)
  })

  it('el FAQ no repite ids y contesta las cuatro preguntas del hilo', () => {
    const ids = CARD_SECURITY_FAQ.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ['sirve-la-cinta', 'como-clonan', 'filtracion-del-banco', 'sin-apple-pay']) {
      expect(ids, id).toContain(id)
    }
  })

  it('ninguna respuesta del FAQ es un titular sin contenido', () => {
    for (const item of CARD_SECURITY_FAQ) {
      expect(item.answer.length, item.id).toBeGreaterThan(120)
      expect(item.question.endsWith('?'), item.id).toBe(true)
    }
  })
})
