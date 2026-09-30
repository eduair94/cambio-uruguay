import { describe, expect, it } from 'vitest'
import {
  USEFUL_APP_CATEGORIES,
  USEFUL_APP_KIND_LABELS,
  USEFUL_APPS_DEFAULT_STATE,
  type UsefulApp,
  usefulAppAppStoreUrl,
  usefulAppInitials,
  usefulAppKindMatches,
  usefulAppMatches,
  usefulAppPlayUrl,
  usefulAppsActiveFilterCount,
  usefulAppsCountLabel,
  usefulAppsDepartmentsIn,
  usefulAppsDetectPlatform,
  usefulAppsFilter,
  usefulAppsGroup,
  usefulAppsHrefForTab,
  usefulAppsQueryFromState,
  usefulAppsSort,
  usefulAppsStateFromQuery,
  usefulAppsTabCounts,
  usefulAppsTabCountsFor,
} from '../../utils/usefulApps'

const app = (over: Partial<UsefulApp>): UsefulApp => ({
  id: 'x',
  name: 'X',
  organization: 'Org',
  kind: 'estado',
  category: 'tramites',
  summary: 'Resumen de prueba.',
  uses: ['Consultá algo'],
  source: 'https://www.gub.uy/',
  ...over,
})

const UTE = app({
  id: 'ute',
  name: 'UTE Clientes',
  organization: 'UTE',
  kind: 'empresa-publica',
  category: 'hogar',
  summary: 'Pagá la luz y avisá si te quedaste sin luz.',
  uses: ['Mirá tu consumo'],
  keywords: ['luz', 'electricidad'],
  android: { id: 'uy.com.ute.customers', developer: 'UTE Sistemas' },
  ios: { id: '6472210207', developer: 'UTE' },
})
const COMO_IR = app({
  id: 'como-ir',
  name: 'Cómo ir',
  organization: 'Intendencia de Montevideo',
  kind: 'intendencia',
  category: 'transporte',
  summary: 'Planificá tu viaje en ómnibus.',
  keywords: ['omnibus', 'bondi', 'stm'],
  departments: ['Montevideo'],
  android: { id: 'uy.gub.imm.stm.mobile.comoir', developer: 'Intendencia de Montevideo' },
})
const STM = app({
  id: 'stm-montevideo',
  name: 'STM Montevideo',
  organization: 'Desarrollador independiente',
  kind: 'comunidad',
  category: 'transporte',
  departments: ['Montevideo'],
  officialAlternative: 'como-ir',
  ios: { id: '938009980', developer: 'Gabriel Yordi' },
})
const PEDIDOS = app({
  id: 'pedidosya',
  name: 'PedidosYa',
  organization: 'PedidosYa',
  kind: 'privada',
  category: 'compras',
  also: ['ocio'],
  android: { id: 'com.pedidosya', developer: 'PedidosYa S.A' },
})
const ALL = [UTE, COMO_IR, STM, PEDIDOS]
const ctx = { essentialIds: ['como-ir', 'ute'] }

describe('usefulApps — categorías y tipos', () => {
  it('declara diez categorías con ícono mdi y sin repetir id', () => {
    expect(USEFUL_APP_CATEGORIES).toHaveLength(10)
    expect(new Set(USEFUL_APP_CATEGORIES.map(c => c.id)).size).toBe(10)
    for (const c of USEFUL_APP_CATEGORIES) {
      expect(c.icon).toMatch(/^mdi-/)
      expect(c.label.length).toBeGreaterThan(3)
      expect(c.blurb.endsWith('.')).toBe(true)
    }
  })

  it('agrupa los tipos como los distingue la gente', () => {
    expect(USEFUL_APP_KIND_LABELS.comunidad).toBe('No oficial')
    expect(usefulAppKindMatches(UTE, 'publicas')).toBe(true)
    expect(usefulAppKindMatches(COMO_IR, 'publicas')).toBe(true)
    expect(usefulAppKindMatches(PEDIDOS, 'publicas')).toBe(false)
    expect(usefulAppKindMatches(PEDIDOS, 'privadas')).toBe(true)
    expect(usefulAppKindMatches(STM, 'privadas')).toBe(false)
    expect(usefulAppKindMatches(STM, 'no-oficiales')).toBe(true)
    expect(usefulAppKindMatches(STM, 'todas')).toBe(true)
  })

  it('arma los enlaces a las fichas oficiales', () => {
    expect(usefulAppPlayUrl('uy.com.ute.customers')).toBe(
      'https://play.google.com/store/apps/details?id=uy.com.ute.customers'
    )
    expect(usefulAppAppStoreUrl('6472210207')).toBe('https://apps.apple.com/uy/app/id6472210207')
  })

  it('saca las iniciales para el monograma', () => {
    expect(usefulAppInitials('Cómo ir')).toBe('CI')
    expect(usefulAppInitials('gub.uy')).toBe('GU')
    expect(usefulAppInitials('Prex')).toBe('PR')
    expect(usefulAppInitials('Ómnibus')).toBe('OM')
    expect(usefulAppInitials('+Cinemateca')).toBe('CI')
  })

  it('congela también cada categoría: son constantes compartidas entre pedidos del servidor', () => {
    expect(Object.isFrozen(USEFUL_APP_CATEGORIES)).toBe(true)
    expect(Object.isFrozen(USEFUL_APP_CATEGORIES[0])).toBe(true)
  })
})

