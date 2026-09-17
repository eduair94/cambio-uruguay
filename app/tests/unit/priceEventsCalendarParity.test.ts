// Paridad entre el calendario de eventos de la raíz (`classes/priceevents/calendar.ts`) y su espejo
// del app (`app/utils/priceEvents.ts`). Vive en el suite del APP porque un test de la raíz no puede
// importar un archivo de `app/` (Vite toma `app/tsconfig.json`, ausente en el job de backend del CI —
// rompió el deploy el 2026-09-17), pero un test del APP sí puede importar la raíz: sólo el RUNTIME de
// producción de cada paquete no puede cruzar el límite (tsconfigs separados, ver AGENTS.md).
import { describe, expect, it } from 'vitest'
import { PRICE_EVENTS, activeEvent } from '../../../classes/priceevents/calendar'
import { PRICE_EVENT_CALENDAR, priceEventActiveEvent } from '../../utils/priceEvents'

describe('paridad del calendario de eventos (raíz vs. espejo del app)', () => {
  it('PRICE_EVENT_CALENDAR es idéntico, campo a campo, a PRICE_EVENTS', () => {
    expect(PRICE_EVENT_CALENDAR).toEqual(PRICE_EVENTS)
  })

  it.each([
    '2025-01-01',
    '2025-11-01',
    '2025-11-02',
    '2025-11-03',
    '2025-11-04',
    '2025-11-05',
    '2025-11-06',
    '2026-01-01',
    '2026-05-31',
    '2026-06-01',
    '2026-06-02',
    '2026-06-03',
    '2026-06-04',
    '2026-10-31',
    '2026-11-01',
    '2026-11-04',
    '2026-11-08',
    '2026-11-09',
    '2026-11-26',
    '2026-11-27',
    '2026-11-30',
    '2026-12-01',
  ])('priceEventActiveEvent(%s) coincide con activeEvent(%s) de la raíz', today => {
    expect(priceEventActiveEvent(today)).toEqual(activeEvent(today))
  })
})
