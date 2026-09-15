// El amarre entre la página de giros y el catálogo que la sostiene.
//
// `remittanceAgents.ts` no investiga: transcribe. Cada fila afirma que una casa
// dijo algo y que ese algo está en una URL. Si eso no se verifica contra
// `CASAS_REPUTATION`, la transcripción es una copia que se despega en silencio:
// alguien reescribe la línea de `services` de una casa, o le corrige una fuente,
// y la página sigue publicando la cita vieja con un enlace que ya no la
// contiene. El daño no es un test en rojo — es una página que le dice a alguien
// que vaya a cobrar un giro a un mostrador que no los paga.
//
// Por eso las dos comprobaciones centrales son textuales: la cita tiene que
// aparecer LITERAL en alguna de las listas de esa casa, y la fuente tiene que
// estar entre las fuentes de esa misma casa.

import { describe, expect, it } from 'vitest'

import { CASAS_REPUTATION } from '../../utils/casasDirectory'
import {
  REMITTANCE_CLAIMS,
  REMITTANCE_RESEARCHED_ON,
  casaName,
  remittanceCounts,
  remittanceEntries,
} from '../../utils/remittanceAgents'

const byCode = new Map(CASAS_REPUTATION.map(casa => [casa.code, casa]))

describe('cada afirmación sale del catálogo y no de acá', () => {
  it('nombra sólo casas que el catálogo investigó', () => {
    const unknown = REMITTANCE_CLAIMS.filter(claim => !byCode.has(claim.code)).map(c => c.code)
    expect(unknown).toEqual([])
  })

  it('no repite una casa', () => {
    const codes = REMITTANCE_CLAIMS.map(claim => claim.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it.each(REMITTANCE_CLAIMS.map(claim => [claim.code, claim] as const))(
    '%s cita una línea que el catálogo dice textualmente',
    (_code, claim) => {
      const casa = byCode.get(claim.code)!
      const said = [...casa.services, ...casa.strengths, ...casa.weaknesses]
      expect(said).toContain(claim.quote)
    }
  )

  it.each(REMITTANCE_CLAIMS.map(claim => [claim.code, claim] as const))(
    '%s enlaza una fuente que el catálogo ya declara para esa casa',
    (_code, claim) => {
      const casa = byCode.get(claim.code)!
      const urls = [...casa.sources, ...casa.press].map(ref => ref.url)
      expect(urls).toContain(claim.source)
    }
  )
})

describe('los veredictos no se contradicen', () => {
  it('sólo nombra una red cuando afirma que la hay', () => {
    // Un `network` colgado de un "no declara" publicaría a esa casa en el grupo
    // equivocado con su propia desmentida como cita.
    const wrong = REMITTANCE_CLAIMS.filter(
      claim => claim.network !== null && claim.verdict !== 'agente' && claim.verdict !== 'archivado'
    )
    expect(wrong).toEqual([])
  })

  it('todo agente vigente nombra su red', () => {
    const nameless = REMITTANCE_CLAIMS.filter(c => c.verdict === 'agente' && c.network === null)
    expect(nameless).toEqual([])
  })

  it('no mete evidencia archivada entre los agentes vigentes', () => {
    // La distinción que le ahorra el viaje a alguien: "lo hace" y "lo hacía" no
    // pueden caer en la misma lista.
    const agents = remittanceEntries('agente').map(entry => entry.code)
    expect(agents).not.toContain('cambio_argentino')
    expect(remittanceEntries('archivado').map(e => e.code)).toEqual(['cambio_argentino'])
  })

  it('nunca publica una comisión, una tasa ni un tipo de cambio', () => {
    // Los precios de un giro los fija la red por corredor y no hay fuente propia
    // que los sostenga. La guarda es textual porque el error entra como una cita
    // copiada de más, no como una decisión.
    const money = /US\$|\bUSD\b|\$\s?\d|\d\s?%|comisi[óo]n de \d/i
    const offenders = REMITTANCE_CLAIMS.filter(claim => money.test(claim.quote)).map(c => c.code)
    expect(offenders).toEqual([])
  })
})

describe('lo que la página muestra', () => {
  it('resuelve el nombre comercial contra el catálogo', () => {
    expect(casaName('gales')).toBe('Cambio Gales')
    expect(casaName('no_existe')).toBe('no_existe')
  })

  it('ordena alfabéticamente y enlaza al hub de cada casa', () => {
    const entries = remittanceEntries('agente')
    expect(entries.length).toBeGreaterThan(0)
    const names = entries.map(entry => entry.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')))
    for (const entry of entries) expect(entry.path).toBe(`/casa/${entry.code}`)
  })

  it('cuenta los grupos sin dejar ninguna afirmación afuera', () => {
    const counts = remittanceCounts()
    expect(counts.agents).toBe(counts.westernUnion + counts.moneyGram)
    expect(counts.agents + counts.international + counts.declines + counts.archived).toBe(
      REMITTANCE_CLAIMS.length
    )
    expect(counts.silent).toBe(counts.researched - REMITTANCE_CLAIMS.length)
    expect(counts.silent).toBeGreaterThanOrEqual(0)
  })

  it('publica la fecha en que se investigó', () => {
    expect(REMITTANCE_RESEARCHED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