describe('usefulApps — búsqueda', () => {
  it('ignora tildes, mayúsculas y el orden de las palabras', () => {
    expect(usefulAppMatches(COMO_IR, 'OMNIBUS')).toBe(true)
    expect(usefulAppMatches(COMO_IR, 'ómnibus montevideo')).toBe(true)
    expect(usefulAppMatches(COMO_IR, 'montevideo omnibus')).toBe(true)
  })

  it('no deja que las palabras vacías vacíen el resultado', () => {
    expect(usefulAppMatches(UTE, 'app de la luz')).toBe(true)
    expect(usefulAppMatches(UTE, 'aplicación para la luz en Uruguay')).toBe(true)
  })

  it('busca también en el desarrollador y la organización', () => {
    expect(usefulAppMatches(UTE, 'ute sistemas')).toBe(true)
    expect(usefulAppMatches(STM, 'yordi')).toBe(true)
  })

  it('una búsqueda vacía o de sólo palabras vacías deja pasar todo', () => {
    expect(usefulAppMatches(UTE, '')).toBe(true)
    expect(usefulAppMatches(UTE, '  la de  ')).toBe(true)
  })

  it('exige cada palabra con contenido', () => {
    expect(usefulAppMatches(UTE, 'luz agua')).toBe(false)
  })

  it('"oficial" no invierte el filtro: es una palabra vacía y el Tipo decide', () => {
    expect(usefulAppMatches(UTE, 'app oficial de la luz')).toBe(true)
    expect(usefulAppMatches(COMO_IR, 'oficial')).toBe(true)
    expect(usefulAppMatches(STM, 'oficial')).toBe(true)
  })

  it('busca por quién la hace con palabras que no se contradicen', () => {
    expect(usefulAppMatches(COMO_IR, 'estado')).toBe(true)
    expect(usefulAppMatches(UTE, 'estado')).toBe(true)
    expect(usefulAppMatches(PEDIDOS, 'estado')).toBe(false)
    expect(usefulAppMatches(STM, 'independiente')).toBe(true)
  })

  it('la etiqueta de la pestaña no arrastra apps que no tienen que ver', () => {
    const ANTEL = app({
      id: 'mi-antel',
      name: 'Mi Antel',
      organization: 'Antel',
      kind: 'empresa-publica',
      category: 'hogar',
      summary: 'Tu saldo y tus facturas de Antel.',
      uses: ['Consultá el saldo del celular'],
      keywords: ['antel', 'celular'],
    })
    expect(usefulAppMatches(ANTEL, 'luz')).toBe(false)
    expect(usefulAppMatches(COMO_IR, 'auto')).toBe(false)
  })

  it('una sigla corta es una palabra entera, no un pedazo de otra', () => {
    const COSEM = app({
      id: 'cosem',
      name: 'COSEM',
      organization: 'COSEM',
      kind: 'privada',
      category: 'salud',
      summary: 'Agendá consultas.',
      uses: ['Buscá un médico'],
      departments: ['San José'],
    })
    // "ose" estaba adentro de "cosem" y de "san jose"; "bus" adentro de "buscá".
    expect(usefulAppMatches(COSEM, 'ose')).toBe(false)
    expect(usefulAppMatches(COSEM, 'bus')).toBe(false)
    expect(usefulAppMatches(UTE, 'ute')).toBe(true)
    expect(usefulAppMatches(COMO_IR, 'stm')).toBe(true)
  })

  it('desde cuatro letras alcanza con el principio de una palabra', () => {
    expect(usefulAppMatches(COMO_IR, 'omni')).toBe(true)
    expect(usefulAppMatches(UTE, 'elect')).toBe(true)
    // …pero no con el medio: "tricidad" no es el principio de ninguna palabra.
    expect(usefulAppMatches(UTE, 'tricidad')).toBe(false)
  })

  it('corta también por la puntuación, así "9-1-1" y "gub.uy" se encuentran', () => {
    const EMERGENCIA = app({ id: 'e', name: 'Emergencia 9-1-1', keywords: ['911'] })
    const GUB = app({ id: 'g', name: 'gub.uy' })
    expect(usefulAppMatches(EMERGENCIA, '911')).toBe(true)
    expect(usefulAppMatches(EMERGENCIA, '9-1-1')).toBe(true)
    expect(usefulAppMatches(GUB, 'gub.uy')).toBe(true)
    expect(usefulAppMatches(GUB, 'gub')).toBe(true)
  })

  it('"estado" pide apps del Estado aunque una privada diga "estado de cuenta"', () => {
    const OCA = app({
      id: 'oca',
      name: 'OCA',
      kind: 'privada',
      category: 'dinero',
      uses: ['Mirá el estado de cuenta', 'Comprá en Estados Unidos'],
    })
    expect(usefulAppMatches(OCA, 'estado')).toBe(false)
    expect(usefulAppMatches(OCA, 'apps del estado')).toBe(false)
    expect(usefulAppMatches(UTE, 'gobierno')).toBe(true)
    expect(usefulAppMatches(OCA, 'cuenta')).toBe(true)
  })
})

