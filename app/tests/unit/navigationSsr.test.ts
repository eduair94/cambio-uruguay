import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import { compile } from '@vue/compiler-ssr'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME_MODE } from '../../utils/theme'

const require = createRequire(import.meta.url)
// The CSS-free distribution is the installed Vuetify version. Render its real
// fragment (nav + scrim), whose layout width is normally missing during SSR.
const { createVuetify, components } = require('vuetify/dist/vuetify.js')
const filename = resolve(__dirname, '../../layouts/default.vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const drawerTag = descriptor.template!.content.match(/<VNavigationDrawer\b[\s\S]*?>/)![0]
const { code } = compile(
  `<VApp>${drawerTag}<div style="width:500px">Navigation content</div></VNavigationDrawer></VApp>`
)
const ssrRender = runInNewContext(`(function (require) { ${code} })`)(require)

async function renderNavigation(drawer: boolean, navigationReady = false) {
  const app = createSSRApp({
    components: { VApp: components.VApp, VNavigationDrawer: components.VNavigationDrawer },
    data: () => ({ drawer, navigationReady }),
    ssrRender,
  })
  app.config.globalProperties.$t = (key: string) => key
  app.use(createVuetify({ theme: { defaultTheme: DEFAULT_THEME_MODE } }))
  const html = await renderToString(app)
  const nav = html.match(/<nav\b[^>]*>/)![0]
  return { html, nav, style: nav.match(/style="([^"]*)"/)![1] }
}

describe('mobile navigation before hydration', () => {
  it('keeps the actual layout drawer hidden and sized in SSR without waiting for JS or CSS', async () => {
    const { html, nav, style } = await renderNavigation(false)
    expect(html).toContain('v-theme--light')
    expect(nav).toContain('inert')
    expect(style).toMatch(/(?:^|;)display:none(?:;|$)/)
    expect(style).toMatch(/(?:^|;)width:288px(?:;|$)/)
    expect(html).not.toContain('class="v-navigation-drawer__scrim')
  })

  it('leaves Vuetify free to expose the navigation and its scrim after an explicit opening', async () => {
    const { html, nav, style } = await renderNavigation(true)
    expect(nav).toContain('v-navigation-drawer--active')
    expect(nav).not.toContain(' inert')
    expect(style).not.toContain('display:none')
    expect(style).toContain('width:288px')
    expect(html).toContain('v-navigation-drawer__scrim')
  })

  it('releases display after hydration so a closed drawer can follow native edge swipes', async () => {
    const { nav, style } = await renderNavigation(false, true)
    expect(nav).toContain('inert')
    expect(style).not.toContain('display:none')
    expect(style).toContain('width:288px')
    expect(style).toContain('translateX(-289px)')
  })
})
