import { describe, expect, it } from 'vitest'

import { tweetLength } from '../../utils/xPosts'
import { VIDEO_TOPIC_PAGES, videoTopicSlugs } from '../../utils/videoTopics'
import {
  VIDEO_TWEET_TOPIC,
  VIDEO_TWEETS_PER_DAY,
  cleanVideoTitle,
  renderVideosFeed,
  scheduleVideoTweets,
  videoFeedCacheControl,
  videoIsTweetable,
  videoTweet,
  type TweetableVideo,
} from '../../utils/videoPosts'
import { aiTellsIn } from './helpers/socialCopy'

/** Montevideo (UTC-3) a instante: `mvd('2026-11-13', '13:00')`. */
const mvd = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00-03:00`)

let seq = 0
function video(over: Partial<TweetableVideo> = {}): TweetableVideo {
  seq += 1
  return {
    videoId: `vid${String(seq).padStart(8, '0')}`,
    title: '¿Dónde invertir tus pesos en Uruguay?',
    publishedAt: mvd('2026-11-13', '13:00').toISOString(),
    channelKey: `canal-${seq}`,
    channelName: `Canal ${seq}`,
    channelCountry: 'UY',
    topics: ['inversiones-y-bolsa'],
    money: 'money',
    ...over,
  }
}

const ats = (videos: TweetableVideo[], now: Date) =>
  scheduleVideoTweets(videos, now).released.map(s => [s.video.videoId, s.at.toISOString()])

describe('qué video se tuitea', () => {
  it('canal uruguayo, de plata y con tema', () => {
    expect(videoIsTweetable(video())).toBe(true)
    expect(videoIsTweetable(video({ channelCountry: 'AR' }))).toBe(false)
    expect(videoIsTweetable(video({ channelCountry: 'REGIONAL' }))).toBe(false)
    expect(videoIsTweetable(video({ money: 'maybe' }))).toBe(false)
    expect(videoIsTweetable(video({ topics: [] }))).toBe(false)
  })

  it('no los programas diarios que llevan la fecha completa en el título', () => {
    const daily = [
      'Hoy en el Diario Oficial • 13 de noviembre 2026',
      'Entrevista en Informativo Sarandí | 20260717',
      'Resumen 13/11/2026',
    ]
    for (const title of daily) expect(videoIsTweetable(video({ title })), title).toBe(false)
    // Un día sin año es contenido, no un programa: "antes del 26 de Octubre".
    expect(videoIsTweetable(video({ title: 'URGENTE: Hacé esto antes del 26 de Octubre' }))).toBe(
      true
    )
  })

  it('el título sin hashtags (en X serían nuestros) ni separadores colgando', () => {
    expect(cleanVideoTitle('LA INFLACIÓN DE OCTUBRE ARROJÓ UN 2,2% | #GASULLA1079')).toBe(
      'LA INFLACIÓN DE OCTUBRE ARROJÓ UN 2,2%'
    )
    expect(cleanVideoTitle('#shorts  Dólar   hoy #uruguay')).toBe('Dólar hoy')
    expect(cleanVideoTitle('Solaria, la DGI y Farmashop en bolsa | Neuronas News')).toBe(
      'Solaria, la DGI y Farmashop en bolsa | Neuronas News'
    )
  })
})

describe('cuándo sale cada tuit', () => {
  it('90 minutos después de publicado', () => {
    const v = video({ publishedAt: mvd('2026-11-13', '13:00').toISOString() })
    expect(ats([v], mvd('2026-11-13', '14:29'))).toEqual([])
    expect(ats([v], mvd('2026-11-13', '14:30'))).toEqual([
      [v.videoId, mvd('2026-11-13', '14:30').toISOString()],
    ])
  })

  it('lo de la noche espera a las 8:30', () => {
    const late = video({ publishedAt: mvd('2026-11-13', '22:00').toISOString() })
    const early = video({ publishedAt: mvd('2026-11-14', '03:00').toISOString() })
    const plan = scheduleVideoTweets([late, early], mvd('2026-11-14', '12:00'))
    expect(plan.released.map(s => s.at.toISOString()).sort()).toEqual([
      mvd('2026-11-14', '08:30').toISOString(),
      mvd('2026-11-14', '09:30').toISOString(),
    ])
    // El de las 22 se publicó primero: sale primero.
    expect(plan.released.find(s => s.video === late)!.at).toEqual(mvd('2026-11-14', '08:30'))
  })

  it('una hora entre uno y otro, y nada después de las 23', () => {
    const a = video({ publishedAt: mvd('2026-11-13', '13:00').toISOString() })
    const b = video({ publishedAt: mvd('2026-11-13', '13:10').toISOString() })
    expect(ats([a, b], mvd('2026-11-13', '18:00'))).toEqual([
      [b.videoId, mvd('2026-11-13', '15:30').toISOString()],
      [a.videoId, mvd('2026-11-13', '14:30').toISOString()],
    ])
    const c = video({ publishedAt: mvd('2026-11-13', '20:30').toISOString() })
    const d = video({ publishedAt: mvd('2026-11-13', '20:40').toISOString() })
    const plan = scheduleVideoTweets([c, d], mvd('2026-11-14', '12:00'))
    // d saldría a las 23:00: se cae, no pasa a la mañana (cada día se calcula solo).
    expect(plan.released.map(s => s.video.videoId)).toEqual([c.videoId])
  })

  it('uno por canal y como mucho cuatro por día', () => {
    const same = [
      video({ channelKey: 'botija', publishedAt: mvd('2026-11-13', '10:00').toISOString() }),
      video({ channelKey: 'botija', publishedAt: mvd('2026-11-13', '11:00').toISOString() }),
    ]
    expect(scheduleVideoTweets(same, mvd('2026-11-13', '22:00')).released).toHaveLength(1)

    const many = Array.from({ length: 7 }, (_, i) =>
      video({
        publishedAt: mvd('2026-11-13', `${String(9 + i).padStart(2, '0')}:00`).toISOString(),
      })
    )
    expect(scheduleVideoTweets(many, mvd('2026-11-13', '22:59')).released).toHaveLength(
      VIDEO_TWEETS_PER_DAY
    )
  })

  it('no tuitea lo que no es relacionado ni lo de hace días', () => {
    const plan = scheduleVideoTweets(
      [
        video({ channelCountry: 'ES' }),
        video({ publishedAt: mvd('2026-11-01', '13:00').toISOString() }),
      ],
      mvd('2026-11-13', '20:00')
    )
    expect(plan.released).toEqual([])
  })

  it('lo ya publicado no se mueve cuando llega otro video, ni al pasar los días', () => {
    const a = video({ publishedAt: mvd('2026-11-13', '13:00').toISOString() })
    const b = video({ publishedAt: mvd('2026-11-13', '16:00').toISOString() })
    const before = scheduleVideoTweets([a], mvd('2026-11-13', '15:00')).released[0]!.at
    const after = scheduleVideoTweets([a, b], mvd('2026-11-13', '20:00')).released
    expect(after.find(s => s.video === a)!.at).toEqual(before)
    const nextDay = scheduleVideoTweets([a, b], mvd('2026-11-14', '20:00')).released
    expect(nextDay.find(s => s.video === a)!.at).toEqual(before)
  })

  it('avisa el próximo programado para la caché', () => {
    const v = video({ publishedAt: mvd('2026-11-13', '13:00').toISOString() })
    const plan = scheduleVideoTweets([v], mvd('2026-11-13', '14:00'))
    expect(plan.nextAt).toEqual(mvd('2026-11-13', '14:30'))
    expect(videoFeedCacheControl(mvd('2026-11-13', '14:00'), plan.nextAt)).toContain('s-maxage=900')
    expect(videoFeedCacheControl(mvd('2026-11-13', '14:28'), plan.nextAt)).toContain('s-maxage=120')
    expect(videoFeedCacheControl(mvd('2026-11-13', '14:00'), null)).toContain('s-maxage=900')
    // Ya vencido (llegó tarde a la lectura): el mínimo, no un número negativo.
    expect(videoFeedCacheControl(mvd('2026-11-13', '15:00'), plan.nextAt)).toContain('s-maxage=60')
  })
})

describe('el tuit', () => {
  it('cada tema del sitio tiene su frase', () => {
    for (const slug of videoTopicSlugs()) expect(VIDEO_TWEET_TOPIC[slug], slug).toBeTruthy()
    expect(Object.keys(VIDEO_TWEET_TOPIC).sort()).toEqual(VIDEO_TOPIC_PAGES.map(t => t.slug).sort())
  })

  it('las redacciones no suenan a texto generado', () => {
    for (let i = 0; i < 30; i++) {
      const v = video({ title: 'Título', channelName: 'Canal' })
      expect(aiTellsIn(videoTweet(v).text), v.videoId).toEqual([])
    }
  })

  it('enlaza a la página del tema, a la tarjeta del video', () => {
    const v = video({ videoId: 'E2LoOykmTb0', topics: ['criptomonedas-y-bitcoin'] })
    expect(videoTweet(v).url).toBe(
      'https://cambio-uruguay.com/videos-de-economia-uruguay/criptomonedas-y-bitcoin#video-E2LoOykmTb0'
    )
    expect(videoTweet(video({ topics: ['tema-que-no-existe'] })).url).toBe(
      'https://cambio-uruguay.com/videos-de-economia-uruguay'
    )
  })

  it('entra en 280 aunque el título y el canal sean largos', () => {
    for (let i = 0; i < 30; i++) {
      const v = video({
        title:
          'Qué Está Pasando con la Economía Uruguaya: Combustibles, PIB, Inflación y Bonos (Noticias Setiembre) y algo más',
        channelName: 'Rodrigo Álvarez - Neurona Financiera y Finanzas Personales',
        topics: ['ahorro-y-finanzas-personales'],
      })
      const t = videoTweet(v)
      expect(tweetLength(t.message)).toBeLessThanOrEqual(280)
      expect(t.message).toContain('…')
    }
    const short = videoTweet(video({ title: 'Débito o crédito' }))
    expect(short.message).toContain('«Débito o crédito»')
  })
})

describe('el feed', () => {
  it('un ítem por video, con el id como guid', () => {
    const v = video({ videoId: 'abc_-123', title: 'Tasas & <bonos> | #x' })
    const plan = scheduleVideoTweets([v], mvd('2026-11-13', '20:00'))
    const xml = renderVideosFeed(plan.released, mvd('2026-11-13', '20:00'))
    expect(xml).toContain('<guid isPermaLink="false">cambio-uruguay-video-abc_-123</guid>')
    expect(xml).toContain('<title>Tasas &amp; &lt;bonos&gt;</title>')
    expect(xml).toContain(`<pubDate>${mvd('2026-11-13', '14:30').toUTCString()}</pubDate>`)
    expect(xml).toContain('<description><![CDATA[')
    expect(xml.match(/<item>/g)).toHaveLength(1)
    expect(renderVideosFeed([], new Date())).not.toContain('<item>')
  })
})
