import { describe, expect, it } from 'vitest'
import { USEFUL_APPS_DEFAULT_STATE, type UsefulApp } from '../../utils/usefulApps'
import type { UsefulAppsKitItem } from '../../utils/usefulAppsContent'
import type { UsefulAppsStoreFacts } from '../../utils/usefulAppsStores'
import {
  usefulAppCardView,
  usefulAppStoreButtons,
  usefulAppsKitView,
  usefulAppsTabLinks,
} from '../../utils/usefulAppsView'

const facts = (over: Partial<UsefulAppsStoreFacts>): UsefulAppsStoreFacts => ({
  status: 'ok',
  checkedAt: '2026-09-30',
  updated: null,
  rating: null,
  ratingCount: null,
  installs: null,
  icon: null,
  ...over,
})

const COMO_IR: UsefulApp = {
  id: 'como-ir',
  name: 'Cómo ir',
  organization: 'Intendencia de Montevideo',
  kind: 'intendencia',
  category: 'transporte',
  summary: 'Planificá tu viaje en ómnibus por Montevideo.',
  uses: ['Mirá cuánto falta para que pase el ómnibus', 'Compará cómo llegar'],
  departments: ['Montevideo'],
  android: { id: 'uy.gub.imm.stm.mobile.comoir', developer: 'Intendencia de Montevideo' },
  ios: { id: '933271921', developer: 'Montevideo DTI' },
  source: 'https://montevideo.gub.uy/',
  guides: ['/conviene-auto-moto-o-omnibus-uruguay', '/no-existe'],
}
const STM: UsefulApp = {
  ...COMO_IR,
  id: 'stm-montevideo',
  name: 'STM Montevideo',
  organization: 'Desarrollador independiente',
  kind: 'comunidad',
  note: 'No es de la Intendencia: la hace un desarrollador independiente con los datos del STM.',
  officialAlternative: 'como-ir',
  guides: [],
}
const LABELS = { '/conviene-auto-moto-o-omnibus-uruguay': '¿Auto, moto u ómnibus?' }
const base = { today: '2026-09-30', guideLabels: LABELS }

describe('usefulAppStoreButtons', () => {
  it('Google Play primero, y el App Store primero en un iPhone', () => {
    expect(usefulAppStoreButtons(COMO_IR, null, null).buttons.map(b => b.store)).toEqual([
      'android',
      'ios',
    ])
    const ios = usefulAppStoreButtons(COMO_IR, null, 'ios').buttons
    expect(ios.map(b => b.store)).toEqual(['ios', 'android'])
    expect(ios.map(b => b.primary)).toEqual([true, false])
  })

  it('una ficha que no está en la tienda de Uruguay pierde el botón y lo dice con la fecha', () => {
    const out = usefulAppStoreButtons(
      COMO_IR,
      { android: facts({ status: 'missing', checkedAt: '2026-09-20' }) },
      null
    )
    expect(out.buttons.map(b => b.store)).toEqual(['ios'])
    expect(out.unavailable).toEqual([
      'No está en Google Play de Uruguay (revisado el 20 de setiembre de 2026).',
    ])
  })

  it('los enlaces van a la ficha oficial con una etiqueta accesible', () => {
    const [play] = usefulAppStoreButtons(COMO_IR, null, null).buttons
    expect(play!.href).toBe(
      'https://play.google.com/store/apps/details?id=uy.gub.imm.stm.mobile.comoir'
    )
    expect(play!.ariaLabel).toBe('Cómo ir en Google Play')
  })
})

