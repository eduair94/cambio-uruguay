import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ANSWERED_ANY_DAYS,
  ANSWERED_PATH_DAYS,
  EMPTY_MEMORY,
  REVIEW_DISMISS_DAYS,
  feedbackEmail,
  helpfulAllowedForPath,
  needsAttention,
  parseMemory,
  rememberAnswer,
  reviewAskFor,
  sanitizeFeedback,
  shouldAskHelpful,
} from '../../utils/siteFeedback'
import { siteFeedbackMessages } from '../../utils/siteFeedbackMessages'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 10, 11)

describe('sanitizeFeedback', () => {
  it('accepts a suggestion and normalizes the email', () => {
    const result = sanitizeFeedback({
      kind: 'suggestion',
      message: '  Filtrar por barrio y precio  ',
      email: 'Persona@Example.com',
      path: '/oportunidades-inmobiliarias-uruguay',
      locale: 'es',
    })
    expect('record' in result && result.record).toMatchObject({
      kind: 'suggestion',
      message: 'Filtrar por barrio y precio',
      email: 'persona@example.com',
      path: '/oportunidades-inmobiliarias-uruguay',
      tech: null,
    })
  })

  it('refuses unknown kinds, empty messages and bad emails', () => {
    expect(sanitizeFeedback({ kind: 'spam', message: 'hola' })).toEqual({ error: 'kind' })
    expect(sanitizeFeedback({ kind: 'bug', message: ' ' })).toEqual({ error: 'message' })
    expect(sanitizeFeedback({ kind: 'bug', message: 'no anda', email: 'x@' })).toEqual({
      error: 'email',
    })
  })

  it('takes a one-tap vote without a message, and only yes/no', () => {
    const ok = sanitizeFeedback({ kind: 'helpful', helpful: 'no', path: '/dolar-hoy' })
    expect('record' in ok && ok.record.helpful).toBe('no')
    expect(sanitizeFeedback({ kind: 'helpful', helpful: 'maybe' })).toEqual({ error: 'helpful' })
  })

  it('keeps technical data only for a bug whose box was checked, field by field', () => {
    const tech = {
      viewport: '412x900@2.63',
      screen: '412x915',
      theme: 'dark',
      language: 'es-UY',
      online: true,
      referrer: 'javascript:alert(1)',
    }
    const bug = sanitizeFeedback({
      kind: 'bug',
      message: 'Filtros no abre',
      includeTech: true,
      tech,
    })
    expect('record' in bug && bug.record.tech).toEqual({ ...tech, referrer: null })
    const unchecked = sanitizeFeedback({ kind: 'bug', message: 'x y z', includeTech: false, tech })
    expect('record' in unchecked && unchecked.record.tech).toBeNull()
    const suggestion = sanitizeFeedback({
      kind: 'suggestion',
      message: 'abc',
      includeTech: true,
      tech,
    })
    expect('record' in suggestion && suggestion.record.tech).toBeNull()
  })

  it('never stores an external or protocol-relative path', () => {
    const result = sanitizeFeedback({ kind: 'praise', message: 'genial', path: '//evil.com/x' })
    expect('record' in result && result.record.path).toBe('/')
  })

  it('strips control characters and caps the length', () => {
    const result = sanitizeFeedback({ kind: 'suggestion', message: `a\u0000b${'x'.repeat(3000)}` })
    expect('record' in result && result.record.message.startsWith('ab')).toBe(true)
    expect('record' in result && result.record.message.length).toBe(2000)
  })
})

