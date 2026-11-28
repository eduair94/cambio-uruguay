import { describe, expect, it } from 'vitest'
import { guideSlugs } from '../../utils/guides'
import {
  TOPIC_IDS,
  TOPIC_PATH,
  buildTopicConfirmEmail,
  buildTopicNoticeEmail,
  isTopic,
  topicState,
  topicStateToNotify,
} from '../../server/utils/topics'

describe('avisos por tema', () => {
  it('sólo acepta los temas de la lista', () => {
    expect(isTopic('aumento-jubilaciones-2027')).toBe(true)
    expect(isTopic('newsletter')).toBe(false)
    expect(isTopic(undefined)).toBe(false)
  })

  it('cada tema apunta a una guía que existe', () => {
    for (const topic of TOPIC_IDS) {
      expect(TOPIC_PATH[topic]).toMatch(/^\/guias\//)
      expect(guideSlugs()).toContain(TOPIC_PATH[topic].replace('/guias/', ''))
    }
  })

  it('el estado sale del catálogo de la guía', () => {
    const base = { pct: null, provisorioPct: null, norma: null, fecha: null, url: null }
    expect(topicState('aumento-jubilaciones-2027', base)).toBe('pendiente')
    expect(topicState('aumento-jubilaciones-2027', { ...base, provisorioPct: 5.5 })).toBe(
      'provisorio'
    )
    expect(topicState('aumento-jubilaciones-2027', { ...base, provisorioPct: 5.5, pct: 5.8 })).toBe(
      'definitivo'
    )
  })

  it('avisa el estado actual una sola vez, y nunca el pendiente', () => {
    expect(topicStateToNotify('pendiente', [])).toBeNull()
    expect(topicStateToNotify('provisorio', [])).toBe('provisorio')
    expect(topicStateToNotify('provisorio', ['provisorio'])).toBeNull()
    expect(topicStateToNotify('definitivo', ['provisorio'])).toBe('definitivo')
    // Si el provisorio nunca salió por correo y ya hay definitivo, va sólo el definitivo.
    expect(topicStateToNotify('definitivo', [])).toBe('definitivo')
  })

  it('el correo de confirmación lleva el enlace y no promete el newsletter', () => {
    const mail = buildTopicConfirmEmail(
      'aumento-jubilaciones-2027',
      'es',
      'https://cambio-uruguay.com/api/topics/confirm?token=abc&x="<b>'
    )
    expect(mail.text).toContain('/api/topics/confirm?token=abc')
    expect(mail.text).toContain('No te suscribe al newsletter')
    expect(mail.html).not.toContain('"<b>')
    expect(mail.html).toContain('&quot;&lt;b&gt;')
  })

  it('el aviso trae la cifra del estado, la página y la baja', () => {
    const data = { pct: 5.8, provisorioPct: 5.5, norma: null, fecha: null, url: null }
    const def = buildTopicNoticeEmail(
      'aumento-jubilaciones-2027',
      'definitivo',
      'es',
      'https://cambio-uruguay.com/guias/aumento-de-jubilaciones-uruguay',
      'https://cambio-uruguay.com/api/topics/unsubscribe?token=u1',
      data
    )
    expect(def.subject).toContain('5,8')
    expect(def.text).toContain('/api/topics/unsubscribe?token=u1')
    const prov = buildTopicNoticeEmail(
      'aumento-jubilaciones-2027',
      'provisorio',
      'pt',
      'https://cambio-uruguay.com/pt/guias/aumento-de-jubilaciones-uruguay',
      'https://cambio-uruguay.com/api/topics/unsubscribe?token=u2',
      data
    )
    expect(prov.subject).toContain('5,5')
    expect(prov.subject).toMatch(/provisório/)
  })
})
