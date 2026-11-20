import { describe, expect, it } from 'vitest'
import {
  oppAgeLabel,
  buildOppsFilter,
  isRedditCommentUrl,
  parseOppsQuery,
  oppsSortOf,
  oppSubNoteOf,
  oppSuggestedUrl,
  freshSinceOf,
  isFreshOpp,
  OPP_PUBLIC_PROJECTION,
  toPublicOpp,
  type OppItem,
} from '../../utils/redditOpportunities'

describe('redditOpportunities — query', () => {
  it('acota todo lo que viene de afuera', () => {
    const q = parseOppsQuery({
      page: '-3',
      limit: '999',
      sort: 'x',
      state: 'zzz',
      sub: 'r/../x',
      family: 'nada',
    })
    expect(q).toEqual({
      page: 1,
      offset: null,
      limit: 60,
      sub: null,
      family: null,
      state: 'open',
      q: '',
      sort: 'rank',
      fresh: false,
    })
  })

  it('lee una query válida', () => {
    const q = parseOppsQuery({
      page: '3',
      limit: '24',
      sort: 'new',
      state: 'answered',
      sub: 'AutosUy',
      family: 'autos',
      q: ' onix ',
    })
    expect(q).toEqual({
      page: 3,
      offset: null,
      limit: 24,
      sub: 'AutosUy',
      family: 'autos',
      state: 'answered',
      q: 'onix',
      sort: 'new',
      fresh: false,
    })
  })

  it('pendientes = abiertos, vivos y sin el sitio enlazado, sin duplicados', () => {
    const f = buildOppsFilter(parseOppsQuery({}))
    expect(f).toMatchObject({
      verdict: 'recommend',
      state: 'open',
      locked: false,
      removed: false,
      alreadyLinked: { $ne: true },
      duplicateOf: { $in: ['', null] },
    })
    expect((f.confidence as { $gte: number }).$gte).toBe(0.7)
  })

  it('"todos" no filtra por estado, y la faceta omite su propia dimensión', () => {
    expect(buildOppsFilter(parseOppsQuery({ state: 'all' }))).not.toHaveProperty('state')
    const q = parseOppsQuery({ sub: 'uruguay', family: 'autos' })
    expect(buildOppsFilter(q, { omit: 'sub' })).not.toHaveProperty('sub')
    expect(buildOppsFilter(q, { omit: 'sub' })).toHaveProperty('family', 'autos')
  })

  it('el offset gana sobre la página, y se acota', () => {
    expect(parseOppsQuery({ page: '2', offset: '21' })).toMatchObject({ page: 2, offset: 21 })
    expect(parseOppsQuery({ offset: '-4' }).offset).toBeNull()
    expect(parseOppsQuery({ offset: '999999' }).offset).toBe(30_000)
  })

  it('no muestra hilos fuera de la ventana de 30 días del job', () => {
    const now = Date.UTC(2026, 9, 28)
    const f = buildOppsFilter(parseOppsQuery({ state: 'all' }), { now })
    expect((f.createdAt as { $gte: Date }).$gte.toISOString()).toBe('2026-09-28T00:00:00.000Z')
  })

  it('escapa la búsqueda', () => {
    const f = buildOppsFilter(parseOppsQuery({ q: 'a.b(c' }))
    const or = f.$or as Array<Record<string, { $regex: string }>>
    expect(or[0]!.title!.$regex).toBe('a\\.b\\(c')
  })

  it('ordena con desempate estable', () => {
    expect(oppsSortOf('rank')).toEqual({ rank: -1, createdAt: -1, postId: 1 })
    expect(Object.keys(oppsSortOf('comments'))[0]).toBe('numComments')
  })
})

