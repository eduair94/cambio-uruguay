import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createHead, renderSSRHead } from '@unhead/vue/server'
import ts from 'typescript'
import * as vue from 'vue'
import * as serverRenderer from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import * as ogCardText from '../../utils/ogCardText'

const {
  OG_DESCRIPTION_MAX,
  OG_IMAGE_ALT_FLOOR,
  clipAtWord,
  ogCardFooter,
  ogCardSubtitle,
  ogCardTitle,
  replaceFloorImageAlt,
} = ogCardText

const APP = resolve(__dirname, '../..')
const BOARD_DEFAULT = 'Compará +40 casas de cambio en tiempo real'
// The meta description of /alquiler/montevideo/pocitos on 2026-11-08 (154 characters).
const POCITOS =
  'Alquilar en Pocitos (Montevideo): apartamento de 2 dormitorios a $ 39.000 por mes de mediana, con gastos comunes y rango por dormitorio. Datos del 7 de noviembre de 2026.'

describe('ogCardTitle', () => {
  it('drops the brand the logo already prints', () => {
    expect(ogCardTitle('Alquiler en Pocitos, Montevideo: precios | Cambio Uruguay')).toBe(
      'Alquiler en Pocitos, Montevideo: precios'
    )
    expect(ogCardTitle('Audi A3 2018 usado: US$ 20.245 · Cambio Uruguay')).toBe(
      'Audi A3 2018 usado: US$ 20.245'
    )
    expect(ogCardTitle('Guía — Cambio Uruguay')).toBe('Guía')
    expect(ogCardTitle('Precio del aceite - cambio uruguay ')).toBe('Precio del aceite')
  })

  it('keeps a title that only starts with the brand or is the brand', () => {
    expect(ogCardTitle('Cambio Uruguay: cotización del dólar hoy en Uruguay')).toBe(
      'Cambio Uruguay: cotización del dólar hoy en Uruguay'
    )
    expect(ogCardTitle('Cambio Uruguay')).toBe('Cambio Uruguay')
    expect(ogCardTitle(undefined)).toBe('')
  })
})

describe('clipAtWord', () => {
  it('cuts at a word to 110 characters or fewer and adds an ellipsis', () => {
    const clipped = clipAtWord(POCITOS)
    expect(clipped.endsWith('…')).toBe(true)
    const head = clipped.slice(0, -1)
    expect(head.length).toBeLessThanOrEqual(OG_DESCRIPTION_MAX)
    expect(POCITOS.startsWith(head)).toBe(true)
    // The cut falls between words, and not after a dangling "y"/"de"/comma.
    expect(POCITOS[head.length]).toMatch(/[\s,]/)
    expect(head).not.toMatch(/(?:\s(?:y|de|con|por|a)|[,;:])$/)
    // "…, con gastos comunes" would end at character 112.
    expect(clipped).toBe(
      'Alquilar en Pocitos (Montevideo): apartamento de 2 dormitorios a $ 39.000 por mes de mediana, con gastos…'
    )
  })

  it('leaves short text alone and hard-cuts one endless word', () => {
    expect(clipAtWord('  Precios   pedidos.  ')).toBe('Precios pedidos.')
    expect(clipAtWord('x'.repeat(300))).toBe(`${'x'.repeat(OG_DESCRIPTION_MAX)}…`)
    expect(clipAtWord('')).toBe('')
  })
})

describe('ogCardSubtitle', () => {
  const card = (over: Partial<Parameters<typeof ogCardSubtitle>[0]>) =>
    ogCardSubtitle({ board: false, boardDefault: BOARD_DEFAULT, ...over })

  it("takes the page's description on a card without rates or a subtitle", () => {
    expect(card({ description: POCITOS })).toBe(clipAtWord(POCITOS))
    expect(card({ description: 'Mediana de 202 supermercados.' })).toBe(
      'Mediana de 202 supermercados.'
    )
  })

  it('keeps the localized exchange line on a rate card', () => {
    expect(card({ board: true, description: POCITOS })).toBe(BOARD_DEFAULT)
  })

  it('always prefers an explicit subtitle', () => {
    expect(card({ subtitle: 'Pocitos, Montevideo', description: POCITOS })).toBe(
      'Pocitos, Montevideo'
    )
    expect(card({ board: true, subtitle: 'Hoy en el BROU' })).toBe('Hoy en el BROU')
  })

  it('prints nothing rather than the exchange line or the title twice', () => {
    expect(card({})).toBe('')
    expect(card({ title: 'Alquileres en Uruguay', description: 'Alquileres en Uruguay.' })).toBe('')
  })
})

