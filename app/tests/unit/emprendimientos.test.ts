import { describe, expect, it } from 'vitest'
// La paridad vive en la suite del APP a propósito (como productosVidaParity): el app puede importar
// la raíz y la raíz no puede cargar app/. El job clasifica con classes/emprendimientos/taxonomy.ts y
// la página dibuja app/utils/emprendimientos.ts: un rubro renombrado de un solo lado deja sus
// cuentas sin página. `classes/emprendimientos/taxonomy.ts` y `handles.ts` están en `appContracts`
// de deploy.yml para que un cambio sólo del backend corra este test.
import { DEPARTAMENTOS, RUBROS } from '../../../classes/emprendimientos/taxonomy'
import { normalizeHandle, handleFromInstagramUrl } from '../../../classes/emprendimientos/handles'
import {
  EMPRENDIMIENTO_DEPARTAMENTOS,
  EMPRENDIMIENTO_RUBROS,
  activityTier,
  emprendimientosFiltered,
  emprendimientosQuery,
  emprendimientosStateFromQuery,
  followersLabel,
  handleFromInput,
  isJoyita,
  lastPostLabel,
  placeLabel,
  sortEmprendimientos,
} from '../../utils/emprendimientos'
import { filterRows, searchWords, toCard, type LightRow } from '../../server/utils/emprendimientos'

const NOW = Date.parse('2026-11-23T19:00:00Z')

describe('la taxonomía del job y la de la página son la misma', () => {
  it('mismos rubros, en el mismo orden y con el mismo nombre', () => {
    expect(EMPRENDIMIENTO_RUBROS.map(r => r.slug)).toEqual(RUBROS.map(r => r.slug))
    expect(EMPRENDIMIENTO_RUBROS.map(r => r.label)).toEqual(RUBROS.map(r => r.label))
  })

  it('mismos departamentos', () => {
    expect(EMPRENDIMIENTO_DEPARTAMENTOS).toEqual(DEPARTAMENTOS)
  })

  it('el handle que escribe una persona se normaliza igual que el que lee el job', () => {
    for (const raw of [
      '@Mondo.Popup',
      'luperouy',
      'rito__uy',
      'p',
      'explore',
      'cuenta.',
      '12345',
      'a..b',
    ]) {
      expect(handleFromInput(raw), raw).toBe(normalizeHandle(raw))
    }
    const url = 'https://www.instagram.com/gildedlayer?igsh=MWExaHc1&utm_source=qr'
    expect(handleFromInput(url)).toBe(handleFromInstagramUrl(url))
  })
})

describe('los filtros viven en la URL', () => {
  it('lee la query, descarta lo que no existe y la vuelve a escribir sin lo que vale por defecto', () => {
    const state = emprendimientosStateFromQuery({
      rubro: 'comida',
      depto: 'narnia',
      q: '  tortas   Pocitos ',
      orden: 'x',
      solo: '1',
      pagina: '3',
    })
    expect(state).toEqual({
      rubro: 'comida',
      depto: null,
      q: 'tortas Pocitos',
      orden: 'descubrir',
      solo: true,
      raros: false,
      pagina: 3,
    })
    expect(emprendimientosQuery(state)).toEqual({
      rubro: 'comida',
      q: 'tortas Pocitos',
      solo: '1',
      pagina: '3',
    })
    // En la página de un rubro, el rubro va en la ruta y no en la query.
    expect(emprendimientosQuery(state, true)).not.toHaveProperty('rubro')
    expect(emprendimientosFiltered(emprendimientosStateFromQuery({}))).toBe(false)
    expect(
      emprendimientosFiltered(emprendimientosStateFromQuery({ orden: 'nuevos', pagina: '2' }))
    ).toBe(false)
    expect(emprendimientosFiltered(emprendimientosStateFromQuery({ depto: 'salto' }))).toBe(true)
  })
})

const row = (handle: string, over: Partial<LightRow> = {}): LightRow => ({
  handle,
  rubro: 'comida',
  departamento: 'montevideo',
  soloInstagram: true,
  raro: false,
  listedAt: '2026-11-01T00:00:00Z',
  lastPostAt: '2026-11-20',
  followers: 1000,
  search: `${handle} tortas`,
  ...over,
})

