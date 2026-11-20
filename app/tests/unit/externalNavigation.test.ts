import { describe, expect, it } from 'vitest'
import {
  externalDestination,
  externalExitTracking,
  isPlainExternalClick,
  remainingExitSeconds,
} from '../../utils/externalNavigation'

const current = 'https://cambio-uruguay.com/alquileres-uruguay'
const external = 'https://inmobiliaria.example/aviso/123?utm_source=cambio-uruguay#fotos'

describe('external exit destination', () => {
  it('preserves destination, new-tab intent, sponsorship and privacy policy', () => {
    expect(
      externalDestination(
        { href: external, target: '_blank', rel: 'noopener noreferrer sponsored nofollow' },
        current
      )
    ).toEqual({
      href: external,
      host: 'inmobiliaria.example',
      target: '_blank',
      rel: 'noopener noreferrer sponsored nofollow',
      referrerPolicy: 'no-referrer',
      sponsored: true,
    })
  })

  it.each([
    '/dolar-hoy',
    '#fuentes',
    'https://cambio-uruguay.com/cuenta',
    'https://www.cambio-uruguay.com/convertir',
    'https://api.cambio-uruguay.com/parameters',
    'mailto:contacto@example.com',
    'tel:+59899123456',
    'javascript:alert(1)',
    'data:text/html,test',
    'blob:https://cambio-uruguay.com/test',
    'https://usuario:clave@externo.example/',
    'https://',
    '',
  ])('does not interrupt internal or non-web links: %s', href => {
    expect(externalDestination({ href }, current)).toBeNull()
  })

  it.each([
    'https://accounts.google.com/o/oauth2/auth',
    'https://example.firebaseapp.com/__/auth/handler',
    'https://discord.com/oauth2/authorize?client_id=1',
    'https://identity.example/connect?client_id=1&redirect_uri=https://example.com',
    'https://ko-fi.com/cambio_uruguay',
    'https://mpago.la/19j46vX',
    'https://www.paypal.com/donate',
    'https://checkout.example/checkout/session',
    'https://wa.me/59899123456',
    'https://web.whatsapp.com/send?text=test',
    'https://t.me/share/url?url=https://example.com',
    'https://twitter.com/intent/tweet?text=test',
    'https://www.facebook.com/sharer/sharer.php?u=https://example.com',
    'https://www.linkedin.com/sharing/share-offsite?url=https://example.com',
  ])('keeps auth, payments, contacts and sharing direct: %s', href => {
    expect(externalDestination({ href }, current)).toBeNull()
  })

  it('does not confuse lookalike hosts with our domain or trusted actions', () => {
    for (const host of ['cambio-uruguay.com.evil.example', 'paypal.com.evil.example']) {
      expect(externalDestination({ href: `https://${host}` }, current)?.host).toBe(host)
    }
  })

  it('preserves same-tab and referrer policy instead of forcing a new tab', () => {
    const result = externalDestination(
      { href: external, referrerPolicy: 'origin', rel: 'nofollow' },
      current
    )
    expect(result?.target).toBe('_self')
    expect(result?.referrerPolicy).toBe('origin')
    expect(result?.rel).toBe('nofollow noopener')
  })

  it('leaves downloads, opted-out links, named windows and frames alone', () => {
    for (const extra of [
      { download: true },
      { skip: true },
      { target: '_parent' },
      { target: '_top' },
      { target: 'payment-window' },
    ]) {
      expect(externalDestination({ href: external, ...extra }, current)).toBeNull()
    }
  })
})

describe('native click gestures', () => {
  const click = {
    defaultPrevented: false,
    button: 0,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
  }
  it('intercepts only an unhandled primary activation, including keyboard click', () => {
    expect(isPlainExternalClick(click)).toBe(true)
    for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey', 'defaultPrevented']) {
      expect(isPlainExternalClick({ ...click, [modifier]: true })).toBe(false)
    }
    expect(isPlainExternalClick({ ...click, button: 1 })).toBe(false)
    expect(isPlainExternalClick({ ...click, button: 2 })).toBe(false)
  })
})

describe('exit clock', () => {
  it('uses elapsed time and never shows negative seconds after a delayed browser tick', () => {
    expect(remainingExitSeconds(10_000, 0)).toBe(10)
    expect(remainingExitSeconds(10_000, 1_001)).toBe(9)
    expect(remainingExitSeconds(10_000, 9_999)).toBe(1)
    expect(remainingExitSeconds(10_000, 10_000)).toBe(0)
    expect(remainingExitSeconds(10_000, 14_500)).toBe(0)
  })
})

describe('confirmed exit analytics', () => {
  it('keeps the destination path but omits query parameters and fragments', () => {
    const destination = externalDestination({ href: external }, current)!
    expect(externalExitTracking(destination)).toEqual({
      link_url: 'https://inmobiliaria.example',
      link_domain: 'inmobiliaria.example',
    })
  })
})