describe('usefulApps — estado ↔ URL', () => {
  it('lee la URL con lista blanca, campo por campo', () => {
    const state = usefulAppsStateFromQuery({
      categoria: 'xxx',
      tipo: 'publicas',
      plataforma: 'blackberry',
      depto: 'Narnia',
      orden: 'az',
      q: 'a'.repeat(80),
    })
    expect(state.tab).toBe('todas')
    expect(state.tipo).toBe('publicas')
    expect(state.plataforma).toBe('todas')
    expect(state.depto).toBe('')
    expect(state.orden).toBe('az')
    expect(state.q).toHaveLength(60)
  })

  it('acepta arreglos (query repetida) tomando el primero', () => {
    expect(usefulAppsStateFromQuery({ categoria: ['salud', 'dinero'] }).tab).toBe('salud')
  })

  it('acepta un departamento con tilde, sin tilde o en otra caja, y devuelve el canónico', () => {
    expect(usefulAppsStateFromQuery({ depto: 'Paysandú' }).depto).toBe('Paysandú')
    expect(usefulAppsStateFromQuery({ depto: 'paysandu' }).depto).toBe('Paysandú')
    expect(usefulAppsStateFromQuery({ depto: 'rio negro' }).depto).toBe('Río Negro')
    expect(usefulAppsStateFromQuery({ depto: 'Narnia' }).depto).toBe('')
  })

  it('escribe sólo lo que difiere del default, así la URL limpia es la canónica', () => {
    expect(usefulAppsQueryFromState(USEFUL_APPS_DEFAULT_STATE)).toEqual({})
    expect(
      usefulAppsQueryFromState({ ...USEFUL_APPS_DEFAULT_STATE, tab: 'salud', q: '  asse ' })
    ).toEqual({ categoria: 'salud', q: 'asse' })
  })

  it('ida y vuelta sin pérdida', () => {
    const state = {
      tab: 'transporte',
      q: 'omnibus',
      tipo: 'publicas',
      plataforma: 'ios',
      depto: 'Montevideo',
      orden: 'recientes',
    } as const
    expect(usefulAppsStateFromQuery(usefulAppsQueryFromState(state))).toEqual(state)
  })

  it('cuenta los filtros activos sin contar la pestaña', () => {
    expect(usefulAppsActiveFilterCount({ ...USEFUL_APPS_DEFAULT_STATE, tab: 'salud' })).toBe(0)
    expect(
      usefulAppsActiveFilterCount({ ...USEFUL_APPS_DEFAULT_STATE, q: 'x', depto: 'Salto' })
    ).toBe(2)
    // El orden cuenta: vive en "Más filtros" y "Limpiar filtros" lo vuelve al default.
    expect(
      usefulAppsActiveFilterCount({
        ...USEFUL_APPS_DEFAULT_STATE,
        tipo: 'publicas',
        plataforma: 'ios',
        orden: 'az',
      })
    ).toBe(3)
  })

  it('arma el enlace de cada pestaña sobre la ruta base', () => {
    const base = '/apps-utiles-uruguay'
    expect(usefulAppsHrefForTab(base, USEFUL_APPS_DEFAULT_STATE, 'todas')).toBe(base)
    expect(usefulAppsHrefForTab(base, USEFUL_APPS_DEFAULT_STATE, 'salud')).toBe(
      `${base}?categoria=salud`
    )
  })
})