describe('orden y destacados', () => {
  it('"descubrir" es el mismo orden todo el día y pone primero a las activas', () => {
    const rows = [row('vieja', { lastPostAt: '2025-01-01' }), row('b'), row('c'), row('d')]
    const a = sortEmprendimientos(rows, 'descubrir', '2026-11-23', NOW).map(r => r.handle)
    const b = sortEmprendimientos([...rows].reverse(), 'descubrir', '2026-11-23', NOW).map(
      r => r.handle
    )
    expect(a).toEqual(b)
    expect(a.at(-1)).toBe('vieja')
    expect(activityTier('2026-11-20', NOW)).toBe(0)
    expect(activityTier(null, NOW)).toBe(2)
  })

  it('los otros órdenes', () => {
    const rows = [
      row('a', { followers: 5000, listedAt: '2026-11-02' }),
      row('b', { followers: 100, listedAt: '2026-11-03', lastPostAt: '2026-10-01' }),
    ]
    expect(sortEmprendimientos(rows, 'chicos', 'd', NOW).map(r => r.handle)).toEqual(['b', 'a'])
    expect(sortEmprendimientos(rows, 'nuevos', 'd', NOW).map(r => r.handle)).toEqual(['b', 'a'])
    expect(sortEmprendimientos(rows, 'activos', 'd', NOW).map(r => r.handle)).toEqual(['a', 'b'])
  })

  it('una joyita es chica y activa', () => {
    expect(isJoyita({ followers: 800, lastPostAt: '2026-11-20' }, NOW)).toBe(true)
    expect(isJoyita({ followers: 8000, lastPostAt: '2026-11-20' }, NOW)).toBe(false)
    expect(isJoyita({ followers: 800, lastPostAt: '2026-06-01' }, NOW)).toBe(false)
  })
})

describe('facetas', () => {
  const rows = [
    row('a'),
    row('b', { rubro: 'ropa', departamento: 'salto' }),
    row('c', { rubro: 'ropa', soloInstagram: false, raro: true, search: 'c remeras pocitos' }),
  ]

  it('cada faceta se cuenta con los demás filtros puestos', () => {
    const { matched, facets } = filterRows(rows, emprendimientosStateFromQuery({ rubro: 'ropa' }))
    expect(matched.map(r => r.handle)).toEqual(['b', 'c'])
    // El chip de "comida" sigue diciendo cuántas hay en comida aunque el filtro sea ropa.
    expect(facets.rubros).toEqual({ comida: 1, ropa: 2 })
    expect(facets.departamentos).toEqual({ salto: 1, montevideo: 1 })
    expect(facets.soloInstagram).toBe(1)
    expect(facets.raros).toBe(1)
  })

  it('la búsqueda exige todas las palabras, sin tildes', () => {
    expect(searchWords('Remeras  Pócitos!')).toEqual(['remeras', 'pocitos'])
    expect(
      filterRows(rows, emprendimientosStateFromQuery({ q: 'Remeras Pócitos' })).matched.map(
        r => r.handle
      )
    ).toEqual(['c'])
  })
})

describe('tarjeta pública', () => {
  it('no sirve una foto con la firma vencida', () => {
    const live = 'https://x.cdninstagram.com/a.jpg?oe=6B0A4896' // 2026-11-28
    const dead = 'https://x.cdninstagram.com/b.jpg?oe=6A000000' // 2026-05
    const card = toCard(
      {
        handle: 'a',
        name: 'A',
        summary: 's',
        rubro: 'comida',
        tags: [],
        departamento: null,
        barrio: null,
        envios: 'local',
        ofrece: 'productos',
        raro: false,
        soloInstagram: true,
        website: null,
        whatsapp: false,
        followers: 10,
        profilePic: dead,
        posts: [
          { code: 'x1', reel: false, date: null, image: dead },
          { code: 'x2', reel: false, date: null, image: live },
        ],
        lastPostAt: null,
        postsLast90: 0,
        sources: [],
        listedAt: 'l',
        readAt: 'r',
        photosExpireAt: null,
        search: '',
      },
      NOW
    )
    expect(card.profilePic).toBeNull()
    expect(card.posts.map(p => p.code)).toEqual(['x2'])
  })
})

describe('textos', () => {
  it('seguidores, última publicación y lugar', () => {
    expect(followersLabel(1313)).toBe('1.313 seguidores')
    expect(followersLabel(15721)).toBe('15,7 mil seguidores')
    expect(followersLabel(null)).toBeNull()
    expect(lastPostLabel('2026-11-21', NOW)).toBe('publicó hace 2 días')
    expect(lastPostLabel('2026-09-03', NOW)).toBe('publicó por última vez el 3 de septiembre')
    expect(lastPostLabel('2025-01-08', NOW)).toBe('publicó por última vez en enero de 2025')
    expect(placeLabel({ barrio: 'Pocitos', departamento: 'montevideo' })).toBe(
      'Pocitos, Montevideo'
    )
    expect(placeLabel({ barrio: null, departamento: 'paysandu' })).toBe('Paysandú')
  })
})
