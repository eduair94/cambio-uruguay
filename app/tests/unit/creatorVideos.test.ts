import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CREATORS,
  CREATOR_VIDEOS,
  HOME_CREATOR_FEATURE,
  channelUrl,
  creatorVideosFor,
  formatVideoDate,
  getCreator,
  getCreatorVideo,
  subscribeUrl,
  videoThumbnail,
  videoUrl,
} from '../../utils/creatorVideos'

const HERE = dirname(fileURLToPath(import.meta.url))
const PAGES_DIR = resolve(HERE, '../../pages')

function pageFile(route: string): string | undefined {
  const asFile = resolve(PAGES_DIR, `${route.slice(1)}.vue`)
  const asIndex = resolve(PAGES_DIR, route.slice(1), 'index.vue')
  if (existsSync(asFile)) return asFile
  if (existsSync(asIndex)) return asIndex
  return undefined
}

describe('creator videos catalogue', () => {
  it('has unique creators with a real channel id and handle', () => {
    const ids = CREATORS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of CREATORS) {
      expect(c.channelId, c.id).toMatch(/^UC[\w-]{22}$/)
      expect(c.handle, c.id).toMatch(/^@[\w.-]+$/)
      expect(c.blurb.trim().length).toBeGreaterThan(40)
      // La relación se dice en la página: un embed sin aclarar quién paga a quién no entra.
      expect(c.relationship.trim().length).toBeGreaterThan(40)
    }
  })

  it('only lists real YouTube ids, once each, with an ISO date and an existing creator', () => {
    const ids = CREATOR_VIDEOS.map(v => v.videoId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const v of CREATOR_VIDEOS) {
      expect(v.videoId).toMatch(/^[\w-]{11}$/)
      expect(v.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(getCreator(v.creatorId), `${v.videoId}: creador inexistente`).toBeDefined()
      expect(v.title.trim()).not.toBe('')
      expect(v.summary.trim().length).toBeGreaterThan(40)
    }
  })

  it('targets only pages that exist and that actually render the block', () => {
    // Tripwire doble: una ruta renombrada deja el video sin mostrarse en silencio, y una ruta
    // declarada sin el componente en la página también.
    for (const v of CREATOR_VIDEOS) {
      expect(v.pages.length, v.videoId).toBeGreaterThan(0)
      for (const page of v.pages) {
        expect(page.startsWith('/'), `${v.videoId}: "${page}" no es una ruta`).toBe(true)
        const file = pageFile(page)
        expect(file, `${v.videoId}: no existe la página ${page}`).toBeDefined()
        const source = readFileSync(file!, 'utf8')
        expect(source, `${page} no renderiza <CreatorVideos page="${page}">`).toMatch(
          new RegExp(`<CreatorVideos[\\s\\S]*?page="${page.replace(/\//g, '\\/')}"`)
        )
      }
    }
  })

  it('features on the home page videos that exist, starting with the one that mentions us', () => {
    expect(getCreator(HOME_CREATOR_FEATURE.creatorId)).toBeDefined()
    expect(HOME_CREATOR_FEATURE.videoIds.length).toBeGreaterThan(0)
    for (const id of HOME_CREATOR_FEATURE.videoIds) {
      const v = getCreatorVideo(id)
      expect(v, `${id} no está en CREATOR_VIDEOS`).toBeDefined()
      expect(v!.creatorId).toBe(HOME_CREATOR_FEATURE.creatorId)
    }
    expect(getCreatorVideo(HOME_CREATOR_FEATURE.videoIds[0]!)?.mentionsUs).toBe(true)

    const home = readFileSync(resolve(PAGES_DIR, 'index.vue'), 'utf8')
    expect(home).toContain('<HomeCreatorMention />')
  })

  it('filters by page, newest first', () => {
    const found = creatorVideosFor('/inversiones-uruguay')
    expect(found.length).toBeGreaterThan(1)
    const dates = found.map(v => v.publishedAt)
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates)
    expect(creatorVideosFor('/pagina-que-no-existe')).toEqual([])
  })

  it('builds YouTube URLs that keep the referrer useful to the creator', () => {
    const c = getCreator('javier-gutierrez-finanzas')!
    expect(channelUrl(c)).toBe('https://www.youtube.com/@JavierGutierrezFinanzas')
    expect(subscribeUrl(c)).toBe(
      'https://www.youtube.com/@JavierGutierrezFinanzas?sub_confirmation=1'
    )
    expect(videoUrl({ videoId: '3pr3cvroY6s' })).toBe('https://www.youtube.com/watch?v=3pr3cvroY6s')
    expect(videoThumbnail({ videoId: '3pr3cvroY6s' })).toBe(
      'https://i.ytimg.com/vi/3pr3cvroY6s/hqdefault.jpg'
    )
  })

  it('formats the date without drifting a day', () => {
    expect(formatVideoDate('2026-11-12')).toBe('12 de noviembre de 2026')
    expect(formatVideoDate('2026-11-12', 'en')).toBe('November 12, 2026')
    expect(formatVideoDate('no-es-fecha')).toBe('no-es-fecha')
  })
})

describe('creator links never strip the referrer', () => {
  // Con `noreferrer`, YouTube Analytics registra la visita como directa y el creador no se entera
  // de que vino de acá, que es justamente lo que queremos que vea.
  for (const name of ['CreatorVideos.vue', 'HomeCreatorMention.vue']) {
    it(name, () => {
      const source = readFileSync(resolve(HERE, '../../components', name), 'utf8')
      expect(source).toContain('rel="noopener"')
      expect(source).not.toMatch(/rel="[^"]*noreferrer/)
    })
  }
})
