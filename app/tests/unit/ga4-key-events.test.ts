// GA4 "key events" (conversions) are configured in the GA4 UI against literal
// event-name strings. A rename here silently zeroes a conversion report weeks
// later, with no test failure and no runtime error — so the names are pinned.
//
// This is a source-level contract, not a behavioural test: it asserts the call
// sites exist with the agreed names and payload keys. It does NOT prove gtag
// fired (that needs a browser + consent) — the e2e/manual check is GA4 DebugView.
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
// The list itself lives in utils/siteAnalytics.ts, because /estadisticas-del-sitio also needs it
// (it marks which of the reported GA4 events are ours). One list, two readers.
import { KEY_EVENTS } from '../../utils/siteAnalytics'

const read = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8')

describe('GA4 key events', () => {
  const sources: Record<(typeof KEY_EVENTS)[number], string> = {
    outbound_click: read('plugins/track-clicks.client.ts'),
    alert_created: read('components/account/AlertsPanel.vue'),
    newsletter_signup: read('components/NewsletterSignup.vue'),
    where_to_change: read('components/WhereToChange.vue'),
    convert: read('pages/index.vue'),
  }

  it.each(KEY_EVENTS)('%s is still emitted from its call site', event => {
    expect(sources[event]).toContain(`'${event}'`)
  })

  it('internal interaction metadata does not reuse traffic-source or campaign fields', () => {
    const collisions: string[] = []
    const scan = (dir: string) => {
      for (const entry of readdirSync(resolve(__dirname, '../../', dir), { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`
        if (entry.isDirectory()) {
          scan(path)
          continue
        }
        if (!/\.(?:ts|vue)$/.test(entry.name)) continue
        const text = read(path)
        const code = path.endsWith('.vue')
          ? (() => {
              const { descriptor } = parse(text)
              return [descriptor.script?.content, descriptor.scriptSetup?.content].join('\n')
            })()
          : text
        const ast = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
        const visit = (node: ts.Node) => {
          if (ts.isCallExpression(node)) {
            const name = ts.isPropertyAccessExpression(node.expression)
              ? node.expression.name.getText(ast)
              : node.expression.getText(ast)
            const isAnalytics =
              name === 'track' ||
              (name === 'send' && path === 'plugins/track-clicks.client.ts') ||
              (name === 'gtag' && node.arguments[0]?.getText(ast) === "'event'")
            const params = node.arguments[name === 'gtag' ? 2 : 1]
            if (isAnalytics && params && ts.isObjectLiteralExpression(params)) {
              for (const property of params.properties) {
                if (!property.name) continue
                const key = property.name.getText(ast).replace(/^['"]|['"]$/g, '')
                if (/^(?:source|medium|campaign(?:_.*)?)$/.test(key))
                  collisions.push(`${path}: ${key}`)
              }
            }
          }
          ts.forEachChild(node, visit)
        }
        visit(ast)
      }
    }
    for (const dir of ['components', 'composables', 'layouts', 'pages', 'plugins', 'utils'])
      scan(dir)
    expect(collisions).toEqual([])
  })

  it('alert_created carries the alert shape, not a casa', () => {
    const src = sources.alert_created
    const call = src.slice(src.indexOf("track('alert_created'"))
    for (const key of ['currency', 'kind', 'op', 'target']) {
      expect(call.slice(0, 300)).toContain(key)
    }
    // An alert watches the best rate across every casa, so there is no origin.
    expect(call.slice(0, 300)).not.toContain('origin')
  })

  it('conversions are only emitted after their request resolves', () => {
    // Guards against moving the track() call above the await, which would count
    // failed submissions as conversions.
    const alerts = sources.alert_created
    const postIdx = alerts.indexOf("authFetch('/api/me/alerts'")
    const trackIdx = alerts.indexOf("track('alert_created'")
    expect(postIdx).toBeGreaterThan(-1)
    expect(trackIdx).toBeGreaterThan(postIdx)

    const news = sources.newsletter_signup
    const subIdx = news.indexOf("$fetch('/api/newsletter/subscribe'")
    const newsTrackIdx = news.indexOf("track('newsletter_signup'")
    expect(subIdx).toBeGreaterThan(-1)
    expect(newsTrackIdx).toBeGreaterThan(subIdx)
  })
})
