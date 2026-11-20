// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { Event } from '@sentry/nuxt'
import { sanitizeSentryEvent, sentryThrownShape } from '../../utils/sentryPrivacy'

// CAMBIO-URUGUAY-BACKEND-Y: a startup app:error with statusCode 500, a 200 document and no
// frames. Nuxt's createError copies the input's stack, so a frameless 500 means a non-Error
// was thrown; these tags name its class without reading any of its contents.
const nuxtLike = (cause: unknown) => {
  const error = Object.assign(new Error('wrapped'), { statusCode: 500, cause })
  // createError copies the input's stack: a non-Error input leaves none.
  Object.defineProperty(error, 'stack', { value: (cause as { stack?: unknown })?.stack })
  return error
}

describe('sentryThrownShape', () => {
  it('names a rejected DOM event wrapped by createError, with no stack', () => {
    expect(sentryThrownShape(nuxtLike(new Event('error')))).toEqual({
      thrown_kind: 'Event',
      stack_status: 'absent',
    })
  })

  it('says object for a plain object and never reads its keys or values', () => {
    let read = false
    const value = {
      get secret() {
        read = true
        return 'private@example.invalid'
      },
    }
    expect(sentryThrownShape(nuxtLike(value))).toEqual({
      thrown_kind: 'object',
      stack_status: 'absent',
    })
    expect(read).toBe(false)
  })

  it('keeps a real Error with its stack as present', () => {
    const inner = new TypeError('private-message')
    expect(sentryThrownShape(nuxtLike(inner))).toEqual({
      thrown_kind: 'TypeError',
      stack_status: 'present',
    })
  })

  it('says string, unlisted and primitive for the rest', () => {
    expect(sentryThrownShape(nuxtLike('private text')).thrown_kind).toBe('string')
    class PrivateThing {
      readonly marker = 1
    }
    expect(sentryThrownShape(nuxtLike(new PrivateThing())).thrown_kind).toBe('unlisted')
    expect(sentryThrownShape(undefined)).toEqual({
      thrown_kind: 'primitive',
      stack_status: 'absent',
    })
  })

  it('does not loop on a self-referencing cause', () => {
    const error: Error & { cause?: unknown } = new Error('x')
    error.cause = error
    expect(sentryThrownShape(error).thrown_kind).toBe('Error')
  })

  it('survives the event allowlist, and anything else in those tags is dropped', () => {
    const event = (tags: Record<string, string>): Event => ({
      exception: { values: [{ type: 'Error', value: 'private' }] },
      tags: { http_status: '500', ...tags },
    })
    const config = { dsn: 'https://public@sentry.example.invalid/1', enabled: true }
    expect(
      sanitizeSentryEvent(
        event({ thrown_kind: 'Event', stack_status: 'absent' }),
        {},
        config,
        'browser'
      )?.tags
    ).toMatchObject({ thrown_kind: 'Event', stack_status: 'absent' })
    const leaked = sanitizeSentryEvent(
      event({ thrown_kind: 'private@example.invalid', stack_status: 'maybe' }),
      {},
      config,
      'browser'
    )?.tags
    expect(leaked).not.toHaveProperty('thrown_kind')
    expect(leaked).not.toHaveProperty('stack_status')
  })
})