describe('redditOpportunities — card', () => {
  const now = Date.UTC(2026, 9, 28, 12)

  it('dice la antigüedad', () => {
    expect(oppAgeLabel(new Date(now - 3 * 3_600_000), now)).toBe('hace 3 h')
    expect(oppAgeLabel(new Date(now - 2 * 86_400_000), now)).toBe('hace 2 días')
    expect(oppAgeLabel(new Date(now - 30 * 60_000), now)).toBe('hace menos de 1 h')
  })

  it('el enlace en inglés sólo si la página existe en inglés', () => {
    expect(oppSuggestedUrl({ path: '/alquileres-uruguay', lang: 'es' })).toBe(
      'https://cambio-uruguay.com/alquileres-uruguay'
    )
    expect(oppSuggestedUrl({ path: '/pagina-que-no-existe', lang: 'en' })).toBe(
      'https://cambio-uruguay.com/pagina-que-no-existe'
    )
    expect(oppSuggestedUrl({ path: '/sillas-escritorio-uruguay/precios', lang: 'en' })).toBe(
      'https://cambio-uruguay.com/en/sillas-escritorio-uruguay/precios'
    )
  })

  it('acepta el enlace a un comentario y rechaza el del hilo o uno corto', () => {
    expect(
      isRedditCommentUrl('https://www.reddit.com/r/uruguay/comments/abc123/titulo/kx9z1q/')
    ).toBe(true)
    expect(
      isRedditCommentUrl(
        'https://www.reddit.com/r/uruguay/comments/abc123/comment/kx9z1q/?context=3'
      )
    ).toBe(true)
    expect(isRedditCommentUrl('https://www.reddit.com/r/uruguay/comments/abc123/titulo/')).toBe(
      false
    )
    expect(isRedditCommentUrl('https://reddit.com/r/uruguay/s/AbCdEf')).toBe(false)
    expect(isRedditCommentUrl('https://evil.com/r/uruguay/comments/abc123/x/kx9z1q/')).toBe(false)
  })

  it('trae el aviso de cada sub sin importar mayúsculas', () => {
    expect(oppSubNoteOf('LegalUruguay')).toContain('borra en silencio')
    expect(oppSubNoteOf('Burises')).toBeNull()
  })

  it('los avisos públicos no cuentan la historia de la cuenta del bot', () => {
    // La página es pública: un aviso que dice "baneó a la cuenta del bot" ata el sitio a una cuenta
    // sancionada delante de cualquiera que la lea.
    for (const sub of ['uruguay', 'LegalUruguay', 'AskUruguayan', 'CharruaDevs']) {
      expect(oppSubNoteOf(sub)).not.toMatch(/bot|baneó|token|cuenta del/i)
    }
  })
})

describe('redditOpportunities — vista pública y lo nuevo del día', () => {
  const item = {
    postId: 'abc12',
    state: 'answered',
    stateAt: '2026-10-28T12:00:00.000Z',
    answerUrl: 'https://www.reddit.com/r/uruguay/comments/abc12/x/kx9z1q/',
    answerVisible: true,
    answerCheckedAt: '2026-10-29T12:00:00.000Z',
    judgedAt: '2026-10-28T10:21:00.000Z',
  } as unknown as OppItem

  it('la vista pública no trae nada de lo que marcó una persona', () => {
    const pub = toPublicOpp(item)
    expect(pub).toMatchObject({
      state: 'open',
      stateAt: null,
      answerUrl: '',
      answerVisible: null,
      answerCheckedAt: null,
    })
    for (const key of ['state', 'stateAt', 'answerUrl', 'answerVisible', 'answerCheckedAt']) {
      expect(OPP_PUBLIC_PROJECTION).not.toHaveProperty(key)
    }
    expect(OPP_PUBLIC_PROJECTION).toHaveProperty('title', 1)
    expect(OPP_PUBLIC_PROJECTION).toHaveProperty('judgedAt', 1)
  })

  it('"nuevo" es lo que entró en la última corrida', () => {
    expect(isFreshOpp(item, '2026-10-28T10:21:00.000Z')).toBe(true)
    expect(isFreshOpp(item, '2026-10-29T10:21:00.000Z')).toBe(false)
    expect(isFreshOpp(item, null)).toBe(false)
  })

  it('el filtro de nuevos sólo filtra con una corrida de referencia', () => {
    const q = parseOppsQuery({ fresh: '1' })
    expect(q.fresh).toBe(true)
    expect(buildOppsFilter(q)).not.toHaveProperty('judgedAt')
    const since = freshSinceOf('2026-10-28T10:21:00.000Z')!
    expect(buildOppsFilter(q, { freshSince: since })).toMatchObject({ judgedAt: { $gte: since } })
    expect(since.toISOString()).toBe('2026-10-28T10:20:00.000Z')
    expect(parseOppsQuery({ fresh: 'si' }).fresh).toBe(false)
  })
})
