// Weekend classification of the BCU feed's free-text opening hours.
//
// Every string in this file is copied verbatim out of a live `/locations`
// response, because the whole difficulty of this parser is that the input is
// prose typed by 50-odd different people and no invented example reproduces the
// ways it actually goes wrong.

import { describe, expect, it } from 'vitest'

import { normalizeHours, opensOnWeekend, parseWeekendHours } from '../../utils/branchHours'

describe('normalizeHours', () => {
  it('folds the accents and casing the feed is inconsistent about', () => {
    // The same casa spells its own days both ways across its branches.
    expect(normalizeHours('SÁBADOS')).toBe('sabados')
    expect(normalizeHours('Sabados')).toBe('sabados')
    expect(normalizeHours('  Lunes   a    Viernes  ')).toBe('lunes a viernes')
  })
})

describe('parseWeekendHours', () => {
  it('reads a Saturday stated on its own, in any of the feed spellings', () => {
    const forms = [
      'Lunes a Viernes 8:30 a 17:30 y Sábado de 08:00 a 12:00',
      'lunes a viernes de 8.30 a 17.30 hs  sábados de 08:00 a 12:00 hs',
      'LUNES A VIERNES DE 9 A 18 HS Y SÁBADOS DE 08:00 A 12:00',
      'Lun. a Vie. de 9:00 a 20:00 hs; Sáb. de 08:00 a 12:00 hs',
      'De 9 a 17 hs de Lunes a Viernes, Sab de 08 a 12',
    ]
    for (const form of forms) {
      const parsed = parseWeekendHours(form)
      expect(parsed.saturday, form).toBe('open')
      expect(parsed.saturdayWindow, form).toBe('8:00 a 12:00')
    }
  })

  it('opens every day an inclusive range spans', () => {
    expect(parseWeekendHours('Lunes a Domingo de 10:00 hs a 20:30 hs.')).toMatchObject({
      saturday: 'open',
      sunday: 'open',
      saturdayWindow: '10:00 a 20:30',
    })
  })

  // The defect this pins: "Lunes a Sábados ... - Domingos Cerrado" is BOTH the
  // most common way a casa says yes to Saturday and the most common way it says
  // no to Sunday. Counting a mention of "domingo" as an opening turns 24
  // branches that are explicitly shut into branches the page sends people to.
  it('lets an explicit closure beat the mention that carries it', () => {
    for (const form of [
      'Lunes a Sábados de 09.00 a 19.00 hs. -  Domingos Cerrado',
      'Lunes a Sabados de 09.00 a 19.00 hs  - Domingo Cerrado',
      'Lunes a Viernes de 08.30 a 19.00 hs - Sabados de 8.30 a 13.30 Hs. Domingos Cerrado',
    ]) {
      const parsed = parseWeekendHours(form)
      expect(parsed.saturday, form).toBe('open')
      expect(parsed.sunday, form).toBe('closed')
      expect(parsed.sundayWindow, form).toBe('')
    }
  })

  it('does not let the next clause donate its window to Saturday', () => {
    // Before the clause cut, this read Sunday's 9-to-21 as a second Saturday window.
    expect(parseWeekendHours('Lunes a Sabado de 8 a 21 hs. y Dom de 9 a 21 hs.')).toMatchObject({
      saturday: 'open',
      saturdayWindow: '8:00 a 21:00',
      sunday: 'open',
      sundayWindow: '9:00 a 21:00',
    })
  })

  it('handles the two weekend days sharing one window', () => {
    // Saturday's fragment ends at "domingo", so without this case it kept no
    // window and fell through as unknown while Sunday came out open.
    expect(
      parseWeekendHours('Lunes a Viernes de 8 a 21 hs. Sábado y domingo de 8.30 a 13.30 hs.')
    ).toMatchObject({
      saturday: 'open',
      sunday: 'open',
      saturdayWindow: '8:30 a 13:30',
      sundayWindow: '8:30 a 13:30',
    })
  })

  it('follows a range that wraps past the end of the week', () => {
    // `domingo a jueves` is a real entry, and read as from<=to it is empty.
    expect(
      parseWeekendHours('domingo a jueves de 11 a 03hs. Viernes y Sabado de 11 a 04hs')
    ).toMatchObject({ saturday: 'open', sunday: 'open' })
  })

  it('keeps a day nobody spoke about unknown rather than guessing', () => {
    // A weekday-only string says nothing about Saturday. Calling it closed would
    // be as invented as calling it open.
    expect(parseWeekendHours('Lunes a Viernes de 10 a 18')).toMatchObject({
      saturday: 'unknown',
      sunday: 'unknown',
    })
    expect(parseWeekendHours('Sin informar')).toMatchObject({
      saturday: 'unknown',
      sunday: 'unknown',
    })
    expect(parseWeekendHours('')).toMatchObject({ saturday: 'unknown', sunday: 'unknown' })
  })

  it('reads a half-day Saturday split across two windows', () => {
    expect(
      parseWeekendHours('Lunes a Viernes de 8 a 19 hs. Sábados  8 a 12.30 hs  y 15 a 19 hs')
    ).toMatchObject({ saturday: 'open', saturdayWindow: '8:00 a 12:30 y 15:00 a 19:00' })
  })

  it('ignores the separate teller schedule some banks append', () => {
    // "Horario de cajas" describes a different counter. Read as part of the
    // branch's own hours it hung the weekday teller window (11-19) off Saturday.
    expect(
      parseWeekendHours(
        'Lunes a viernes de 10 a 20 h. y  Sábados de 12 a 16 h. Horario de cajas: de L a V de 11 a 19 h.'
      )
    ).toMatchObject({ saturday: 'open', saturdayWindow: '12:00 a 16:00' })

    expect(
      parseWeekendHours('Todos los días de 10 a 20 h Horario de cajas: de L a S de 11 a 19 h')
    ).toMatchObject({
      saturday: 'open',
      sunday: 'open',
      saturdayWindow: '10:00 a 20:00',
    })
  })

  it('does not splice a seasonal table into one impossible window', () => {
    // A January schedule and a rest-of-year schedule crammed into one field.
    // Joining every window it contains produced "9:50 a 17:50 y 10:00 a 19:00 y
    // 10:00 a 18:00" — three spans that never applied together. The cap drops
    // that, and Saturday keeps the last window the casa states for it, which in
    // this string is the out-of-January one.
    expect(
      parseWeekendHours(
        'Enero Lun a Vie 9.50 a 20.50 Sab y Dom 9.50 a 17.50 - Lun a Vie 10 a 19 hs Sab 10 a 18 hs'
      )
    ).toMatchObject({ saturday: 'open', saturdayWindow: '10:00 a 18:00' })
  })

  it('drops a window list too long to be one day', () => {
    // Three or more spans mean the field holds a table, not a schedule. The day
    // stays open; the branch page shows the casa's raw string instead.
    expect(parseWeekendHours('Sábados de 8 a 10 y de 12 a 14 y de 16 a 18')).toMatchObject({
      saturday: 'open',
      saturdayWindow: '',
    })
  })

  it('accepts a Saturday qualified by working holidays', () => {
    expect(
      parseWeekendHours(
        'Lun. a Vie. 08:00 a 19:00 hs., Sáb y feriados laborables 08:00 a 13:00 hs.'
      )
    ).toMatchObject({ saturday: 'open', saturdayWindow: '8:00 a 13:00' })
  })
})

describe('opensOnWeekend', () => {
  it('is true when either weekend day is open and false otherwise', () => {
    expect(opensOnWeekend('Lunes a Viernes 8:30 a 17:30 y Sábado de 08:00 a 12:00')).toBe(true)
    expect(opensOnWeekend('Lunes a Viernes de 10 a 18')).toBe(false)
    expect(opensOnWeekend('Sin informar')).toBe(false)
  })
})