describe('ogCardFooter', () => {
  it('signs rate cards with the exchange line and the rest with the domain', () => {
    expect(ogCardFooter('', true)).toBe('exchange')
    expect(ogCardFooter(undefined, false)).toBe('site')
    expect(ogCardFooter('exchange', false)).toBe('exchange')
    expect(ogCardFooter('site', true)).toBe('site')
    expect(ogCardFooter('anything', false)).toBe('site')
  })
})

describe('replaceFloorImageAlt', () => {
  const meta = (key: string, content: string) => ({
    tag: 'meta',
    props: key.startsWith('og:') ? { property: key, content } : { name: key, content },
  })
  const alts = (tags: { tag: string; props: Record<string, unknown> }[]) =>
    tags
      .filter(tag => String(tag.props.property ?? tag.props.name).endsWith('image:alt'))
      .map(tag => tag.props.content)

  it('swaps only the exact floor sentence for og:title', () => {
    const tags = [
      meta('og:title', 'Cómo alquilar sin garantía en Uruguay'),
      meta('og:image:alt', OG_IMAGE_ALT_FLOOR),
      meta('twitter:image:alt', OG_IMAGE_ALT_FLOOR),
    ]
    expect(alts(replaceFloorImageAlt(tags))).toEqual([
      'Cómo alquilar sin garantía en Uruguay',
      'Cómo alquilar sin garantía en Uruguay',
    ])
  })

  it("leaves a page's own alt untouched", () => {
    const tags = [
      meta('og:title', 'BROU Dólar hoy'),
      meta('og:image:alt', 'BROU Dólar hoy: cotización y evolución'),
      meta('twitter:image:alt', `${OG_IMAGE_ALT_FLOOR}.`),
    ]
    expect(alts(replaceFloorImageAlt(tags))).toEqual([
      'BROU Dólar hoy: cotización y evolución',
      `${OG_IMAGE_ALT_FLOOR}.`,
    ])
  })

  it('falls back to twitter:title, then to <title> without the brand, else keeps the floor', () => {
    expect(
      alts(
        replaceFloorImageAlt([
          meta('twitter:title', 'Precio del aceite'),
          meta('og:image:alt', OG_IMAGE_ALT_FLOOR),
        ])
      )
    ).toEqual(['Precio del aceite'])
    expect(
      alts(
        replaceFloorImageAlt([
          { tag: 'title', textContent: 'Celulares en Uruguay | Cambio Uruguay', props: {} },
          meta('og:image:alt', OG_IMAGE_ALT_FLOOR),
        ])
      )
    ).toEqual(['Celulares en Uruguay'])
    expect(alts(replaceFloorImageAlt([meta('og:image:alt', OG_IMAGE_ALT_FLOOR)]))).toEqual([
      OG_IMAGE_ALT_FLOOR,
    ])
  })

  it('works on the tags the installed unhead resolves, page alts included', async () => {
    const render = async (page: Record<string, string>[]) => {
      const head = createHead()
      head.hooks.hook('tags:resolve', ctx => {
        replaceFloorImageAlt(ctx.tags)
      })
      // app.vue's floor first, then the page, as Nuxt pushes them.
      head.push({
        meta: [
          { property: 'og:image:alt', content: OG_IMAGE_ALT_FLOOR },
          { name: 'twitter:image:alt', content: OG_IMAGE_ALT_FLOOR },
        ],
      })
      head.push({ meta: page })
      return (await renderSSRHead(head)).headTags
    }
    const guide = await render([
      { property: 'og:title', content: 'Cómo alquilar sin garantía en Uruguay' },
    ])
    expect(guide).toContain(
      'property="og:image:alt" content="Cómo alquilar sin garantía en Uruguay"'
    )
    expect(guide).toContain(
      'name="twitter:image:alt" content="Cómo alquilar sin garantía en Uruguay"'
    )
    expect(guide).not.toContain(OG_IMAGE_ALT_FLOOR)
    const own = await render([
      { property: 'og:title', content: 'BROU Dólar hoy' },
      { property: 'og:image:alt', content: 'BROU Dólar hoy: cotización y evolución' },
    ])
    expect(own).toContain(
      'property="og:image:alt" content="BROU Dólar hoy: cotización y evolución"'
    )
    expect(own).toContain('name="twitter:image:alt" content="BROU Dólar hoy"')
  })
})

