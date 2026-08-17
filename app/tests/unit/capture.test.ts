// The email ask renders under every long read on the site, so the two ways it can
// go wrong are both site-wide: appearing on a page where it interrupts a task, or
// re-appearing after somebody already said no (or already subscribed).
import { describe, expect, it } from 'vitest'

import { captureAllowedForPath, DISMISS_DAYS, shouldAskForEmail } from '../../utils/capture'

const DAY = 24 * 60 * 60 * 1000
const NOW = 1_786_000_000_000

describe('where the site may ask for an email', () => {
  it('asks at the end of the long reads people arrive at from search and social', () => {
    for (const path of [
      '/tarjetas-de-credito-uruguay',
      '/mejores-bancos-uruguay',
      '/alquilar-estando-en-clearing',
      '/importar-para-revender-uruguay',
      '/guias/dolares-deteriorados-billetes-rechazados-uruguay',
      '/inversiones-uruguay',
      '/vivir-con-25000-pesos-uruguay',
    ]) {
      expect(captureAllowedForPath(path), path).toBe(true)
    }
  })

  it('never interrupts a rate table, a map or a calculator', () => {
    for (const path of [
      '/',
      '/dolar-hoy',
      '/cotizacion/dolar',
      '/convertir',
      '/comparar',
      '/mapa',
      '/historico/brou/usd',
      '/casa/brou',
      '/sucursales',
      '/herramientas',
      '/mi-lista',
      '/buscar',
    ]) {
      expect(captureAllowedForPath(path), path).toBe(false)
    }
  })

  it('stays off the conversion flows, the chrome-free routes and the plumbing', () => {
    for (const path of [
      '/conectar',
      '/contacto',
      '/cuenta',
      '/offline',
      '/estado',
      '/widget',
      '/pizarra',
    ]) {
      expect(captureAllowedForPath(path), path).toBe(false)
    }
  })

  it('never doubles up with the newsletter pages, which ask on their own', () => {
    expect(captureAllowedForPath('/newsletter')).toBe(false)
    expect(captureAllowedForPath('/newsletter/archivo')).toBe(false)
    expect(captureAllowedForPath('/newsletter/2026-08-16')).toBe(false)
  })

  it('decides the same way in every locale', () => {
    for (const path of ['/tarjetas-de-credito-uruguay', '/dolar-hoy', '/newsletter/2026-08-16']) {
      expect(captureAllowedForPath(`/en${path}`), `/en${path}`).toBe(captureAllowedForPath(path))
      expect(captureAllowedForPath(`/pt${path}`), `/pt${path}`).toBe(captureAllowedForPath(path))
    }
  })

  it('ignores the query string', () => {
    expect(captureAllowedForPath('/tarjetas-de-credito-uruguay?utm_source=twitter')).toBe(true)
    expect(captureAllowedForPath('/dolar-hoy?from=USD')).toBe(false)
  })
})

describe('what the browser remembers', () => {
  const base = { allowed: true, done: false, dismissedAt: null as number | null, now: NOW }

  it('asks a first-time reader on an allowed page', () => {
    expect(shouldAskForEmail(base)).toBe(true)
  })

  it('never asks on a page that is not allowed', () => {
    expect(shouldAskForEmail({ ...base, allowed: false })).toBe(false)
  })

  it('never asks somebody who already subscribed', () => {
    expect(shouldAskForEmail({ ...base, done: true })).toBe(false)
    // Not even after the dismissal window would have expired.
    expect(shouldAskForEmail({ ...base, done: true, dismissedAt: NOW - 999 * DAY })).toBe(false)
  })

  it('honours a dismissal for the whole window and asks again after it', () => {
    expect(shouldAskForEmail({ ...base, dismissedAt: NOW })).toBe(false)
    expect(shouldAskForEmail({ ...base, dismissedAt: NOW - (DISMISS_DAYS - 1) * DAY })).toBe(false)
    expect(shouldAskForEmail({ ...base, dismissedAt: NOW - (DISMISS_DAYS + 1) * DAY })).toBe(true)
  })

  it('treats a corrupt or future timestamp as no decision rather than a permanent no', () => {
    expect(shouldAskForEmail({ ...base, dismissedAt: Number.NaN })).toBe(true)
    expect(shouldAskForEmail({ ...base, dismissedAt: NOW + 10 * DAY })).toBe(true)
  })
})