describe('usefulApps — filtro, orden y grupos', () => {
  it('la pestaña de categoría incluye las que la declaran en `also`', () => {
    const state = { ...USEFUL_APPS_DEFAULT_STATE, tab: 'ocio' as const }
    expect(usefulAppsFilter(ALL, state, ctx).map(a => a.id)).toEqual(['pedidosya'])
  })

  it('Imprescindibles sigue el orden del kit, no el del catálogo', () => {
    const state = { ...USEFUL_APPS_DEFAULT_STATE, tab: 'imprescindibles' as const }
    expect(usefulAppsFilter(ALL, state, ctx).map(a => a.id)).toEqual(['como-ir', 'ute'])
  })

  it('el departamento deja las nacionales y las de ese departamento', () => {
    const state = { ...USEFUL_APPS_DEFAULT_STATE, depto: 'Salto' as const }
    expect(usefulAppsFilter(ALL, state, ctx).map(a => a.id)).toEqual(['ute', 'pedidosya'])
  })

  it('la plataforma exige la ficha de esa tienda', () => {
    const state = { ...USEFUL_APPS_DEFAULT_STATE, plataforma: 'ios' as const }
    expect(usefulAppsFilter(ALL, state, ctx).map(a => a.id)).toEqual(['ute', 'stm-montevideo'])
  })

  it('el tipo y la búsqueda también filtran', () => {
    const publicas = { ...USEFUL_APPS_DEFAULT_STATE, tipo: 'publicas' as const }
    expect(usefulAppsFilter(ALL, publicas, ctx).map(a => a.id)).toEqual(['ute', 'como-ir'])
    const omnibus = { ...USEFUL_APPS_DEFAULT_STATE, q: 'omnibus' }
    expect(usefulAppsFilter(ALL, omnibus, ctx).map(a => a.id)).toEqual(['como-ir'])
  })

  it('ordena A–Z sin tildes y por actualización con las desconocidas al final', () => {
    expect(usefulAppsSort(ALL, 'az').map(a => a.id)).toEqual([
      'como-ir',
      'pedidosya',
      'stm-montevideo',
      'ute',
    ])
    const updated: Record<string, string> = { ute: '2026-06-04', 'como-ir': '2025-03-26' }
    expect(usefulAppsSort(ALL, 'recientes', a => updated[a.id] ?? null).map(a => a.id)).toEqual([
      'ute',
      'como-ir',
      'stm-montevideo',
      'pedidosya',
    ])
    expect(usefulAppsSort(ALL, 'utiles').map(a => a.id)).toEqual(ALL.map(a => a.id))
  })

  it('agrupa por categoría principal en el orden de las pestañas, sin repetir', () => {
    const groups = usefulAppsGroup(ALL)
    expect(groups.map(g => g.category.id)).toEqual(['transporte', 'hogar', 'compras'])
    expect(groups.reduce((n, g) => n + g.apps.length, 0)).toBe(ALL.length)
  })

  it('cuenta cada pestaña', () => {
    const counts = usefulAppsTabCounts(ALL, ctx)
    expect(counts.todas).toBe(4)
    expect(counts.imprescindibles).toBe(2)
    expect(counts.transporte).toBe(2)
    expect(counts.ocio).toBe(1)
    expect(counts.salud).toBe(0)
  })

  it('con una búsqueda o un filtro, cada pestaña cuenta lo que mostraría (sin contar la pestaña)', () => {
    const luz = { ...USEFUL_APPS_DEFAULT_STATE, tab: 'transporte' as const, q: 'luz' }
    const counts = usefulAppsTabCountsFor(ALL, luz, ctx)
    expect(counts.todas).toBe(1)
    expect(counts.hogar).toBe(1)
    expect(counts.transporte).toBe(0)
    expect(counts.imprescindibles).toBe(1)
  })

  it('lista los departamentos presentes en orden alfabético, sin repetir', () => {
    expect(usefulAppsDepartmentsIn(ALL)).toEqual(['Montevideo'])
    const local = [
      app({ id: 's', departments: ['Salto'] }),
      app({ id: 'm', departments: ['Montevideo', 'Canelones'] }),
    ]
    expect(usefulAppsDepartmentsIn(local)).toEqual(['Canelones', 'Montevideo', 'Salto'])
  })
})

describe('usefulApps — plataforma y textos', () => {
  it('detecta Android, iPhone y iPad con escritorio', () => {
    expect(usefulAppsDetectPlatform('Mozilla/5.0 (Linux; Android 14; SM-A146M)')).toBe('android')
    expect(usefulAppsDetectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(
      'ios'
    )
    expect(usefulAppsDetectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5)).toBe(
      'ios'
    )
    expect(usefulAppsDetectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBeNull()
  })

  it('pluraliza la cantidad', () => {
    expect(usefulAppsCountLabel(1)).toBe('1 app')
    expect(usefulAppsCountLabel(0)).toBe('0 apps')
    expect(usefulAppsCountLabel(118)).toBe('118 apps')
  })
})
