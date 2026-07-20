import { describe, expect, it } from 'vitest'
import {
  MAILTO_MAX_BODY,
  bodyTooLongForMailto,
  encodeMailto,
  facebookShare,
  redditSubmit,
  telegramShare,
  whatsappShare,
} from '../../utils/messageChannels'

describe('encodeMailto', () => {
  it('keeps the address raw and encodes subject + body', () => {
    const url = encodeMailto({
      to: 'info@aduanas.gub.uy',
      subject: 'Reclamo — guía RJ1',
      body: 'Hola & chau',
    })
    expect(url.startsWith('mailto:info@aduanas.gub.uy?')).toBe(true)
    expect(url).toContain('subject=Reclamo%20%E2%80%94%20gu%C3%ADa%20RJ1')
    expect(url).toContain('body=Hola%20%26%20chau')
  })

  it('omits an over-long body so the URL never breaks the mail client', () => {
    const body = 'x'.repeat(MAILTO_MAX_BODY + 1)
    const url = encodeMailto({ to: 'a@b.com', subject: 'S', body })
    expect(url).toContain('subject=S')
    expect(url).not.toContain('body=')
  })

  it('inlines an ASCII body exactly at the encoded ceiling', () => {
    const body = 'y'.repeat(MAILTO_MAX_BODY) // ASCII → encoded length == raw length
    expect(encodeMailto({ to: 'a@b.com', body })).toContain('body=')
  })

  it('drops an accented body whose ENCODED length blows the ceiling even though raw fits', () => {
    // 700 'á' = 700 raw chars (well under 1800) but 700×'%C3%A1' = 4200 encoded chars.
    const body = 'á'.repeat(700)
    expect(body.length).toBeLessThan(MAILTO_MAX_BODY)
    const url = encodeMailto({ to: 'a@b.com', subject: 'S', body })
    expect(url).not.toContain('body=')
  })

  it('supports a user-supplied (empty) recipient — seller/bank the reader fills in', () => {
    const url = encodeMailto({ to: '', subject: 'Reclamo' })
    expect(url).toBe('mailto:?subject=Reclamo')
  })

  it('adds cc when given', () => {
    expect(encodeMailto({ to: 'a@b.com', cc: 'c@d.com' })).toContain('cc=c%40d.com')
  })
})

describe('bodyTooLongForMailto', () => {
  it('flags bodies over the ceiling', () => {
    expect(bodyTooLongForMailto('x'.repeat(MAILTO_MAX_BODY))).toBe(false)
    expect(bodyTooLongForMailto('x'.repeat(MAILTO_MAX_BODY + 1))).toBe(true)
    expect(bodyTooLongForMailto('')).toBe(false)
  })
})

describe('text-share builders', () => {
  it('whatsapp packs the text into wa.me', () => {
    expect(whatsappShare('Busco alquiler & garantía')).toBe(
      'https://wa.me/?text=Busco%20alquiler%20%26%20garant%C3%ADa'
    )
  })

  it('telegram carries text and an optional url', () => {
    expect(telegramShare('hola', 'https://x.uy')).toBe(
      'https://t.me/share/url?url=https%3A%2F%2Fx.uy&text=hola'
    )
    expect(telegramShare('hola')).toBe('https://t.me/share/url?url=&text=hola')
  })

  it('facebook shares a page url (groups cannot be prefilled)', () => {
    expect(facebookShare('https://cambio-uruguay.com/x')).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fcambio-uruguay.com%2Fx'
    )
  })

  it('reddit submit prefills subreddit, title and self-text', () => {
    expect(redditSubmit('uruguay', 'Busco alquiler', 'Hola, busco…')).toBe(
      'https://www.reddit.com/r/uruguay/submit?title=Busco%20alquiler&text=Hola%2C%20busco%E2%80%A6'
    )
  })
})
