import { describe, expect, it } from 'vitest'
import {
  oppAgeLabel,
  buildOppsFilter,
  isRedditCommentUrl,
  parseOppsQuery,
  oppsSortOf,
  oppSubNoteOf,
  oppSuggestedUrl,
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
      limit: 60,
      sub: null,
      family: null,
      state: 'open',
      q: '',
      sort: 'rank',
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
      limit: 24,
      sub: 'AutosUy',
      family: 'autos',
      state: 'answered',
      q: 'onix',
      sort: 'new',
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
    expect(buildOppsFilter(q, 'sub')).not.toHaveProperty('sub')
    expect(buildOppsFilter(q, 'sub')).toHaveProperty('family', 'autos')
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
    expect(oppSubNoteOf('LegalUruguay')).toContain('Borró en silencio')
    expect(oppSubNoteOf('Burises')).toBeNull()
  })
})
