// La prueba de antigüedad que el sitio le muestra a quien duda: las copias que guardó Internet
// Archive. Los datos son fijos y fechados (ver app/utils/archiveHistory.ts); lo único que se
// calcula es cuánto tiempo pasó desde la primera captura, y eso es lo que este archivo vigila.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  ARCHIVE_CHECKED_ON,
  ARCHIVE_FIRST_CAPTURE,
  ARCHIVE_SNAPSHOTS,
  formatTimeOnline,
  timeOnline,
  waybackCalendarUrl,
  waybackDate,
  waybackSnapshotUrl,
} from '../../utils/archiveHistory'

const at = (iso: string): number => Date.parse(`${iso}T12:00:00-03:00`)

describe('timeOnline', () => {
  it('cuenta meses de calendario completos desde la primera captura', () => {
    expect(timeOnline('2022-12-27', at('2026-11-28'))).toEqual({ years: 3, months: 11 })
  })

  it('no suma el mes hasta que llega el mismo día', () => {
    expect(timeOnline('2022-12-27', at('2026-12-26'))).toEqual({ years: 3, months: 11 })
    expect(timeOnline('2022-12-27', at('2026-12-27'))).toEqual({ years: 4, months: 0 })
  })

  it('nunca da un tiempo negativo', () => {
    expect(timeOnline('2022-12-27', at('2022-12-01'))).toEqual({ years: 0, months: 0 })
  })
})

describe('formatTimeOnline', () => {
  it('lo escribe con el plural y la conjunción de cada idioma', () => {
    expect(formatTimeOnline({ years: 3, months: 11 }, 'es')).toBe('3 años y 11 meses')
    expect(formatTimeOnline({ years: 1, months: 1 }, 'es')).toBe('1 año y 1 mes')
    expect(formatTimeOnline({ years: 3, months: 11 }, 'en')).toBe('3 years and 11 months')
  })

  it('no escribe «0 meses» el día del aniversario', () => {
    expect(formatTimeOnline({ years: 4, months: 0 }, 'es')).toBe('4 años')
  })

  it('un idioma que el motor no conoce no rompe la página', () => {
    expect(formatTimeOnline({ years: 2, months: 3 }, 'xx-invalid-tag-')).toContain('2')
  })
})

describe('las capturas publicadas', () => {
  it('la primera captura es la más vieja y abre la lista', () => {
    expect(ARCHIVE_SNAPSHOTS[0]!.timestamp).toBe(ARCHIVE_FIRST_CAPTURE)
    const stamps = ARCHIVE_SNAPSHOTS.map(s => s.timestamp)
    expect([...stamps].sort()).toEqual(stamps)
  })

  it('una captura por año, cada una del propio dominio', () => {
    const years = ARCHIVE_SNAPSHOTS.map(s => s.timestamp.slice(0, 4))
    expect(new Set(years).size).toBe(years.length)
    for (const snap of ARCHIVE_SNAPSHOTS) {
      expect(snap.timestamp).toMatch(/^\d{14}$/)
      expect(new URL(snap.url).hostname.replace(/^www\./, '')).toBe('cambio-uruguay.com')
      expect(snap.note.length).toBeGreaterThan(10)
    }
  })

  it('ninguna captura es posterior a la fecha en que se consultó el archivo', () => {
    for (const snap of ARCHIVE_SNAPSHOTS) {
      expect(waybackDate(snap.timestamp) <= ARCHIVE_CHECKED_ON).toBe(true)
    }
  })

  it('arma los enlaces que abre el lector', () => {
    expect(waybackDate('20221227222132')).toBe('2022-12-27')
    expect(waybackSnapshotUrl('20221227222132', 'https://cambio-uruguay.com/')).toBe(
      'https://web.archive.org/web/20221227222132/https://cambio-uruguay.com/'
    )
    expect(waybackCalendarUrl()).toBe('https://web.archive.org/web/*/cambio-uruguay.com')
  })
})

describe('la identidad del sitio declara la misma fecha', () => {
  it('foundingDate del layout no contradice la primera captura', () => {
    const layout = readFileSync(join(__dirname, '..', '..', 'layouts', 'default.vue'), 'utf8')
    const declared = /foundingDate:\s*'([^']+)'/.exec(layout)?.[1]
    expect(declared).toBeDefined()
    expect(waybackDate(ARCHIVE_FIRST_CAPTURE).startsWith(declared!)).toBe(true)
  })
})