describe('usefulAppCardView', () => {
  it('arma la línea de la tienda con la versión más nueva y la nota de la tienda preferida', () => {
    const view = usefulAppCardView(COMO_IR, {
      ...base,
      facts: {
        android: facts({ updated: '2025-03-26', rating: 2.8, ratingCount: 3065 }),
        ios: facts({ updated: '2025-03-26', rating: 2.2, ratingCount: 318 }),
      },
    })
    expect(view.storeLine).toBe(
      'Última versión: marzo de 2025 · 2,8 ★ en Google Play (3.065 opiniones)'
    )
    const onIphone = usefulAppCardView(COMO_IR, {
      ...base,
      platform: 'ios',
      facts: { ios: facts({ rating: 2.2, ratingCount: 1 }) },
    })
    expect(onIphone.storeLine).toBe('2,2 ★ en App Store (1 opinión)')
  })

  it('muestra los dos desarrolladores cuando cada tienda dice otro', () => {
    expect(usefulAppCardView(COMO_IR, base).developerLine).toBe(
      'En la tienda figura como «Intendencia de Montevideo» (Google Play) y «Montevideo DTI» (App Store).'
    )
  })

  it('avisa si no tiene versiones nuevas hace dos años', () => {
    const view = usefulAppCardView(COMO_IR, {
      ...base,
      facts: { android: facts({ updated: '2023-11-03' }) },
    })
    expect(view.warning).toBe(
      'Sin versiones nuevas desde noviembre de 2023: puede no andar bien en celulares nuevos.'
    )
  })

  it('una no oficial avisa con su nota y apunta a la oficial', () => {
    const view = usefulAppCardView(STM, { ...base, alternative: COMO_IR })
    expect(view.kindTone).toBe('comunidad')
    expect(view.kindLabel).toBe('No oficial')
    expect(view.warning).toBe(STM.note)
    expect(view.note).toBeNull()
    expect(view.alternative).toEqual({ id: 'como-ir', name: 'Cómo ir' })
  })

  it('metadatos, guías con etiqueta y sin datos de tienda no inventa nada', () => {
    const view = usefulAppCardView(COMO_IR, base)
    expect(view.meta).toEqual([{ icon: 'mdi-map-marker-outline', text: 'Sólo Montevideo' }])
    expect(view.guides).toEqual([
      { to: '/conviene-auto-moto-o-omnibus-uruguay', label: '¿Auto, moto u ómnibus?' },
    ])
    expect(view.storeLine).toBeNull()
    expect(view.iconSrc).toBeNull()
    expect(view.kindTone).toBe('publica')
  })
})

describe('usefulAppsTabLinks', () => {
  it('Todas e Imprescindibles primero, después las diez categorías, con su enlace', () => {
    const counts = {
      todas: 118,
      imprescindibles: 14,
      tramites: 9,
      salud: 26,
      transporte: 18,
      dinero: 20,
      hogar: 11,
      emergencias: 4,
      ciudad: 6,
      educacion: 8,
      compras: 16,
      ocio: 6,
    }
    const tabs = usefulAppsTabLinks('/apps-utiles-uruguay', USEFUL_APPS_DEFAULT_STATE, counts)
    expect(tabs.map(t => t.id).slice(0, 3)).toEqual(['todas', 'imprescindibles', 'tramites'])
    expect(tabs).toHaveLength(12)
    expect(tabs[2]!.href).toBe('/apps-utiles-uruguay?categoria=tramites')
    expect(tabs[0]!.href).toBe('/apps-utiles-uruguay')
    expect(tabs[3]!.count).toBe(26)
  })
})

describe('usefulAppsKitView', () => {
  const items: UsefulAppsKitItem[] = [
    { id: 'omnibus', group: 'todos', title: 'El ómnibus', why: 'x.', appIds: ['como-ir'] },
    { id: 'fantasma', group: 'todos', title: 'Nada', why: 'x.', appIds: ['no-existe'] },
    {
      id: 'otro',
      group: 'caso',
      when: 'Si x',
      title: 'Otro',
      why: 'x.',
      appIds: ['stm-montevideo'],
    },
  ]
  const byId = new Map([COMO_IR, STM].map(a => [a.id, a]))

  it('cuenta sólo "para todos" y descarta ítems sin apps', () => {
    const view = usefulAppsKitView(items, byId, ['omnibus', 'otro'])
    expect(view.todos.map(r => r.item.id)).toEqual(['omnibus'])
    expect(view.caso.map(r => r.item.id)).toEqual(['otro'])
    expect(view.done).toBe(1)
    expect(view.total).toBe(1)
    expect(view.caso[0]!.checked).toBe(false)
  })
})