describe('og:image:alt wiring', () => {
  it('runs as a tags:resolve hook registered before auto-translate', () => {
    const plugin = readFileSync(resolve(APP, 'plugins/01.og-image-alt.ts'), 'utf8')
    expect(plugin).toMatch(/hooks\.hook\('tags:resolve'[\s\S]*replaceFloorImageAlt\(ctx\.tags\)/)
    expect(plugin).not.toMatch(/import\.meta\.(?:server|client)/)
    const order = readdirSync(resolve(APP, 'plugins')).sort()
    expect(order.indexOf('01.og-image-alt.ts')).toBeLessThan(order.indexOf('auto-translate.ts'))
  })

  it('app.vue sets the floor from the same constant the plugin compares against', () => {
    const app = readFileSync(resolve(APP, 'app.vue'), 'utf8')
    expect(app).toContain("import { OG_IMAGE_ALT_FLOOR } from '~/utils/ogCardText'")
    expect(app).toMatch(/ogImageAlt: OG_IMAGE_ALT_FLOOR,\s*twitterImageAlt: OG_IMAGE_ALT_FLOOR/)
    expect(app).not.toContain(OG_IMAGE_ALT_FLOOR)
  })
})

/** components/OgImage/Cambio.vue rendered by Vue's own SSR: the same template satori draws. */
async function renderCard(props: Record<string, unknown>): Promise<string> {
  const filename = resolve(APP, 'components/OgImage/Cambio.vue')
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const { content } = compileScript(descriptor, {
    id: 'og-card-test',
    inlineTemplate: true,
    templateOptions: { ssr: true },
  })
  const { outputText } = ts.transpileModule(content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const modules: Record<string, unknown> = {
    vue,
    'vue/server-renderer': serverRenderer,
    '~/utils/ogCardText': ogCardText,
  }
  const exports = {} as { default: vue.Component }
  new Function('exports', 'require', outputText)(exports, (name: string) => {
    if (name in modules) return modules[name]
    throw new Error(`Unexpected module ${name}`)
  })
  const app = vue.createSSRApp({ render: () => vue.h(exports.default, props) })
  return (await serverRenderer.renderToString(app)).replace(/<!--[\s\S]*?-->/g, '')
}

describe('Cambio.vue', () => {
  it("prints a default card's own title and description, signed with the domain only", async () => {
    // What app.vue's bare card receives on /alquiler/montevideo/pocitos.
    const html = await renderCard({
      title: 'Alquiler en Pocitos, Montevideo: precios | Cambio Uruguay',
      description: POCITOS,
    })
    expect(html).toContain('>Alquiler en Pocitos, Montevideo: precios<')
    expect(html).toContain(`>${clipAtWord(POCITOS)}<`)
    expect(html).toContain('>cambio-uruguay.com<')
    expect(html).not.toContain('| Cambio Uruguay')
    expect(html).not.toContain('casas de cambio')
    expect(html).not.toContain('actualizado cada 10 min')
  })

  it('keeps the exchange subtitle and footer on the rate board', async () => {
    const html = await renderCard({
      title: 'Dólar hoy en Uruguay: desde $40,88',
      description: 'Cotización del dólar hoy en Uruguay en más de 40 casas de cambio.',
      rateBuy: 40.12,
      rateSell: 40.88,
    })
    expect(html).toContain(`>${BOARD_DEFAULT}<`)
    expect(html).toContain('>+40 casas de cambio<')
    expect(html).toContain('>actualizado cada 10 min<')
    expect(html).toContain('>40,88<')
  })

  it('lets an exchange page without rates ask for the exchange footer', async () => {
    const html = await renderCard({ title: 'Casas de cambio', tag: 'CASAS', footer: 'exchange' })
    expect(html).toContain('>+40 casas de cambio<')
    expect(html).toContain('>actualizado cada 10 min<')
  })

  it('gives an explicit subtitle priority over the description, in every locale', async () => {
    const html = await renderCard({
      title: 'Rentals in Uruguay',
      subtitle: 'Compare portals, costs and conditions.',
      description: 'Ignored.',
      tag: 'ALQUILERES',
      locale: 'en',
    })
    expect(html).toContain('>Compare portals, costs and conditions.<')
    expect(html).not.toContain('Ignored.')
    expect(html).not.toContain('exchange houses')
  })
})
