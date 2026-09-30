import { describe, expect, it } from 'vitest'
import {
  type UsefulAppsSnapshotDoc,
  usefulAppsCompactStores,
  usefulAppsCount,
  usefulAppsIconFor,
  usefulAppsIsStale,
  usefulAppsLatestUpdate,
  usefulAppsLongDate,
  usefulAppsMonthYear,
  usefulAppsMonthsBetween,
  usefulAppsRating,
  usefulAppsSafeIcon,
} from '../../utils/usefulAppsStores'

const PLAY_ICON = 'https://play-lh.googleusercontent.com/HFIx72EXeTEvTtm2MBN9mA=s128'
const IOS_ICON =
  'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/e6/b9/2a/AppIcon.png/128x128bb.png'

const doc = (apps: UsefulAppsSnapshotDoc['apps']): UsefulAppsSnapshotDoc => ({
  key: 'uy',
  capturedAt: '2026-10-01T01:40:00.000Z',
  apps,
})

const blank = {
  status: 'ok' as const,
  checkedAt: '2026-10-01',
  updated: null,
  rating: null,
  ratingCount: null,
  installs: null,
  icon: null,
}

describe('usefulAppsStores — íconos', () => {
  it('acepta sólo https de las dos CDN de las tiendas', () => {
    expect(usefulAppsSafeIcon(PLAY_ICON)).toBe(PLAY_ICON)
    expect(usefulAppsSafeIcon(IOS_ICON)).toBe(IOS_ICON)
    expect(usefulAppsSafeIcon('http://play-lh.googleusercontent.com/x')).toBeNull()
    expect(usefulAppsSafeIcon('https://evil.example/x.png')).toBeNull()
    expect(usefulAppsSafeIcon('https://mzstatic.com.evil.example/x.png')).toBeNull()
    expect(usefulAppsSafeIcon('https://user:pw@play-lh.googleusercontent.com/x')).toBeNull()
    expect(usefulAppsSafeIcon(42)).toBeNull()
  })
})

describe('usefulAppsStores — compactado para la página', () => {
  it('redondea la nota, valida cantidades y deja sólo lo que se muestra', () => {
    const out = usefulAppsCompactStores(
      doc({
        'bps-personas': {
          android: {
            status: 'ok',
            checkedAt: '2026-10-01',
            name: 'BPS Personas',
            developer: 'Banco de Prevision Social',
            updated: '2026-08-10',
            rating: 4.35915470123291,
            ratingCount: 1434,
            installs: '100 k+',
            icon: PLAY_ICON,
          },
          ios: {
            status: 'ok',
            checkedAt: '2026-10-01',
            updated: '2026-09-02',
            rating: 7,
            ratingCount: -3,
            installs: 'muchas',
            icon: 'https://evil.example/i.png',
          },
        },
      }),
      '2026-10-01'
    )
    expect(out).toEqual({
      capturedAt: '2026-10-01',
      apps: {
        'bps-personas': {
          android: {
            status: 'ok',
            checkedAt: '2026-10-01',
            updated: '2026-08-10',
            rating: 4.4,
            ratingCount: 1434,
            installs: '100 k+',
            icon: PLAY_ICON,
          },
          ios: {
            status: 'ok',
            checkedAt: '2026-10-01',
            updated: '2026-09-02',
            rating: null,
            ratingCount: null,
            installs: null,
            icon: null,
          },
        },
      },
    })
  })

  it('una ficha que no está en la tienda se informa mientras la lectura es reciente', () => {
    const out = usefulAppsCompactStores(
      doc({ cutcsa: { android: { status: 'missing', checkedAt: '2026-09-20' } } }),
      '2026-10-01'
    )
    expect(out?.apps.cutcsa?.android?.status).toBe('missing')
  })

  it('una lectura de más de 60 días no esconde un botón ni publica una nota vieja', () => {
    const out = usefulAppsCompactStores(
      doc({
        viejo: {
          android: { status: 'missing', checkedAt: '2026-07-01' },
          ios: {
            status: 'ok',
            checkedAt: '2026-07-01',
            updated: '2026-06-01',
            rating: 4,
            ratingCount: 10,
            icon: IOS_ICON,
          },
        },
      }),
      '2026-10-01'
    )
    expect(out?.apps.viejo?.android).toBeUndefined()
    expect(out?.apps.viejo?.ios).toEqual({ ...blank, checkedAt: '2026-07-01', icon: IOS_ICON })
  })

  it('sin documento, o sin fecha de captura, no hay nada que mostrar', () => {
    expect(usefulAppsCompactStores(null, '2026-10-01')).toBeNull()
    expect(
      usefulAppsCompactStores({ key: 'uy', capturedAt: 'x', apps: {} }, '2026-10-01')
    ).toBeNull()
  })

  it('acepta fechas que vuelven de Mongo como Date', () => {
    const out = usefulAppsCompactStores(
      {
        key: 'uy',
        capturedAt: new Date('2026-10-01T01:40:00Z'),
        apps: { x: { android: { status: 'ok', checkedAt: new Date('2026-10-01T01:41:00Z') } } },
      },
      '2026-10-01'
    )
    expect(out?.capturedAt).toBe('2026-10-01')
    expect(out?.apps.x?.android?.checkedAt).toBe('2026-10-01')
  })
})

describe('usefulAppsStores — frescura', () => {
  it('toma la versión más nueva de las dos tiendas', () => {
    expect(
      usefulAppsLatestUpdate({
        android: { ...blank, updated: '2023-11-03' },
        ios: { ...blank, updated: '2019-08-08' },
      })
    ).toBe('2023-11-03')
    expect(usefulAppsLatestUpdate(null)).toBeNull()
  })

  it('prefiere el ícono de Google Play y si no, el del App Store', () => {
    expect(
      usefulAppsIconFor({
        android: { ...blank, icon: PLAY_ICON },
        ios: { ...blank, icon: IOS_ICON },
      })
    ).toBe(PLAY_ICON)
    expect(usefulAppsIconFor({ ios: { ...blank, icon: IOS_ICON } })).toBe(IOS_ICON)
    expect(usefulAppsIconFor(undefined)).toBeNull()
  })

  it('cuenta meses completos y marca como vieja a partir de 24', () => {
    expect(usefulAppsMonthsBetween('2024-10-01', '2026-09-30')).toBe(23)
    expect(usefulAppsMonthsBetween('2024-09-30', '2026-09-30')).toBe(24)
    expect(usefulAppsIsStale('2024-09-30', '2026-09-30')).toBe(true)
    expect(usefulAppsIsStale('2024-10-01', '2026-09-30')).toBe(false)
    expect(usefulAppsIsStale(null, '2026-09-30')).toBe(false)
  })
})

describe('usefulAppsStores — formato', () => {
  it('escribe los meses como en Uruguay', () => {
    expect(usefulAppsMonthYear('2026-09-17')).toBe('setiembre de 2026')
    expect(usefulAppsLongDate('2026-09-03')).toBe('3 de setiembre de 2026')
    expect(usefulAppsLongDate('2026-01-31')).toBe('31 de enero de 2026')
  })

  it('nota con coma decimal y cantidades con punto de miles', () => {
    expect(usefulAppsRating(4.35915)).toBe('4,4')
    expect(usefulAppsRating(5)).toBe('5,0')
    expect(usefulAppsCount(7)).toBe('7')
    expect(usefulAppsCount(1434)).toBe('1.434')
    expect(usefulAppsCount(19972844)).toBe('19.972.844')
  })
})