describe('when the end-of-page question asks', () => {
  it('skips pages that own their question or are plumbing', () => {
    expect(helpfulAllowedForPath('/alquileres-uruguay')).toBe(false)
    expect(helpfulAllowedForPath('/alquileres/algo-123')).toBe(false)
    expect(helpfulAllowedForPath('/contacto')).toBe(false)
    expect(helpfulAllowedForPath('/en/contacto')).toBe(false)
    expect(helpfulAllowedForPath('/oportunidades-inmobiliarias-uruguay')).toBe(true)
  })

  it('does not ask again on the same page, nor anywhere right after an answer', () => {
    const memory = rememberAnswer(EMPTY_MEMORY, '/dolar-hoy', NOW)
    expect(shouldAskHelpful(memory, '/dolar-hoy', NOW + 30 * DAY)).toBe(false)
    expect(shouldAskHelpful(memory, '/pizarra', NOW + DAY)).toBe(false)
    expect(shouldAskHelpful(memory, '/pizarra', NOW + (ANSWERED_ANY_DAYS + 1) * DAY)).toBe(true)
    expect(shouldAskHelpful(memory, '/dolar-hoy', NOW + (ANSWERED_PATH_DAYS + 1) * DAY)).toBe(true)
  })

  it('treats a localized path as the same page', () => {
    const memory = rememberAnswer(EMPTY_MEMORY, '/en/dolar-hoy', NOW)
    expect(shouldAskHelpful(memory, '/dolar-hoy', NOW + 10 * DAY)).toBe(false)
  })

  it('reads garbage from storage as an empty memory', () => {
    expect(parseMemory('{not json')).toEqual(EMPTY_MEMORY)
    expect(parseMemory(JSON.stringify({ answered: { '/a': 'x', '/b': 5 } })).answered).toEqual({
      '/b': 5,
    })
  })
})

describe('the review ask', () => {
  it('goes to every answer, never gated on the answer being positive', () => {
    for (const trigger of ['yes', 'no', 'suggestion', 'bug', 'praise'] as const)
      expect(reviewAskFor(EMPTY_MEMORY, trigger, NOW)).not.toBe('none')
    expect(reviewAskFor(EMPTY_MEMORY, 'yes', NOW)).toBe('lead')
    expect(reviewAskFor(EMPTY_MEMORY, 'no', NOW)).toBe('quiet')
  })

  it('stays away after the person reviewed or said "Ahora no"', () => {
    const opened = { ...EMPTY_MEMORY, reviewOpenedAt: NOW }
    expect(reviewAskFor(opened, 'yes', NOW + 100 * DAY)).toBe('none')
    const dismissed = { ...EMPTY_MEMORY, reviewDismissedAt: NOW }
    expect(reviewAskFor(dismissed, 'yes', NOW + DAY)).toBe('none')
    expect(reviewAskFor(dismissed, 'yes', NOW + (REVIEW_DISMISS_DAYS + 1) * DAY)).toBe('lead')
  })
})

describe('the email to the owner', () => {
  it('escapes the message and keeps the subject on one line', () => {
    const result = sanitizeFeedback({
      kind: 'bug',
      message: '<img src=x onerror=alert(1)>\nsegunda línea',
      email: 'a@b.com',
      path: '/pizarra',
    })
    if (!('record' in result)) throw new Error('expected a record')
    const mail = feedbackEmail(result.record, { siteUrl: 'https://cambio-uruguay.com/' })
    expect(mail.html).not.toContain('<img')
    expect(mail.html).toContain('&lt;img')
    expect(mail.subject).not.toMatch(/[\r\n]/)
    expect(mail.text).toContain('https://cambio-uruguay.com/pizarra')
    expect(needsAttention(result.record)).toBe(true)
  })

  it('does not email a bare vote', () => {
    expect(needsAttention({ message: '' })).toBe(false)
  })
})

describe('the copy', () => {
  it('has the same keys in es, en and pt', () => {
    const keys = (node: unknown, prefix = ''): string[] =>
      Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
        typeof value === 'string' ? [`${prefix}${key}`] : keys(value, `${prefix}${key}.`)
      )
    const es = keys(siteFeedbackMessages.es).sort()
    expect(keys(siteFeedbackMessages.en).sort()).toEqual(es)
    expect(keys(siteFeedbackMessages.pt).sort()).toEqual(es)
  })

  it('never writes a literal @ or | (vue-i18n linked messages and plurals)', () => {
    const all = JSON.stringify(siteFeedbackMessages)
    expect(all).not.toContain('@')
    expect(all).not.toContain('|')
  })

  it('keeps the owner address out of the public repo: the server reads it from the env', () => {
    const route = readFileSync(resolve(__dirname, '../../server/api/site-feedback.post.ts'), 'utf8')
    expect(route).toContain('config.feedback')
    expect(route).not.toMatch(/@gmail\.com/)
  })
})
